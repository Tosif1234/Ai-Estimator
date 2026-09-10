import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { Resend } from 'resend';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private resendClient: Resend | null = null;

  constructor() {
    const apiKey = process.env.RESEND_API_KEY;
    if (apiKey) {
      this.resendClient = new Resend(apiKey);
    } else {
      this.logger.warn(
        'RESEND_API_KEY is not configured in environment variables. Forgot password OTP delivery via HTTPS will fail until RESEND_API_KEY is set.',
      );
    }
  }

  private getClient(): Resend {
    if (!this.resendClient) {
      const apiKey = process.env.RESEND_API_KEY;
      if (!apiKey) {
        this.logger.error('Email delivery failed: RESEND_API_KEY is missing');
        throw new InternalServerErrorException(
          'Unable to send email. Please try again later.',
        );
      }
      this.resendClient = new Resend(apiKey);
    }
    return this.resendClient;
  }

  private getFromAddress(): string {
    return process.env.EMAIL_FROM || 'AI Estimator <onboarding@resend.dev>';
  }

  async sendPasswordResetOtp(
    email: string,
    otp: string,
  ): Promise<void> {
    const resend = this.getClient();
    const from = this.getFromAddress();

    try {
      const { error } = await resend.emails.send({
        from,
        to: email,
        subject: 'AI Estimator - Password Reset OTP',
        text: `Your AI Estimator password reset OTP is ${otp}. This OTP expires in 10 minutes.`,
        html: `
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

      if (error) {
        this.logger.error(
          `Resend email delivery failed: ${error.name || 'Error'} - ${error.message || 'Unknown error'}`,
        );
        throw new InternalServerErrorException(
          'Unable to send email. Please try again later.',
        );
      }
    } catch (error) {
      if (error instanceof InternalServerErrorException) {
        throw error;
      }

      this.logger.error(
        `Unexpected error during email delivery: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );

      throw new InternalServerErrorException(
        'Unable to send email. Please try again later.',
      );
    }
  }
}