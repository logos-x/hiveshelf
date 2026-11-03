import 'reflect-metadata';
import './load-env.ts';
import assert from 'node:assert/strict';
import { Module } from '@nestjs/common';
import { StorageModule } from '../src/storage/storage.module.ts';
import { EmailModule } from '../src/email/email.module.ts';
import { NestFactory } from '@nestjs/core';
import {
  STORAGE_SERVICE,
  StorageService,
} from '../src/storage/storage.service.ts';
import { EMAIL_SERVICE, EmailService } from '../src/email/email.service.ts';
import { randomUUID } from 'node:crypto';
import { buffer } from 'node:stream/consumers';
import { InMemoryEmailService } from '../src/email/in-memory-email.service.ts';

@Module({
  imports: [StorageModule, EmailModule],
})
class SmokeModule {}

async function main(): Promise<void> {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('dev:smoke cannot run in production');
  }

  const app = await NestFactory.createApplicationContext(SmokeModule, {
    logger: false,
    abortOnError: false,
  });

  try {
    const storage = app.get<StorageService>(STORAGE_SERVICE);
    const email = app.get<EmailService>(EMAIL_SERVICE);
    const key = `smoke/${randomUUID()}.txt`;
    const content = 'hello hiveshelf';

    try {
      await storage.put(key, Buffer.from(content), 'text/plain');
      assert.equal(await storage.exists(key), true);
      console.log('✓ Storage push and exists');

      const object = await storage.get(key);
      assert.equal((await buffer(object.body)).toString('utf8'), content);
      assert.equal(object.contentType, 'text/plain');
      assert.equal(object.size, Buffer.byteLength(content));
      console.log('✓ Storage get and metadata');

      const signedUrl = new URL(await storage.getSignedUrl(key, 60));

      if (signedUrl.protocol === 'memory:') {
        assert.equal(decodeURIComponent(signedUrl.pathname.slice(1)), key);
        assert.ok(Number(signedUrl.searchParams.get('expires')) > Date.now());
        console.log('✓ Memory URL format (no HTTP request)');
      } else {
        assert.ok(
          signedUrl.protocol === 'http:' || signedUrl.protocol === 'https:',
        );

        const response = await fetch(signedUrl, {
          signal: AbortSignal.timeout(5000),
        });

        const body = await response.text();

        assert.equal(response.status, 200);
        assert.equal(body, content);

        console.log('✓ Signed URL HTTP access');
      }
    } finally {
      await storage.delete(key);
    }

    assert.equal(await storage.exists(key), false);
    console.log('✓ Storage delete');

    const recipient = `smoke-${randomUUID()}@example.com`;

    await email.send({
      template: 'welcome',
      to: recipient,
      data: {
        name: 'Smoke',
        appUrl: 'http://localhost:3000',
      },
    });

    if (email instanceof InMemoryEmailService) {
      assert.equal(email.outbox.length, 1);
      assert.equal(email.outbox[0]?.to, recipient);
      assert.equal(email.outbox[0]?.subject, 'Welcome Smoke to HiveShelf');

      console.log('✓ Email record in memory outbox');
    } else {
      console.log(`✓ Email submitted via SMTP: ${recipient}`);
      console.log('  Open Mailpit to inspect the message.');
    }
  } finally {
    await app.close();
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
