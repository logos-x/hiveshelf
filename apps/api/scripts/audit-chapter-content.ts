import './load-env.ts';
import { createHash } from 'node:crypto';
import { PrismaClient } from '../src/generated/prisma/client.ts';
import { PrismaPg } from '@prisma/adapter-pg';
import { sanitizeChapterHtml } from '../src/common/content/sanitize-chapter-html.ts';
import { CHAPTER_CONTENT_FORMAT_VERSION } from '../src/common/content/chapter-version.writer.ts';

function hasHtml(html: string): string {
  return createHash('sha256').update(html, 'utf8').digest('hex');
}

async function main(): Promise<void> {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) throw new Error('DATABASE_URL is required');

  const prisma = new PrismaClient({
    adapter: new PrismaPg({
      connectionString,
      connectionTimeoutMillis: 3000,
    }),
  });

  const summary = {
    scannedVersions: 0,
    versionsNeedingReview: 0,
    publishedPointers: 0,
    publishedVersionsNeedingReview: 0,
    htmlWouldChange: 0,
    storedHashMismatch: 0,
    formatVersionMismatch: 0,
  };

  let cursor: string | undefined;

  try {
    while (true) {
      const versions = await prisma.chapterVersion.findMany({
        take: 100,
        orderBy: { id: 'asc' },
        ...(cursor === undefined
          ? {}
          : {
              cursor: { id: cursor },
              skip: 1,
            }),
        select: {
          id: true,
          chapterId: true,
          versionNumber: true,
          contentHtml: true,
          contentHash: true,
          contentFormatVersion: true,
          publishedFor: {
            select: { id: true },
          },
        },
      });

      if (versions.length === 0) break;

      for (const version of versions) {
        summary.scannedVersions += 1;

        const hasPublishedPointer = version.publishedFor !== null;

        if (hasPublishedPointer) summary.publishedPointers += 1;

        const sanitizedHtml = sanitizeChapterHtml(version.contentHtml);

        const htmlWouldChange = sanitizedHtml !== version.contentHtml;
        const storedHashMismatch =
          hasHtml(version.contentHtml) != version.contentHash;
        const formatVersionMismatch =
          version.contentFormatVersion !== CHAPTER_CONTENT_FORMAT_VERSION;

        if (htmlWouldChange) summary.htmlWouldChange += 1;
        if (storedHashMismatch) summary.storedHashMismatch += 1;
        if (formatVersionMismatch) summary.formatVersionMismatch += 1;

        if (!htmlWouldChange && !storedHashMismatch && !formatVersionMismatch)
          continue;

        summary.versionsNeedingReview += 1;

        if (hasPublishedPointer) summary.publishedVersionsNeedingReview += 1;

        console.log(
          JSON.stringify({
            chapterVersionId: version.id,
            chapterId: version.chapterId,
            versionNumber: version.versionNumber,
            contentFormatVersion: version.contentFormatVersion,
            hasPublishedPointer,
            htmlWouldChange,
            storedHashMismatch,
            formatVersionMismatch,
          }),
        );
      }

      const lastVersion = versions[versions.length - 1];

      if (lastVersion === undefined) break;

      cursor = lastVersion.id;
    }

    console.log(
      JSON.stringify({
        type: 'summary',
        ...summary,
      }),
    );

    if (summary.publishedVersionsNeedingReview > 0) process.exitCode = 2;
  } finally {
    await prisma.$disconnect();
  }
}

void main().catch(() => {
  console.error(
    'Chapter content audit failed; check database connectivity and schema.',
  );
  process.exitCode = 1;
});
