import {
  EmailService,
  RenderedEmail,
  SendEmailInput,
  TemplateName,
} from './email.service.ts';
import { TemplateRenderer } from './template-renderer.ts';

export interface OutboxEmail extends RenderedEmail {
  to: string | string[];
}

export class InMemoryEmailService implements EmailService {
  readonly outbox: OutboxEmail[] = [];

  constructor(private readonly renderer: TemplateRenderer) {}

  async send<T extends TemplateName>(input: SendEmailInput<T>): Promise<void> {
    const redered = this.renderer.render(input.template, input.data);

    this.outbox.push({
      to: Array.isArray(input.to) ? [...input.to] : input.to,
      ...redered,
    });
  }

  clear(): void {
    this.outbox.length = 0;
  }
}
