import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

export type EmailPayload = {
  to: string | string[];
  subject: string;
  text: string;
  html?: string;
};

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);

  isConfigured() {
    return Boolean(process.env.SMTP_HOST && process.env.SMTP_FROM);
  }

  async send(payload: EmailPayload): Promise<{ sent: boolean; skipped?: boolean; messageId?: string }> {
    if (!this.isConfigured()) {
      this.logger.warn('SMTP não configurado — e-mail não enviado.');
      return { sent: false, skipped: true };
    }

    const port = Number(process.env.SMTP_PORT || 587);
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port,
      secure: process.env.SMTP_SECURE === 'true' || port === 465,
      auth:
        process.env.SMTP_USER && process.env.SMTP_PASS
          ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
          : undefined,
    });

    const info = await transporter.sendMail({
      from: process.env.SMTP_FROM,
      to: payload.to,
      subject: payload.subject,
      text: payload.text,
      html: payload.html,
    });

    return { sent: true, messageId: info.messageId };
  }
}
