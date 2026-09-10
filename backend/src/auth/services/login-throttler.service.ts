import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';

interface ThrottleRecord {
  attempts: number;
  blockedUntil?: number;
  lastAttempt: number;
}

@Injectable()
export class LoginThrottlerService {
  private readonly logger = new Logger(LoginThrottlerService.name);

  // Maximum failed attempts before temporary throttling
  private readonly MAX_FAILED_ATTEMPTS = 5;
  // Window of observation: 5 minutes (in ms)
  private readonly WINDOW_MS = 5 * 60 * 1000;
  // Temporary backoff cooldown: 2 minutes (in ms)
  private readonly COOLDOWN_MS = 2 * 60 * 1000;

  // In-memory buckets for IP and normalized email
  private readonly ipAttempts = new Map<string, ThrottleRecord>();
  private readonly emailAttempts = new Map<string, ThrottleRecord>();

  constructor() {
    // Periodically clean up stale entries every 10 minutes
    setInterval(() => this.cleanupStaleRecords(), 10 * 60 * 1000).unref();
  }

  /**
   * Pre-check whether this request is currently throttled.
   * If throttled, throws generic UnauthorizedException to avoid leaking account status.
   */
  checkThrottle(ip: string, email: string): void {
    const now = Date.now();
    const normalizedEmail = email.trim().toLowerCase();

    const ipRecord = this.ipAttempts.get(ip);
    if (ipRecord?.blockedUntil && ipRecord.blockedUntil > now) {
      this.logger.warn(`Throttled login attempt from IP ${ip} (cooldown active)`);
      throw new UnauthorizedException('Invalid email or password');
    }

    const emailRecord = this.emailAttempts.get(normalizedEmail);
    if (emailRecord?.blockedUntil && emailRecord.blockedUntil > now) {
      this.logger.warn(
        `Throttled login attempt for email [PROTECTED] from IP ${ip} (cooldown active)`,
      );
      throw new UnauthorizedException('Invalid email or password');
    }
  }

  /**
   * Record a failed login attempt for IP and email.
   * If attempts reach threshold, set temporary backoff.
   */
  recordFailedAttempt(ip: string, email: string): void {
    const now = Date.now();
    const normalizedEmail = email.trim().toLowerCase();

    this.updateRecord(this.ipAttempts, ip, now);
    this.updateRecord(this.emailAttempts, normalizedEmail, now);
  }

  /**
   * Clear failed attempts on successful login.
   */
  recordSuccess(ip: string, email: string): void {
    const normalizedEmail = email.trim().toLowerCase();
    this.ipAttempts.delete(ip);
    this.emailAttempts.delete(normalizedEmail);
  }

  private updateRecord(map: Map<string, ThrottleRecord>, key: string, now: number): void {
    const current = map.get(key);

    if (!current || now - current.lastAttempt > this.WINDOW_MS) {
      map.set(key, { attempts: 1, lastAttempt: now });
      return;
    }

    current.attempts += 1;
    current.lastAttempt = now;

    if (current.attempts >= this.MAX_FAILED_ATTEMPTS) {
      current.blockedUntil = now + this.COOLDOWN_MS;
      this.logger.warn(
        `Temporary throttle activated for key [PROTECTED] (${current.attempts} failed attempts, cooldown for ${this.COOLDOWN_MS / 1000}s)`,
      );
    }
  }

  private cleanupStaleRecords(): void {
    const now = Date.now();
    for (const [key, record] of this.ipAttempts.entries()) {
      if (now - record.lastAttempt > this.WINDOW_MS && (!record.blockedUntil || record.blockedUntil < now)) {
        this.ipAttempts.delete(key);
      }
    }
    for (const [key, record] of this.emailAttempts.entries()) {
      if (now - record.lastAttempt > this.WINDOW_MS && (!record.blockedUntil || record.blockedUntil < now)) {
        this.emailAttempts.delete(key);
      }
    }
  }
}
