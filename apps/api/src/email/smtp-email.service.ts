import { EmailService, SendEmailInput, TemplateName } from './email.service.ts';
import { OnModuleDestroy } from '@nestjs/common';
import nodemailer from 'nodemailer';
import { TemplateRenderer } from './template-renderer.ts';

export interface SmtpEmailConfig {
  host: string;
  port: number;
  from: string;
}

export class SmtpEmailService implements EmailService, OnModuleDestroy {
  private readonly transport: ReturnType<typeof nodemailer.createTransport>;

  constructor(
    private readonly config: SmtpEmailConfig,
    private readonly renderer: TemplateRenderer,
  ) {
    this.transport = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: false,
      connectionTimeout: 5000,
      greetingTimeout: 5000,
      socketTimeout: 10000,
    });
  }

  async send<T extends TemplateName>(input: SendEmailInput<T>): Promise<void> {
    const rendered = this.renderer.render(input.template, input.data);

    await this.transport.sendMail({
      from: this.config.from,
      to: input.to,
      ...rendered,
    });
  }

  onModuleDestroy(): void {
    this.transport.close();
  }
}
