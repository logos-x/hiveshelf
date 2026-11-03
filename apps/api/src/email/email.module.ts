import { Global, Module } from '@nestjs/common';
import { AppConfigModule } from '../config/app-config.module.ts';
import { TemplateRenderer } from './template-renderer.ts';
import { EMAIL_SERVICE, EmailService } from './email.service.ts';
import { ConfigService } from '@nestjs/config';
import { Env } from '../config/env.schema.ts';
import { InMemoryEmailService } from './in-memory-email.service.ts';
import { SmtpEmailService } from './smtp-email.service.ts';

@Global()
@Module({
  imports: [AppConfigModule],
  providers: [
    {
      provide: TemplateRenderer,
      useFactory: () => new TemplateRenderer(),
    },
    {
      provide: EMAIL_SERVICE,
      inject: [ConfigService, TemplateRenderer],
      useFactory: (
        config: ConfigService<Env, true>,
        renderer: TemplateRenderer,
      ): EmailService => {
        const driver = config.get('EMAIL_DRIVER', { infer: true });

        switch (driver) {
          case 'memory':
            return new InMemoryEmailService(renderer);

          case 'smtp': {
            const host = config.get('SMTP_HOST', { infer: true });
            const from = config.get('MAIL_FROM', { infer: true });

            if (!host || !from) {
              throw new Error('SMTP email configuration is incomplete');
            }

            return new SmtpEmailService(
              {
                host,
                port: config.get('SMTP_PORT', { infer: true }),
                from,
              },
              renderer,
            );
          }

          default:
            throw new Error(`Unsupported email driver: ${String(driver)}`);
        }
      },
    },
  ],
  exports: [EMAIL_SERVICE],
})
export class EmailModule {}
