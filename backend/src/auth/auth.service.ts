import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';

import { PrismaService } from '../prisma/prisma.service.js';
import { RegisterDto } from './dto/register.dto.js';
import { JwtService } from '@nestjs/jwt';
import { LoginDto } from './dto/login.dto.js';
import { randomUUID, randomInt } from 'node:crypto';
import { MailService } from '../mail/mail.service.js';
import { ResetPasswordDto } from './dto/reset-password.dto.js';

@Injectable()
export class AuthService {
  private readonly OTP_EXPIRY_MINUTES = 10;
  private readonly OTP_RESEND_COOLDOWN_MINUTES = 2;
  private readonly MAX_OTP_SENDS = 3;
  private readonly OTP_WINDOW_MINUTES = 10;
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly mailService: MailService,
  ) {}

  async getMe(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, name: true, role: true, avatarUrl: true, createdAt: true },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    return {
      userId: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      avatarUrl: user.avatarUrl,
      createdAt: user.createdAt,
    };
  }

  async updateProfile(userId: string, updateData: { name?: string }) {
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: {
        ...(updateData.name !== undefined && { name: updateData.name }),
      },
      select: { id: true, email: true, name: true, role: true, avatarUrl: true, createdAt: true },
    });

    return {
      userId: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      avatarUrl: user.avatarUrl,
      createdAt: user.createdAt,
    };
  }

  async updateAvatar(userId: string, file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('Avatar file is required');
    }

    const existingUser = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, avatarUrl: true },
    });

    if (!existingUser) {
      try {
        if (fs.existsSync(file.path)) {
          await fs.promises.unlink(file.path);
        }
      } catch (err) {
        console.error('Failed to cleanup orphan avatar file:', err);
      }
      throw new UnauthorizedException('User not found');
    }

    const oldAvatarUrl = existingUser.avatarUrl;
    const newAvatarUrl = `/uploads/avatars/${file.filename}`;

    try {
      const updatedUser = await this.prisma.user.update({
        where: { id: userId },
        data: { avatarUrl: newAvatarUrl },
        select: { id: true, email: true, name: true, role: true, avatarUrl: true, createdAt: true },
      });

      // DB update succeeded! Now safely delete the old avatar file if it exists
      if (oldAvatarUrl && oldAvatarUrl.startsWith('/uploads/avatars/')) {
        const oldFilename = path.basename(oldAvatarUrl);
        const oldFilePath = path.join(process.cwd(), 'uploads', 'avatars', oldFilename);
        try {
          if (fs.existsSync(oldFilePath)) {
            await fs.promises.unlink(oldFilePath);
          }
        } catch (cleanupErr) {
          console.warn('Failed to cleanup old avatar file safely:', cleanupErr);
        }
      }

      return {
        userId: updatedUser.id,
        email: updatedUser.email,
        name: updatedUser.name,
        role: updatedUser.role,
        avatarUrl: updatedUser.avatarUrl,
        createdAt: updatedUser.createdAt,
      };
    } catch (dbError) {
      try {
        if (fs.existsSync(file.path)) {
          await fs.promises.unlink(file.path);
        }
      } catch (err) {
        console.error('Failed to cleanup uploaded avatar file after DB error:', err);
      }
      throw dbError;
    }
  }

  async removeAvatar(userId: string) {
    const existingUser = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, avatarUrl: true },
    });

    if (!existingUser) {
      throw new UnauthorizedException('User not found');
    }

    const oldAvatarUrl = existingUser.avatarUrl;

    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: { avatarUrl: null },
      select: { id: true, email: true, name: true, role: true, avatarUrl: true, createdAt: true },
    });

    if (oldAvatarUrl && oldAvatarUrl.startsWith('/uploads/avatars/')) {
      const oldFilename = path.basename(oldAvatarUrl);
      const oldFilePath = path.join(process.cwd(), 'uploads', 'avatars', oldFilename);
      try {
        if (fs.existsSync(oldFilePath)) {
          await fs.promises.unlink(oldFilePath);
        }
      } catch (cleanupErr) {
        console.warn('Failed to delete avatar file during removal:', cleanupErr);
      }
    }

    return {
      userId: updatedUser.id,
      email: updatedUser.email,
      name: updatedUser.name,
      role: updatedUser.role,
      avatarUrl: updatedUser.avatarUrl,
      createdAt: updatedUser.createdAt,
    };
  }

  async login(loginDto: LoginDto) {
    const { email, password } = loginDto;

    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const passwordValid = await bcrypt.compare(password, user.password);

    if (!passwordValid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };

    const accessTokenSecret = this.configService.get<string>(
      'ACCESS_TOKEN_SECRET',
    );

    const refreshTokenSecret = this.configService.get<string>(
      'REFRESH_TOKEN_SECRET',
    );

    if (!accessTokenSecret || !refreshTokenSecret) {
      throw new Error('JWT secrets are not configured');
    }

    const accessToken = await this.jwtService.signAsync(payload, {
      secret: accessTokenSecret,
      expiresIn: '15m',
    });

    const sessionId = randomUUID();

    const refreshTokenPayload = {
      sub: user.id,
      sid: sessionId,
      role: user.role,
    };

    const refreshToken = await this.jwtService.signAsync(refreshTokenPayload, {
      secret: refreshTokenSecret,
      expiresIn: '7d',
    });

    const refreshTokenHash = await bcrypt.hash(refreshToken, 12);

    await this.prisma.refreshSession.create({
      data: {
        id: sessionId,
        userId: user.id,
        tokenHash: refreshTokenHash,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    return {
      accessToken,
      refreshToken,
    };
  }

  async register(registerDto: RegisterDto) {
    const { email, password, name } = registerDto;

    const existingUser = await this.prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      throw new ConflictException('Email already registered');
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const user = await this.prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
        role: 'CLIENT',
      },
    });

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      createdAt: user.createdAt,
    };
  }
  async logout(refreshToken: string) {
    const refreshTokenSecret = this.configService.get<string>(
      'REFRESH_TOKEN_SECRET',
    );

    if (!refreshTokenSecret) {
      throw new Error('JWT secret is not configured');
    }

    let payload: {
      sub: string;
      sid: string;
    };

    try {
      payload = await this.jwtService.verifyAsync(refreshToken, {
        secret: refreshTokenSecret,
      });
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const session = await this.prisma.refreshSession.findUnique({
      where: {
        id: payload.sid,
      },
    });

    if (!session) {
      throw new UnauthorizedException('Invalid refresh session');
    }

    if (session.revokedAt) {
      throw new UnauthorizedException('Session already revoked');
    }

    const tokenMatches = await bcrypt.compare(refreshToken, session.tokenHash);

    if (!tokenMatches) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    await this.prisma.refreshSession.update({
      where: {
        id: session.id,
      },
      data: {
        revokedAt: new Date(),
      },
    });

    return {
      message: 'Logged out successfully',
    };
  }
  async logoutAll(userId: string) {
    const result = await this.prisma.refreshSession.updateMany({
      where: {
        userId,
        revokedAt: null,
      },
      data: {
        revokedAt: new Date(),
      },
    });

    return {
      message: 'Logged out from all devices',
      sessionsRevoked: result.count,
    };
  }
  async refresh(refreshToken: string) {
    const refreshTokenSecret = this.configService.get<string>(
      'REFRESH_TOKEN_SECRET',
    );

    const accessTokenSecret = this.configService.get<string>(
      'ACCESS_TOKEN_SECRET',
    );

    if (!refreshTokenSecret || !accessTokenSecret) {
      throw new Error('JWT secrets are not configured');
    }

    let payload: {
      sub: string;
      sid: string;
      role?: string;
    };

    try {
      payload = await this.jwtService.verifyAsync(refreshToken, {
        secret: refreshTokenSecret,
      });
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const session = await this.prisma.refreshSession.findUnique({
      where: {
        id: payload.sid,
      },
      include: {
        user: true,
      },
    });

    if (!session) {
      throw new UnauthorizedException('Invalid refresh session');
    }

    if (session.revokedAt) {
      throw new UnauthorizedException('Refresh session has been revoked');
    }

    if (session.expiresAt <= new Date()) {
      throw new UnauthorizedException('Refresh token expired');
    }

    const tokenMatches = await bcrypt.compare(refreshToken, session.tokenHash);

    if (!tokenMatches) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    // If role in DB changed since this refresh token was issued, revoke all sessions and force logout
    if (payload.role && session.user.role !== payload.role) {
      await this.prisma.refreshSession.updateMany({
        where: {
          userId: session.user.id,
          revokedAt: null,
        },
        data: {
          revokedAt: new Date(),
        },
      });
      throw new UnauthorizedException('User role has changed. Please log in again.');
    }

    // Revoke old refresh token
    await this.prisma.refreshSession.update({
      where: {
        id: session.id,
      },
      data: {
        revokedAt: new Date(),
      },
    });

    // Create new session
    const newSessionId = randomUUID();

    const newRefreshToken = await this.jwtService.signAsync(
      {
        sub: session.user.id,
        sid: newSessionId,
        role: session.user.role,
      },
      {
        secret: refreshTokenSecret,
        expiresIn: '7d',
      },
    );

    const newRefreshTokenHash = await bcrypt.hash(newRefreshToken, 12);

    await this.prisma.refreshSession.create({
      data: {
        id: newSessionId,
        userId: session.user.id,
        tokenHash: newRefreshTokenHash,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    const newAccessToken = await this.jwtService.signAsync(
      {
        sub: session.user.id,
        email: session.user.email,
        role: session.user.role,
      },
      {
        secret: accessTokenSecret,
        expiresIn: '15m',
      },
    );

    return {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
    };
  }
  async forgotPassword(email: string) {
    const user = await this.prisma.user.findUnique({
      where: {
        email,
      },
    });

    // Do not reveal whether the email exists.
    if (!user) {
      return {
        message: 'If the email exists, a reset OTP has been sent.',
      };
    }

    const now = new Date();

    // Check recent OTP requests within the 10-minute window.
    const windowStart = new Date(
      now.getTime() - this.OTP_WINDOW_MINUTES * 60 * 1000,
    );

    const recentOtps = await this.prisma.passwordResetOtp.findMany({
      where: {
        userId: user.id,
        createdAt: {
          gte: windowStart,
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Maximum 3 OTPs in 10 minutes.
    if (recentOtps.length >= this.MAX_OTP_SENDS) {
      return {
        message: 'Too many OTP requests. Please try again later.',
      };
    }

    // Resend cooldown: 2 minutes.
    const latestOtp = recentOtps[0];

    if (latestOtp) {
      const cooldownEnd = new Date(
        latestOtp.createdAt.getTime() +
          this.OTP_RESEND_COOLDOWN_MINUTES * 60 * 1000,
      );

      if (now < cooldownEnd) {
        const remainingSeconds = Math.ceil(
          (cooldownEnd.getTime() - now.getTime()) / 1000,
        );

        return {
          message: 'Please wait before requesting another OTP.',
          retryAfterSeconds: remainingSeconds,
        };
      }
    }

    // Generate secure 6-digit OTP.
    const otp = randomInt(100000, 1000000).toString();

    // Hash OTP before storing it.
    const otpHash = await bcrypt.hash(otp, 12);

    const expiresAt = new Date(
      now.getTime() + this.OTP_EXPIRY_MINUTES * 60 * 1000,
    );

    // Invalidate previous active OTPs.
    await this.prisma.passwordResetOtp.updateMany({
      where: {
        userId: user.id,
        usedAt: null,
        expiresAt: {
          gt: now,
        },
      },
      data: {
        usedAt: now,
      },
    });

    await this.prisma.passwordResetOtp.create({
      data: {
        userId: user.id,
        otpHash,
        expiresAt,
      },
    });

    await this.mailService.sendPasswordResetOtp(user.email, otp);

    return {
      message: 'If the email exists, a reset OTP has been sent.',
    };
  }
  async verifyResetOtp(email: string, otp: string) {
    const user = await this.prisma.user.findUnique({
      where: {
        email,
      },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid OTP');
    }

    const resetOtp = await this.prisma.passwordResetOtp.findFirst({
      where: {
        userId: user.id,
        usedAt: null,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    if (!resetOtp) {
      throw new UnauthorizedException('Invalid OTP');
    }

    const now = new Date();

    if (resetOtp.expiresAt <= now) {
      throw new UnauthorizedException('OTP has expired');
    }

    if (resetOtp.attempts >= 5) {
      throw new UnauthorizedException(
        'Too many invalid attempts. Please request a new OTP.',
      );
    }

    const otpMatches = await bcrypt.compare(otp, resetOtp.otpHash);

    if (!otpMatches) {
      const newAttempts = resetOtp.attempts + 1;

      await this.prisma.passwordResetOtp.update({
        where: {
          id: resetOtp.id,
        },
        data: {
          attempts: newAttempts,
          ...(newAttempts >= 5
            ? {
                usedAt: now,
              }
            : {}),
        },
      });

      if (newAttempts >= 5) {
        throw new UnauthorizedException(
          'Too many invalid attempts. Please request a new OTP.',
        );
      }

      throw new UnauthorizedException('Invalid OTP');
    }

    await this.prisma.passwordResetOtp.update({
      where: {
        id: resetOtp.id,
      },
      data: {
        verifiedAt: now,
      },
    });

    return {
      message: 'OTP verified successfully',
    };
  }
  async resetPassword(dto: ResetPasswordDto) {
    const { email, otp, newPassword } = dto;

    const user = await this.prisma.user.findUnique({
      where: {
        email,
      },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid reset request');
    }

    const resetOtp = await this.prisma.passwordResetOtp.findFirst({
      where: {
        userId: user.id,
        usedAt: null,
        verifiedAt: {
          not: null,
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    if (!resetOtp) {
      throw new UnauthorizedException('OTP verification required');
    }

    if (resetOtp.expiresAt <= new Date()) {
      throw new UnauthorizedException('OTP has expired');
    }

    const otpMatches = await bcrypt.compare(otp, resetOtp.otpHash);

    if (!otpMatches) {
      throw new UnauthorizedException('Invalid OTP');
    }

    const samePassword = await bcrypt.compare(newPassword, user.password);

    if (samePassword) {
      throw new BadRequestException(
        'New password must be different from your old password',
      );
    }

    const hashedPassword = await bcrypt.hash(newPassword, 12);

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: {
          id: user.id,
        },
        data: {
          password: hashedPassword,
        },
      }),

      this.prisma.passwordResetOtp.update({
        where: {
          id: resetOtp.id,
        },
        data: {
          usedAt: new Date(),
        },
      }),

      this.prisma.refreshSession.updateMany({
        where: {
          userId: user.id,
          revokedAt: null,
        },
        data: {
          revokedAt: new Date(),
        },
      }),
    ]);

    return {
      message: 'Password reset successfully',
    };
  }
}
