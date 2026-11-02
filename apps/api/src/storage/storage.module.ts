import { Global, Module } from '@nestjs/common';
import { AppConfigModule } from '../config/app-config.module.ts';
import { STORAGE_SERVICE, StorageService } from './storage.service.ts';
import { ConfigService } from '@nestjs/config';
import { Env } from '../config/env.schema.ts';
import { InMemoryStorageService } from './in-memory-storage.service.ts';
import { S3StorageService } from './s3-storage.service.ts';

@Global()
@Module({
  imports: [AppConfigModule],
  providers: [
    {
      provide: STORAGE_SERVICE,
      inject: [ConfigService],
      useFactory: (config: ConfigService<Env, true>): StorageService => {
        const driver = config.get('STORAGE_DRIVER', { infer: true });

        switch (driver) {
          case 'memory':
            return new InMemoryStorageService();

          case 's3': {
            const bucket = config.get('S3_BUCKET', { infer: true });
            const accessKeyId = config.get('S3_ACCESS_KEY', { infer: true });
            const secretAccessKey = config.get('S3_SECRET_KEY', {
              infer: true,
            });

            if (!bucket || !accessKeyId || !secretAccessKey) {
              throw new Error('S3 storage configuration is incomplete');
            }

            return new S3StorageService({
              endpoint: config.get('S3_ENDPOINT', { infer: true }),
              region: config.get('S3_REGION', { infer: true }),
              bucket,
              accessKeyId,
              secretAccessKey,
              forcePathStyle: config.get('S3_FORCE_PATH_STYLE', {
                infer: true,
              }),
            });
          }

          default:
            throw new Error(`Unsupported storage driver: ${String(driver)}`);
        }
      },
    },
  ],
  exports: [STORAGE_SERVICE],
})
export class StorageModule {}
