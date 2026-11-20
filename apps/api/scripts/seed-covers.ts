import 'reflect-metadata';
import './load-env.ts';
import assert from 'node:assert/strict';
import { PrismaClient } from '../src/generated/prisma/client.ts';
import { PrismaPg } from '@prisma/adapter-pg';
import { NestFactory } from '@nestjs/core';
import { StorageModule } from '../src/storage/storage.module.ts';
import {
  STORAGE_SERVICE,
  StorageService,
} from '../src/storage/storage.service.ts';
import { S3StorageService } from '../src/storage/s3-storage.service.ts';
import {
  sampleCover,
  sampleCoverChecksum,
  sampleCoverMimeType,
} from '../prisma/fixtures/sample-cover.ts';
import { buffer } from 'node:stream/consumers';

const coverIds = [
  'a6fba639-7976-4837-b23c-b62716502375',
  'fd24602a-f76a-4692-8e52-5f9afcfc63b7',
];

async function main(): Promise<void> {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Seed covers cannot run in production');
  }

  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error('DATABASE_URL is required');
  }

  const prisma = new PrismaClient({
    adapter: new PrismaPg({
      connectionString,
      connectionTimeoutMillis: 3000,
    }),
  });

  try {
    const app = await NestFactory.createApplicationContext(StorageModule, {
      logger: false,
      abortOnError: false,
    });

    try {
      const storage = app.get<StorageService>(STORAGE_SERVICE);

      assert.ok(
        storage instanceof S3StorageService,
        'Seed covers requires STORAGE_DRIVER=s3',
      );

      for (const id of coverIds) {
        const asset = await prisma.mediaAsset.findUniqueOrThrow({
          where: { id },
        });

        assert.ok(
          asset.status === 'PENDING' || asset.status === 'READY',
          `Unexpected asset status: ${id}`,
        );
        assert.equal(asset.kind, 'COVER');
        assert.equal(asset.mimeType, sampleCoverMimeType);
        assert.equal(asset.byteSize, BigInt(sampleCover.length));
        assert.equal(asset.checksumSha256, sampleCoverChecksum);

        const exists = await storage.exists(asset.objectKey);

        if (!exists) {
          assert.equal(
            asset.status,
            'PENDING',
            `READY asset is missing from storage: ${id}`,
          );

          await storage.put(asset.objectKey, sampleCover, sampleCoverMimeType);
        }

        const stored = await storage.get(asset.objectKey);
        const storedBytes = await buffer(stored.body);

        assert.equal(stored.contentType, sampleCoverMimeType);
        assert.ok(
          storedBytes.equals(sampleCover),
          `Stored bytes differ from fixture: ${id}`,
        );

        if (asset.status === 'PENDING') {
          const result = await prisma.mediaAsset.updateMany({
            where: {
              id,
              status: 'PENDING',
              objectKey: asset.objectKey,
              mimeType: sampleCoverMimeType,
              byteSize: BigInt(sampleCover.length),
              checksumSha256: sampleCoverChecksum,
            },
            data: { status: 'READY' },
          });

          assert.equal(
            result.count,
            1,
            `Asset changed during upload; rerun the script: ${id}`,
          );
        }

        console.log(`Cover verified and READY: ${id}`);
      }

      if (process.argv.includes('--publish')) {
        const result = await prisma.edition.updateMany({
          where: {
            slug: {
              in: ['ngon-den-ben-cua-so-vi', 'the-small-garden-en'],
            },
            status: 'DRAFT',
            publishedAt: null,
            coverAssetId: { in: coverIds },
            coverAsset: { is: { kind: 'COVER', status: 'READY' } },
            work: { is: { accessStatus: 'AVAILABLE' } },
            chapters: {
              some: { publishedVersionId: { not: null } },
            },
          },
          data: {
            status: 'PUBLISHED',
            publishedAt: new Date(),
          },
        });

        console.log(`Sample editions published: ${result.count}`);
      }
    } finally {
      await app.close();
    }
  } finally {
    await prisma.$disconnect();
  }
}

void main().catch(() => {
  console.error(
    'Cover seed failed; check database, storage and fixture metadata.',
  );
  process.exitCode = 1;
});
