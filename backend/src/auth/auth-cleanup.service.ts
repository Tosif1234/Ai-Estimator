import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class AuthCleanupService implements OnApplicationBootstrap {
  private readonly logger = new Logger(AuthCleanupService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Run cleanup once upon application startup to clear any stale records accumulated during downtime.
   */
  async onApplicationBootstrap(): Promise<void> {
    this.logger.log('Running initial authentication records cleanup...');
    try {
      await this.cleanupAuthRecords();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.error(`Initial auth cleanup failed: ${msg}`);
    }
  }

  /**
   * Scheduled cron job running every hour to automatically delete expired/consumed OTPs
   * and expired/revoked refresh sessions.
   */
  @Cron(CronExpression.EVERY_HOUR)
  async handleScheduledCleanup(): Promise<void> {
    await this.cleanupAuthRecords();
  }

  /**
   * Main cleanup routine using efficient Prisma deleteMany operations.
   * NEVER deletes active/valid OTPs or active refresh sessions.
   */
  async cleanupAuthRecords(): Promise<{ deletedOtps: number; deletedSessions: number }> {
    const now = new Date();
    // 48-hour retention period for revoked sessions to enable token replay attack detection
    const retentionCutoff = new Date(now.getTime() - 48 * 60 * 60 * 1000);

    const [deletedOtps, deletedSessions] = await Promise.all([
      // 1. Delete OTPs that are expired, consumed (usedAt not null), or exceeded max failed attempts
      this.prisma.passwordResetOtp.deleteMany({
        where: {
          OR: [
            { expiresAt: { lt: now } },
            { usedAt: { not: null } },
            { attempts: { gte: 5 } },
            { resetTokenExpiresAt: { not: null, lt: now } },
          ],
        },
      }),

      // 2. Delete RefreshSessions that are expired OR revoked older than the 48-hour retention window
      this.prisma.refreshSession.deleteMany({
        where: {
          OR: [
            { expiresAt: { lt: now } },
            { revokedAt: { lt: retentionCutoff } },
          ],
        },
      }),
    ]);

    if (deletedOtps.count > 0 || deletedSessions.count > 0) {
      this.logger.log(
        `Auth cleanup completed: removed ${deletedOtps.count} obsolete OTPs and ${deletedSessions.count} obsolete refresh sessions.`,
      );
    } else {
      this.logger.debug('Auth cleanup executed: database is clean, no obsolete records found.');
    }

    return {
      deletedOtps: deletedOtps.count,
      deletedSessions: deletedSessions.count,
    };
  }
}
