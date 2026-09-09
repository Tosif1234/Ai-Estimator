import {
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import nodemailer, {
  Transporter,
} from 'nodemailer';

@Injectable()
export class MailService {
  private readonly transporter: Transporter;

  constructor() {
    const email = process.env.SMTP_EMAIL;
    const password = process.env.SMTP_PASS;

    if (!email || !password) {
      throw new Error(
        'SMTP_EMAIL and SMTP_PASSWORD are not configured',
      );
    }

    this.transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: email,
        pass: password,
      },
    });
  }

  async sendPasswordResetOtp(
    email: string,
    otp: string,
  ): Promise<void> {
    try {
      await this.transporter.sendMail({
        from: `"AI Estimator" <${process.env.SMTP_EMAIL}>`,
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
    } catch (error) {
      console.error('SMTP EMAIL ERROR:', error);

      throw new InternalServerErrorException(
        'Unable to send email. Please try again later.',
      );
    }
  }
}