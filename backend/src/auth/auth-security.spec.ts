import { describe, it, expect, beforeEach, vi } from 'vitest';
import { UnauthorizedException, BadRequestException, ForbiddenException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { Role } from '@prisma/client';
import { AuthService } from './auth.service.js';
import { LoginThrottlerService } from './services/login-throttler.service.js';
import { JwtStrategy } from './strategies/jwt.strategy.js';
import { RolesGuard } from './guards/roles.guard.js';
import { ProjectAccessGuard } from '../projects/guards/project-access.guard.js';
import { AdminService } from '../admin/admin.service.js';

describe('Production Security Audit & Hardening Test Suite', () => {
  let authService: AuthService;
  let throttlerService: LoginThrottlerService;
  let jwtStrategy: JwtStrategy;
  let mockPrisma: any;
  let mockJwtService: any;
  let mockConfigService: any;
  let mockMailService: any;

  beforeEach(() => {
    mockPrisma = {
      user: {
        findUnique: vi.fn(),
        findFirst: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
      },
      refreshSession: {
        findUnique: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        updateMany: vi.fn().mockResolvedValue({ count: 1 }),
        delete: vi.fn(),
        deleteMany: vi.fn().mockResolvedValue({ count: 1 }),
      },
      passwordResetOtp: {
        findFirst: vi.fn(),
        findMany: vi.fn().mockResolvedValue([]),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
        deleteMany: vi.fn().mockResolvedValue({ count: 1 }),
      },
      project: {
        findUnique: vi.fn(),
      },
      $transaction: vi.fn(async (callbackOrPromises) => {
        if (typeof callbackOrPromises === 'function') {
          return callbackOrPromises(mockPrisma);
        }
        return Promise.all(callbackOrPromises);
      }),
    };

    mockJwtService = {
      signAsync: vi.fn().mockImplementation(async (payload) => `signed_jwt_${JSON.stringify(payload)}`),
      verifyAsync: vi.fn(),
    };

    mockConfigService = {
      get: vi.fn((key) => {
        if (key === 'ACCESS_TOKEN_SECRET') return 'test_access_secret_123456';
        if (key === 'REFRESH_TOKEN_SECRET') return 'test_refresh_secret_987654';
        return 'test_value';
      }),
    };

    mockMailService = {
      sendPasswordResetOtp: vi.fn().mockResolvedValue(true),
    };

    throttlerService = new LoginThrottlerService();

    authService = new AuthService(
      mockPrisma,
      mockJwtService,
      mockConfigService,
      mockMailService,
      throttlerService,
    );

    jwtStrategy = new JwtStrategy(mockConfigService, mockPrisma);
  });

  // ==========================================
  // 1. LOGIN TESTS
  // ==========================================
  describe('1. Login Security & Brute Force Protection', () => {
    const validPassword = 'SecurePassword123!';

    it('should successfully log in with valid credentials and return tokens with tokenVersion', async () => {
      const passwordHash = await bcrypt.hash(validPassword, 12);
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user_1',
        email: 'user@example.com',
        password: passwordHash,
        role: Role.CLIENT,
        tokenVersion: 1,
      });

      const result = await authService.login(
        { email: 'user@example.com', password: validPassword },
        '192.168.1.1',
      );

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(mockJwtService.signAsync).toHaveBeenCalledWith(
        expect.objectContaining({ sub: 'user_1', tokenVersion: 1 }),
        expect.any(Object),
      );
    });

    it('should reject invalid password with generic message', async () => {
      const passwordHash = await bcrypt.hash(validPassword, 12);
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user_1',
        email: 'user@example.com',
        password: passwordHash,
        role: Role.CLIENT,
        tokenVersion: 1,
      });

      await expect(
        authService.login({ email: 'user@example.com', password: 'WrongPassword!' }, '192.168.1.2'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should reject non-existing email with identical generic message (no enumeration)', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(
        authService.login({ email: 'nonexistent@example.com', password: 'AnyPassword123!' }, '192.168.1.3'),
      ).rejects.toThrow(new UnauthorizedException('Invalid email or password'));
    });

    it('should enforce brute-force throttling after 5 failed attempts', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      const testIp = '10.0.0.99';
      const testEmail = 'victim@example.com';

      // 5 failed attempts
      for (let i = 0; i < 5; i++) {
        try {
          await authService.login({ email: testEmail, password: 'wrong' }, testIp);
        } catch {
          // Expected
        }
      }

      // 6th attempt must be blocked by throttler before database lookup
      mockPrisma.user.findUnique.mockClear();
      await expect(
        authService.login({ email: testEmail, password: 'wrong' }, testIp),
      ).rejects.toThrow(new UnauthorizedException('Invalid email or password'));

      expect(mockPrisma.user.findUnique).not.toHaveBeenCalled();
    });

    it('should normalize email to lowercase and trim on login', async () => {
      const storedUser = {
        id: 'user-norm-1',
        email: 'user@example.com',
        password: await bcrypt.hash('Secret123!', 12),
        role: Role.CLIENT,
        tokenVersion: 1,
      };

      mockPrisma.user.findUnique.mockImplementation(async ({ where }: { where: { email: string } }) => {
        if (where.email === 'user@example.com') return storedUser;
        return null;
      });

      // Pass uppercase with leading/trailing spaces
      const result = await authService.login({
        email: '  USER@EXAMPLE.COM  ',
        password: 'Secret123!',
      });

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'user@example.com' },
      });
    });

    it('should normalize email to lowercase and trim on registration and store lowercase in DB', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockPrisma.user.findFirst.mockResolvedValue(null);
      mockPrisma.user.create.mockImplementation(async ({ data }: { data: any }) => ({
        id: 'new-user-1',
        email: data.email,
        name: data.name,
        role: data.role,
        createdAt: new Date(),
      }));

      const res = await authService.register({
        email: '  NEWUSER@EXAMPLE.COM ',
        password: 'Password123!',
        name: ' Test User ',
      });

      expect(res.email).toBe('newuser@example.com');
      expect(mockPrisma.user.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            email: 'newuser@example.com',
            name: 'Test User',
          }),
        }),
      );
    });
  });

  // ==========================================
  // 2. REFRESH TOKEN TESTS
  // ==========================================
  describe('2. Refresh Token Security & Replay Detection', () => {
    it('should rotate refresh token and issue new session with tokenVersion', async () => {
      const rawToken = 'valid_refresh_token';
      const tokenHash = await bcrypt.hash(rawToken, 12);
      mockJwtService.verifyAsync.mockResolvedValue({
        sub: 'user_1',
        sid: 'session_1',
        role: Role.CLIENT,
        tokenVersion: 1,
      });

      mockPrisma.refreshSession.findUnique.mockResolvedValue({
        id: 'session_1',
        userId: 'user_1',
        tokenHash,
        expiresAt: new Date(Date.now() + 60000),
        revokedAt: null,
        user: { id: 'user_1', email: 'user@example.com', role: Role.CLIENT, tokenVersion: 1 },
      });

      const result = await authService.refresh(rawToken);

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      // Old session was marked revoked in transaction
      expect(mockPrisma.refreshSession.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'session_1' },
          data: expect.objectContaining({ revokedAt: expect.any(Date) }),
        }),
      );
    });

    it('should detect replay attack when presenting an already-revoked token and terminate all sessions', async () => {
      const rawToken = 'stolen_revoked_token';
      mockJwtService.verifyAsync.mockResolvedValue({
        sub: 'user_1',
        sid: 'session_stolen',
      });

      mockPrisma.refreshSession.findUnique.mockResolvedValue({
        id: 'session_stolen',
        userId: 'user_1',
        tokenHash: 'some_hash',
        expiresAt: new Date(Date.now() + 60000),
        revokedAt: new Date(Date.now() - 10000), // Already revoked!
        user: { id: 'user_1', email: 'user@example.com', role: Role.CLIENT, tokenVersion: 1 },
      });

      await expect(authService.refresh(rawToken)).rejects.toThrow(
        /Refresh token has already been revoked/,
      );

      // Must have revoked all active sessions for this user
      expect(mockPrisma.refreshSession.updateMany).toHaveBeenCalledWith({
        where: { userId: 'user_1', revokedAt: null },
        data: { revokedAt: expect.any(Date) },
      });
    });

    it('should reject refresh token if tokenVersion changed in DB and revoke sessions', async () => {
      const rawToken = 'old_version_token';
      const tokenHash = await bcrypt.hash(rawToken, 12);
      mockJwtService.verifyAsync.mockResolvedValue({
        sub: 'user_1',
        sid: 'session_1',
        role: Role.CLIENT,
        tokenVersion: 1, // Old version
      });

      mockPrisma.refreshSession.findUnique.mockResolvedValue({
        id: 'session_1',
        userId: 'user_1',
        tokenHash,
        expiresAt: new Date(Date.now() + 60000),
        revokedAt: null,
        user: { id: 'user_1', email: 'user@example.com', role: Role.CLIENT, tokenVersion: 2 }, // DB incremented to 2!
      });

      await expect(authService.refresh(rawToken)).rejects.toThrow(
        /Session expired or invalidated/,
      );

      expect(mockPrisma.refreshSession.updateMany).toHaveBeenCalled();
    });

    it('should reject refresh token if user role changed in DB and revoke sessions', async () => {
      const rawToken = 'role_changed_token';
      const tokenHash = await bcrypt.hash(rawToken, 12);
      mockJwtService.verifyAsync.mockResolvedValue({
        sub: 'user_1',
        sid: 'session_1',
        role: Role.ADMIN, // Token claims ADMIN
      });

      mockPrisma.refreshSession.findUnique.mockResolvedValue({
        id: 'session_1',
        userId: 'user_1',
        tokenHash,
        expiresAt: new Date(Date.now() + 60000),
        revokedAt: null,
        user: { id: 'user_1', email: 'user@example.com', role: Role.CLIENT, tokenVersion: 1 }, // DB demoted to CLIENT!
      });

      await expect(authService.refresh(rawToken)).rejects.toThrow(
        /User role has changed/,
      );

      expect(mockPrisma.refreshSession.updateMany).toHaveBeenCalled();
    });

    it('should reject refresh when refresh session has expired', async () => {
      const rawToken = 'expired_session_token';
      const tokenHash = await bcrypt.hash(rawToken, 12);
      mockJwtService.verifyAsync.mockResolvedValue({
        sub: 'user_1',
        sid: 'session_1',
        role: Role.CLIENT,
        tokenVersion: 1,
      });

      mockPrisma.refreshSession.findUnique.mockResolvedValue({
        id: 'session_1',
        userId: 'user_1',
        tokenHash,
        expiresAt: new Date(Date.now() - 10000), // Expired!
        revokedAt: null,
        user: { id: 'user_1', email: 'user@example.com', role: Role.CLIENT, tokenVersion: 1 },
      });

      await expect(authService.refresh(rawToken)).rejects.toThrow(
        new UnauthorizedException('Refresh token expired'),
      );
    });

    it('should successfully revoke session on logout', async () => {
      const rawToken = 'active_logout_token';
      const tokenHash = await bcrypt.hash(rawToken, 12);
      mockJwtService.verifyAsync.mockResolvedValue({
        sub: 'user_1',
        sid: 'session_logout_1',
      });

      mockPrisma.refreshSession.findUnique.mockResolvedValue({
        id: 'session_logout_1',
        userId: 'user_1',
        tokenHash,
        revokedAt: null,
      });

      const result = await authService.logout(rawToken);

      expect(result.message).toBe('Logged out successfully');
      expect(mockPrisma.refreshSession.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'session_logout_1' },
          data: expect.objectContaining({ revokedAt: expect.any(Date) }),
        }),
      );
    });

    it('should reject logout if session is already revoked', async () => {
      const rawToken = 'already_revoked_logout_token';
      mockJwtService.verifyAsync.mockResolvedValue({
        sub: 'user_1',
        sid: 'session_revoked_1',
      });

      mockPrisma.refreshSession.findUnique.mockResolvedValue({
        id: 'session_revoked_1',
        userId: 'user_1',
        revokedAt: new Date(Date.now() - 5000),
      });

      await expect(authService.logout(rawToken)).rejects.toThrow(
        new UnauthorizedException('Session already revoked'),
      );
    });
  });

  // ==========================================
  // 3. ACCESS TOKEN REVOCATION & ROLE CHANGE
  // ==========================================
  describe('3. Access Token Revocation & Role Change Invalidation', () => {
    it('should reject access token when tokenVersion does not match current DB version', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user_1',
        email: 'user@example.com',
        role: Role.CLIENT,
        tokenVersion: 3, // Current DB is 3
      });

      // Token has tokenVersion: 2 (issued before password reset or role change)
      await expect(
        jwtStrategy.validate({
          sub: 'user_1',
          email: 'user@example.com',
          role: Role.CLIENT,
          tokenVersion: 2,
        }),
      ).rejects.toThrow(new UnauthorizedException('Session expired or invalidated. Please log in again.'));
    });

    it('should reject access token when DB role differs from token role and revoke sessions', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user_1',
        email: 'user@example.com',
        role: Role.CLIENT, // Demoted to CLIENT in DB
        tokenVersion: 1,
      });

      // Token claims ADMIN
      await expect(
        jwtStrategy.validate({
          sub: 'user_1',
          email: 'user@example.com',
          role: Role.ADMIN,
          tokenVersion: 1,
        }),
      ).rejects.toThrow(new UnauthorizedException('User role has changed. Please log in again.'));

      expect(mockPrisma.refreshSession.updateMany).toHaveBeenCalled();
    });

    it('should reject access token when DB role changes from CLIENT to ADMIN and revoke sessions', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user_1',
        email: 'user@example.com',
        role: Role.ADMIN, // Promoted to ADMIN in DB
        tokenVersion: 1,
      });

      // Token still claims CLIENT
      await expect(
        jwtStrategy.validate({
          sub: 'user_1',
          email: 'user@example.com',
          role: Role.CLIENT,
          tokenVersion: 1,
        }),
      ).rejects.toThrow(new UnauthorizedException('User role has changed. Please log in again.'));

      expect(mockPrisma.refreshSession.updateMany).toHaveBeenCalled();
    });

    it('AdminService.updateUser role change atomically increments tokenVersion and revokes sessions', async () => {
      const adminService = new AdminService(mockPrisma);
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'target_user',
        email: 'client@example.com',
        role: Role.CLIENT,
      });
      mockPrisma.user.update.mockResolvedValue({
        id: 'target_user',
        email: 'client@example.com',
        role: Role.ADMIN,
      });

      await adminService.updateUser('target_user', { role: Role.ADMIN }, 'admin_user');

      expect(mockPrisma.$transaction).toHaveBeenCalled();
      expect(mockPrisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'target_user' },
          data: expect.objectContaining({
            role: Role.ADMIN,
            tokenVersion: { increment: 1 },
          }),
        }),
      );
      expect(mockPrisma.refreshSession.updateMany).toHaveBeenCalledWith({
        where: { userId: 'target_user', revokedAt: null },
        data: { revokedAt: expect.any(Date) },
      });
    });
  });

  // ==========================================
  // 4. FORGOT PASSWORD & OTP LIFECYCLE
  // ==========================================
  describe('4. Forgot Password & OTP Security Lifecycle', () => {
    it('should return identical response for existing and non-existing email to prevent enumeration', async () => {
      mockPrisma.user.findUnique.mockResolvedValueOnce(null);
      const resNonExisting = await authService.forgotPassword('nonexistent@example.com');

      mockPrisma.user.findUnique.mockResolvedValueOnce({
        id: 'user_1',
        email: 'real@example.com',
      });
      const resExisting = await authService.forgotPassword('real@example.com');

      expect(resNonExisting.message).toBe(resExisting.message);
    });

    it('should enforce 2-minute resend cooldown', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: 'user_1', email: 'real@example.com' });
      // Recent OTP created 30 seconds ago
      mockPrisma.passwordResetOtp.findMany.mockResolvedValue([
        { id: 'otp_1', createdAt: new Date(Date.now() - 30 * 1000) },
      ]);

      const result = await authService.forgotPassword('real@example.com');
      expect(result.message).toContain('Please wait before requesting another OTP');
      expect((result as any).retryAfterSeconds).toBeGreaterThan(0);
      expect(mockMailService.sendPasswordResetOtp).not.toHaveBeenCalled();
    });

    it('should enforce maximum 3 OTP sends within 10 minutes', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: 'user_1', email: 'real@example.com' });
      // 3 OTPs within window
      mockPrisma.passwordResetOtp.findMany.mockResolvedValue([
        { id: 'otp_1', createdAt: new Date(Date.now() - 150000) },
        { id: 'otp_2', createdAt: new Date(Date.now() - 300000) },
        { id: 'otp_3', createdAt: new Date(Date.now() - 450000) },
      ]);

      const result = await authService.forgotPassword('real@example.com');
      expect(result.message).toContain('Too many OTP requests');
      expect(mockMailService.sendPasswordResetOtp).not.toHaveBeenCalled();
    });

    it('should invalidate OTP after 5 failed attempts', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: 'user_1', email: 'real@example.com' });
      const hashedOtp = await bcrypt.hash('123456', 12);
      mockPrisma.passwordResetOtp.findFirst.mockResolvedValue({
        id: 'otp_1',
        userId: 'user_1',
        otpHash: hashedOtp,
        expiresAt: new Date(Date.now() + 60000),
        attempts: 4, // 5th attempt will fail
      });

      await expect(authService.verifyResetOtp('real@example.com', '999999')).rejects.toThrow(
        /Too many invalid attempts/,
      );

      expect(mockPrisma.passwordResetOtp.delete).toHaveBeenCalledWith({ where: { id: 'otp_1' } });
    });

    it('should generate a single-use resetToken on successful OTP verification', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: 'user_1', email: 'real@example.com' });
      const hashedOtp = await bcrypt.hash('123456', 12);
      mockPrisma.passwordResetOtp.findFirst.mockResolvedValue({
        id: 'otp_1',
        userId: 'user_1',
        otpHash: hashedOtp,
        expiresAt: new Date(Date.now() + 60000),
        attempts: 0,
      });

      const result = await authService.verifyResetOtp('real@example.com', '123456');

      expect(result).toHaveProperty('resetToken');
      expect(result.resetToken).toHaveLength(64); // 32-byte hex
      expect(mockPrisma.passwordResetOtp.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'otp_1' },
          data: expect.objectContaining({
            resetTokenHash: expect.any(String),
            resetTokenExpiresAt: expect.any(Date),
          }),
        }),
      );
    });

    it('should reject already-verified OTP on subsequent verification attempts', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: 'user_1', email: 'real@example.com' });
      // When findFirst filters with verifiedAt: null, an already verified OTP returns null
      mockPrisma.passwordResetOtp.findFirst.mockResolvedValue(null);

      await expect(
        authService.verifyResetOtp('real@example.com', '123456'),
      ).rejects.toThrow(new UnauthorizedException('Invalid or already used OTP'));
    });

    it('should reject expired OTP verification and delete expired records', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: 'user_1', email: 'real@example.com' });
      const hashedOtp = await bcrypt.hash('123456', 12);
      mockPrisma.passwordResetOtp.findFirst.mockResolvedValue({
        id: 'otp_1',
        userId: 'user_1',
        otpHash: hashedOtp,
        expiresAt: new Date(Date.now() - 5000), // Expired!
        attempts: 0,
      });

      await expect(
        authService.verifyResetOtp('real@example.com', '123456'),
      ).rejects.toThrow(new UnauthorizedException('OTP has expired'));

      expect(mockPrisma.passwordResetOtp.deleteMany).toHaveBeenCalledWith({
        where: {
          userId: 'user_1',
          expiresAt: { lte: expect.any(Date) },
        },
      });
    });

    it('should delete all previous OTPs when generating a new OTP', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: 'user_1', email: 'real@example.com' });
      mockPrisma.passwordResetOtp.findMany.mockResolvedValue([]); // No cooldown violation

      await authService.forgotPassword('real@example.com');

      // Verifies previous OTPs/tokens are cleaned up before creating new one
      expect(mockPrisma.passwordResetOtp.deleteMany).toHaveBeenCalledWith({
        where: { userId: 'user_1' },
      });
      expect(mockPrisma.passwordResetOtp.create).toHaveBeenCalled();
    });
  });

  // ==========================================
  // 5. RESET PASSWORD & AUTHENTICATED PASSWORD CHANGE
  // ==========================================
  describe('5. Reset Password & Authenticated Password Change', () => {
    it('should reject reset password when same password is used', async () => {
      const oldPassword = 'CurrentPassword123!';
      const oldHash = await bcrypt.hash(oldPassword, 12);
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user_1',
        email: 'user@example.com',
        password: oldHash,
      });

      const resetToken = 'a'.repeat(64);
      const resetTokenHash = await bcrypt.hash(resetToken, 10);
      mockPrisma.passwordResetOtp.findFirst.mockResolvedValue({
        id: 'otp_1',
        userId: 'user_1',
        resetTokenHash,
        resetTokenExpiresAt: new Date(Date.now() + 60000),
      });

      await expect(
        authService.resetPassword({
          email: 'user@example.com',
          resetToken,
          newPassword: oldPassword, // Same as old password!
        }),
      ).rejects.toThrow(new BadRequestException('New password must be different from your old password'));
    });

    it('should atomically reset password, delete reset authorization, increment tokenVersion and revoke all sessions', async () => {
      const oldPassword = 'OldPassword123!';
      const oldHash = await bcrypt.hash(oldPassword, 12);
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user_1',
        email: 'user@example.com',
        password: oldHash,
      });

      const resetToken = 'b'.repeat(64);
      const resetTokenHash = await bcrypt.hash(resetToken, 10);
      mockPrisma.passwordResetOtp.findFirst.mockResolvedValue({
        id: 'otp_1',
        userId: 'user_1',
        resetTokenHash,
        resetTokenExpiresAt: new Date(Date.now() + 60000),
      });

      const result = await authService.resetPassword({
        email: 'user@example.com',
        resetToken,
        newPassword: 'BrandNewSecurePassword456!',
      });

      expect(result.message).toBe('Password reset successfully');
      expect(mockPrisma.$transaction).toHaveBeenCalled();
      expect(mockPrisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'user_1' },
          data: expect.objectContaining({ tokenVersion: { increment: 1 } }),
        }),
      );
      expect(mockPrisma.refreshSession.updateMany).toHaveBeenCalledWith({
        where: { userId: 'user_1', revokedAt: null },
        data: { revokedAt: expect.any(Date) },
      });
      expect(mockPrisma.passwordResetOtp.delete).toHaveBeenCalledWith({ where: { id: 'otp_1' } });
    });

    it('should reject reset password when resetToken has expired and delete record', async () => {
      const oldPassword = 'OldPassword123!';
      const oldHash = await bcrypt.hash(oldPassword, 12);
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user_1',
        email: 'user@example.com',
        password: oldHash,
      });

      const resetToken = 'c'.repeat(64);
      const resetTokenHash = await bcrypt.hash(resetToken, 10);
      mockPrisma.passwordResetOtp.findFirst.mockResolvedValue({
        id: 'otp_expired',
        userId: 'user_1',
        resetTokenHash,
        resetTokenExpiresAt: new Date(Date.now() - 5000), // Expired!
      });

      await expect(
        authService.resetPassword({
          email: 'user@example.com',
          resetToken,
          newPassword: 'BrandNewSecurePassword456!',
        }),
      ).rejects.toThrow(new UnauthorizedException('Reset authorization has expired'));

      expect(mockPrisma.passwordResetOtp.delete).toHaveBeenCalledWith({ where: { id: 'otp_expired' } });
    });

    it('should reject reuse of resetToken once password has already been reset', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user_1',
        email: 'user@example.com',
        password: 'SomePassword123!',
      });

      // Once deleted from DB after successful reset, findFirst returns null
      mockPrisma.passwordResetOtp.findFirst.mockResolvedValue(null);

      await expect(
        authService.resetPassword({
          email: 'user@example.com',
          resetToken: 'already_used_token',
          newPassword: 'BrandNewSecurePassword456!',
        }),
      ).rejects.toThrow(new UnauthorizedException('Invalid or expired reset authorization'));
    });

    it('should allow authenticated password change, incrementing tokenVersion and revoking sessions', async () => {
      const currentPassword = 'CurrentPassword123!';
      const currentHash = await bcrypt.hash(currentPassword, 12);
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user_1',
        password: currentHash,
      });

      const result = await authService.changePassword('user_1', {
        currentPassword,
        newPassword: 'NewPassword789!',
      });

      expect(result.message).toContain('Password changed successfully');
      expect(mockPrisma.$transaction).toHaveBeenCalled();
      expect(mockPrisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'user_1' },
          data: expect.objectContaining({ tokenVersion: { increment: 1 } }),
        }),
      );
      expect(mockPrisma.refreshSession.updateMany).toHaveBeenCalledWith({
        where: { userId: 'user_1', revokedAt: null },
        data: { revokedAt: expect.any(Date) },
      });
    });

    it('logoutAll atomically increments tokenVersion and revokes all refresh sessions', async () => {
      await authService.logoutAll('user_1');

      expect(mockPrisma.$transaction).toHaveBeenCalled();
      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user_1' },
        data: { tokenVersion: { increment: 1 } },
      });
      expect(mockPrisma.refreshSession.updateMany).toHaveBeenCalledWith({
        where: { userId: 'user_1', revokedAt: null },
        data: { revokedAt: expect.any(Date) },
      });
    });
  });

  // ==========================================
  // 6. AUTHORIZATION & IDOR GUARDS
  // ==========================================
  describe('6. Authorization & IDOR Access Control', () => {
    it('RolesGuard blocks CLIENT user from ADMIN endpoints', () => {
      const reflectorMock = {
        getAllAndOverride: vi.fn().mockReturnValue([Role.ADMIN]),
      };
      const rolesGuard = new RolesGuard(reflectorMock as any);

      const mockExecutionContext = {
        getHandler: vi.fn(),
        getClass: vi.fn(),
        switchToHttp: vi.fn().mockReturnValue({
          getRequest: vi.fn().mockReturnValue({
            user: { userId: 'user_client', role: Role.CLIENT },
          }),
        }),
      };

      const canActivate = rolesGuard.canActivate(mockExecutionContext as any);
      expect(canActivate).toBe(false);
    });

    it('RolesGuard allows ADMIN user on ADMIN endpoints', () => {
      const reflectorMock = {
        getAllAndOverride: vi.fn().mockReturnValue([Role.ADMIN]),
      };
      const rolesGuard = new RolesGuard(reflectorMock as any);

      const mockExecutionContext = {
        getHandler: vi.fn(),
        getClass: vi.fn(),
        switchToHttp: vi.fn().mockReturnValue({
          getRequest: vi.fn().mockReturnValue({
            user: { userId: 'user_admin', role: Role.ADMIN },
          }),
        }),
      };

      const canActivate = rolesGuard.canActivate(mockExecutionContext as any);
      expect(canActivate).toBe(true);
    });

    it('ProjectAccessGuard prevents CLIENT from accessing another client project (IDOR protection)', async () => {
      const projectAccessGuard = new ProjectAccessGuard(mockPrisma);

      mockPrisma.project.findUnique.mockResolvedValue({
        id: 'project_123',
        userId: 'other_user', // Owned by someone else
      });

      const mockExecutionContext = {
        switchToHttp: vi.fn().mockReturnValue({
          getRequest: vi.fn().mockReturnValue({
            user: { userId: 'attacker_user', role: Role.CLIENT },
            params: { projectId: 'project_123' },
          }),
        }),
      };

      await expect(
        projectAccessGuard.canActivate(mockExecutionContext as any),
      ).rejects.toThrow(new ForbiddenException('You do not have access to this project'));
    });

    it('ProjectAccessGuard allows CLIENT to access their own project', async () => {
      const projectAccessGuard = new ProjectAccessGuard(mockPrisma);

      mockPrisma.project.findUnique.mockResolvedValue({
        id: 'project_123',
        userId: 'legit_user',
      });

      const mockExecutionContext = {
        switchToHttp: vi.fn().mockReturnValue({
          getRequest: vi.fn().mockReturnValue({
            user: { userId: 'legit_user', role: Role.CLIENT },
            params: { projectId: 'project_123' },
          }),
        }),
      };

      const result = await projectAccessGuard.canActivate(mockExecutionContext as any);
      expect(result).toBe(true);
    });

    it('ProjectAccessGuard allows ADMIN to access any project', async () => {
      const projectAccessGuard = new ProjectAccessGuard(mockPrisma);

      mockPrisma.project.findUnique.mockResolvedValue({
        id: 'project_123',
        userId: 'any_user',
      });

      const mockExecutionContext = {
        switchToHttp: vi.fn().mockReturnValue({
          getRequest: vi.fn().mockReturnValue({
            user: { userId: 'admin_user', role: Role.ADMIN },
            params: { projectId: 'project_123' },
          }),
        }),
      };

      const result = await projectAccessGuard.canActivate(mockExecutionContext as any);
      expect(result).toBe(true);
    });
  });
});
