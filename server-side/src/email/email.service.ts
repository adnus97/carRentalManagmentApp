// email.service.ts
import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import { sendEmailDto } from './dto/email.dto';

@Injectable()
export class EmailService {
  private transporter: nodemailer.Transporter;
  private readonly logger = new Logger(EmailService.name);

  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST!,
      port: Number(process.env.SMTP_PORT || 587),
      secure: Number(process.env.SMTP_PORT || 587) === 465 ? true : false,
      auth: {
        user: process.env.SMTP_USER!,
        pass: process.env.SMTP_PASS!,
      },
      // You can keep or remove this depending on your environment trust
      // tls: { rejectUnauthorized: false },
    });
  }

  async sendEmail(dto: sendEmailDto) {
    const { recipients, subject, html, text } = dto;

    const options: nodemailer.SendMailOptions = {
      from: process.env.FROM_EMAIL || process.env.SMTP_USER,
      to: recipients,
      subject,
      html,
      text,
    };

    try {
      await this.transporter.sendMail(options);
      this.logger.log(
        `Email sent to ${Array.isArray(recipients) ? recipients.join(', ') : recipients}`,
      );
    } catch (error) {
      this.logger.error('Error sending email', error as any);
      throw error;
    }
  }
}
