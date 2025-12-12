import { Injectable, Logger } from '@nestjs/common';
import { Resend } from 'resend';
import { sendEmailDto } from './dto/email.dto';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly resend: Resend;
  private readonly from: string;

  constructor() {
    if (!process.env.RESEND_API_KEY) {
      this.logger.warn('RESEND_API_KEY is not set');
    }
    this.resend = new Resend(process.env.RESEND_API_KEY);
    this.from =
      process.env.RESEND_FROM ||
      process.env.FROM_EMAIL ||
      'no-reply@velcar.app';
  }

  async sendEmail(dto: sendEmailDto) {
    const { recipients, subject, html, text } = dto;

    // Normalize recipients to array
    const to = Array.isArray(recipients) ? recipients : [recipients];

    try {
      const { data, error } = await this.resend.emails.send({
        from: this.from,
        to,
        subject,
        html,
        text,
      });

      if (error) {
        this.logger.error('Resend send error', error);
        throw new Error(error.message || 'Failed to send email');
      }

      this.logger.log(
        `Email sent to ${to.join(', ')} (id: ${data?.id ?? 'unknown'})`,
      );
      return data;
    } catch (error) {
      this.logger.error('Error sending email', error as any);
      throw error;
    }
  }
}
