import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { BrevoClient, BrevoError } from '@getbrevo/brevo';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private brevoClient: BrevoClient | null = null;

  constructor() {
    const apiKey = process.env.BREVO_API_KEY;
    if (apiKey) {
      this.brevoClient = new BrevoClient({ apiKey });
    } else {
      this.logger.warn(
        'BREVO_API_KEY is not configured in environment variables. Forgot password OTP delivery via Brevo HTTPS API will fail until BREVO_API_KEY is set.',
      );
    }
  }

  private getClient(): BrevoClient {
    if (!this.brevoClient) {
      const apiKey = process.env.BREVO_API_KEY;
      if (!apiKey) {
        this.logger.error('Email delivery failed: BREVO_API_KEY is missing');
        throw new InternalServerErrorException(
          'Unable to send email. Please try again later.',
        );
      }
      this.brevoClient = new BrevoClient({ apiKey });
    }
    return this.brevoClient;
  }

  private getSender(): { name: string; email: string } {
    const rawEmail =
      process.env.BREVO_SENDER_EMAIL ||
      process.env.EMAIL_FROM ||
      process.env.SMTP_EMAIL ||
      '';
    const senderName = process.env.BREVO_SENDER_NAME || 'AI Estimator';

    // Extract email if format is "Name <email@domain.com>"
    const match = rawEmail.match(/<([^>]+)>/);
    const cleanEmail = (match ? match[1] : rawEmail).trim().replace(/^["']|["']$/g, '');

    return {
      name: senderName,
      email: cleanEmail,
    };
  }

  async sendPasswordResetOtp(
    email: string,
    otp: string,
  ): Promise<void> {
    const client = this.getClient();
    const sender = this.getSender();

    if (!sender.email) {
      this.logger.error(
        'Email delivery failed: Verified sender email is not configured (set BREVO_SENDER_EMAIL or EMAIL_FROM)',
      );
      throw new InternalServerErrorException(
        'Unable to send email. Please try again later.',
      );
    }

    try {
      await client.transactionalEmails.sendTransacEmail({
        sender: {
          name: sender.name,
          email: sender.email,
        },
        to: [
          {
            email,
          },
        ],
        subject: 'AI Estimator - Password Reset OTP',
        textContent: `Your AI Estimator password reset OTP is ${otp}. This OTP expires in 10 minutes.`,
        htmlContent: `
          <div style="
            font-family: Arial, sans-serif;
            max-width: 520px;
            margin: 40px auto;
            padding: 30px;
            border: 1px solid #e5e7eb;
            border-radius: 12px;
          ">
            <h2>AI Estimator</h2>

            <p>
              We received a request to reset your password.
            </p>

            <p>Your verification OTP is:</p>

            <div style="
              font-size: 32px;
              font-weight: 700;
              letter-spacing: 8px;
              margin: 25px 0;
            ">
              ${otp}
            </div>

            <p>
              This OTP will expire in
              <strong>10 minutes</strong>.
            </p>

            <p>
              If you did not request a password reset,
              you can safely ignore this email.
            </p>
          </div>
        `,
      });
    } catch (error) {
      if (error instanceof InternalServerErrorException) {
        throw error;
      }

      if (error instanceof BrevoError) {
        this.logger.error(
          `Brevo email delivery failed: HTTP status ${error.statusCode || 'unknown'}`,
        );
      } else {
        this.logger.error(
          `Unexpected error during email delivery: ${error instanceof Error ? error.message : 'Unknown error'}`,
        );
      }

      throw new InternalServerErrorException(
        'Unable to send email. Please try again later.',
      );
    }
  }
}