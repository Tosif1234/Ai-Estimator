import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';

import { PrismaModule } from '../prisma/prisma.module.js';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { JwtStrategy } from './strategies/jwt.strategy.js';
import { MailModule } from '../mail/mail.module.js';
import { AuthCleanupService } from './auth-cleanup.service.js';
import { LoginThrottlerService } from './services/login-throttler.service.js';

@Module({
  imports: [
    PrismaModule,
    MailModule,

    PassportModule.register({
      defaultStrategy: 'jwt',
    }),

    JwtModule.register({}),
  ],

  controllers: [AuthController],

  providers: [
    AuthService,
    JwtStrategy,
    AuthCleanupService,
    LoginThrottlerService,
  ],

  exports: [
    PassportModule,
    JwtModule,
    JwtStrategy,
    AuthCleanupService,
    LoginThrottlerService,
  ],
})
export class AuthModule {}