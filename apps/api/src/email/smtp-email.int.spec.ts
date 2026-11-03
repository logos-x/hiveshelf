import 'reflect-metadata';
import { z } from 'zod';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { INestApplicationContext } from '@nestjs/common';
import { EMAIL_SERVICE, EmailService } from './email.service.ts';
import { NestFactory } from '@nestjs/core';
import { EmailModule } from './email.module.ts';
import { SmtpEmailService } from './smtp-email.service.ts';
import { randomUUID } from 'node:crypto';

const mailpitUrl = `http://localhost:${process.env.MAILPIT_UI_PORT ?? '8025'}`;

const searchSchema = z.object({
  messages: z.array(
    z.object({
      ID: z.string(),
    }),
  ),
});

const messageSchema = z.object({
  Subject: z.string(),
  HTML: z.string(),
  Text: z.string(),
  To: z.array(z.object({ Address: z.string() })),
});

async function request(
  path: string,
  options: RequestInit = {},
): Promise<Response> {
  const response = await fetch(`${mailpitUrl}${path}`, {
    ...options,
    signal: AbortSignal.timeout(5000),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Mailpit returned ${response.status}: ${body}`);
  }

  return response;
}

describe('SMTP email integration', () => {
  let app: INestApplicationContext | undefined;
  let email: EmailService;

  beforeAll(async () => {
    app = await NestFactory.createApplicationContext(EmailModule, {
      logger: false,
      abortOnError: false,
    });

    email = app.get<EmailService>(EMAIL_SERVICE);

    if (!(email instanceof SmtpEmailService)) {
      throw new Error('Integration tests require EMAIL_DRIVER=smtp');
    }
  });

  afterAll(async () => {
    await app?.close();
  });

  it('delivers the welcome subject, HTML and text to Mailpit', async () => {
    const recipient = `integration-${randomUUID()}@example.com`;
    const name = 'SMTP Reader';
    const appUrl = 'http://localhost:3000';
    let messageId: string | undefined;

    try {
      await email.send({
        template: 'welcome',
        to: recipient,
        data: { name, appUrl },
      });

      await expect
        .poll(
          async () => {
            const query = encodeURIComponent(`to:${recipient}`);
            const response = await request(`/api/v1/search?query=${query}`);
            const result = searchSchema.parse(await response.json());

            messageId = result.messages[0]?.ID;

            return messageId;
          },
          { timeout: 7000, interval: 200 },
        )
        .toBeTruthy();

      if (!messageId) {
        throw new Error('Sent email was not found in Mailpit');
      }

      const response = await request(`/api/v1/message/${messageId}`);
      const message = messageSchema.parse(await response.json());

      expect(message.Subject).toBe(`Welcome ${name} to HiveShelf`);
      expect(message.To).toContainEqual(
        expect.objectContaining({ Address: recipient }),
      );
      expect(message.HTML).toContain(`Hi ${name}!`);
      expect(message.HTML).toMatch(/\bhref=(['"])http:\/\/localhost:3000\1/);
      expect(message.Text).toContain(`Hi ${name}!`);
      expect(message.Text).toContain(appUrl);
    } finally {
      if (messageId) {
        const response = await request('/api/v1/messages', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ IDs: [messageId] }),
        });

        await response.text();
      }
    }
  });
});
