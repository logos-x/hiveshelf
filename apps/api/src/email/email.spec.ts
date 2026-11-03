import { describe, it, expect } from 'vitest';
import { TemplateRenderer } from './template-renderer.ts';
import { InMemoryEmailService } from './in-memory-email.service.ts';

describe('Email templates', () => {
  it('renders the welcome subject, HTML and text', () => {
    const renderer = new TemplateRenderer();

    const result = renderer.render('welcome', {
      name: 'Tai',
      appUrl: 'http://localhost:3000',
    });

    expect(result.subject).toBe('Welcome Tai to HiveShelf');
    expect(result.html).toContain('Hi Tai!');
    expect(result.html).toMatch(/\bhref=(['"])http:\/\/localhost:3000\1/);
    expect(result.text).toContain('Hi Tai!');
    expect(result.text).toContain('http://localhost:3000');
  });

  it('escapes HTML while preserving subject and plain text', () => {
    const renderer = new TemplateRenderer();
    const name = '<b>Tai & friend</b>';

    const result = renderer.render('welcome', {
      name,
      appUrl: 'http://localhost:3000',
    });

    expect(result.html).toContain('&lt;b&gt;Tai &amp; friend&lt;/b&gt;');
    expect(result.html).not.toContain(name);
    expect(result.subject).toContain(name);
    expect(result.text).toContain(name);
  });
});

describe('InMemoryEmailService', () => {
  it('records rendered email and clears the outbox', async () => {
    const email = new InMemoryEmailService(new TemplateRenderer());

    await email.send({
      template: 'welcome',
      to: ['reader@example.com'],
      data: {
        name: 'Reader',
        appUrl: 'http://localhost:3000',
      },
    });

    expect(email.outbox).toHaveLength(1);
    expect(email.outbox[0]).toMatchObject({
      to: ['reader@example.com'],
      subject: 'Welcome Reader to HiveShelf',
    });
    expect(email.outbox[0]?.html).toContain('Hi Reader!');
    expect(email.outbox[0]?.text).toContain('Hi Reader!');

    email.clear();

    expect(email.outbox).toHaveLength(0);
  });
});
