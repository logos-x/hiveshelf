import './load-env.ts';
import { PrismaClient } from '../src/generated/prisma/client.ts';
import { PrismaPg } from '@prisma/adapter-pg';
import {
  CHAPTER_CONTENT_FORMAT_VERSION,
  createChapterVersion,
} from '../src/common/content/chapter-version.writer.ts';
import { createHash } from 'node:crypto';
import { sanitizeChapterHtml } from '../src/common/content/sanitize-chapter-html.ts';

async function main(): Promise<void> {
  const args = process.argv.slice(2);

  if (args.some((arg) => arg !== '--apply'))
    throw new Error('Unsupported argument');

  const apply = args.includes('--apply');
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) throw new Error('DATABASE_URL is required');

  const prisma = new PrismaClient({
    adapter: new PrismaPg({
      connectionString,
      connectionTimeoutMillis: 3000,
    }),
  });

  try {
    const report = await prisma.$transaction(
      async (tx) => {
        const chapters = await tx.chapter.findMany({
          where: {
            publishedVersionId: { not: null },
          },
          orderBy: { id: 'asc' },
          select: {
            id: true,
            editionId: true,
            publishedVersion: {
              select: {
                id: true,
                title: true,
                contentHtml: true,
                contentHash: true,
                contentFormatVersion: true,
                editionSourceId: true,
              },
            },
          },
        });

        const changes: {
          chapterId: string;
          fromVersionId: string;
          toVersionId: string | null;
          htmlWouldChange: boolean;
        }[] = [];

        for (const chapter of chapters) {
          const current = chapter.publishedVersion;

          if (current === null) throw new Error('Published version is missing');

          if (
            ![1, CHAPTER_CONTENT_FORMAT_VERSION].includes(
              current.contentFormatVersion,
            )
          )
            throw new Error('Unsupported content format version');

          const storedHash = createHash('sha256')
            .update(current.contentHtml, 'utf8')
            .digest('hex');

          if (storedHash !== current.contentHash)
            throw new Error('Stored content hash mismatch');

          const sanitizedHtml = sanitizeChapterHtml(current.contentHtml);
          const htmlWouldChange = sanitizedHtml !== current.contentHtml;

          if (
            !htmlWouldChange &&
            current.contentFormatVersion === CHAPTER_CONTENT_FORMAT_VERSION
          )
            continue;

          let toVersionId: string | null = null;

          if (apply) {
            const latest = await tx.chapterVersion.aggregate({
              where: { chapterId: chapter.id },
              _max: { versionNumber: true },
            });

            const nextVersion = await createChapterVersion(tx, {
              chapterId: chapter.id,
              editionId: chapter.editionId,
              versionNumber: (latest._max.versionNumber ?? 0) + 1,
              title: current.title,
              html: current.contentHtml,
              editionSourceId: current.editionSourceId,
            });

            const updated = await tx.chapter.updateMany({
              where: {
                id: chapter.id,
                publishedVersionId: current.id,
              },
              data: {
                publishedVersionId: nextVersion.id,
              },
            });

            if (updated.count !== 1)
              throw new Error('Published pointer changed during migration');

            toVersionId = nextVersion.id;
          }

          changes.push({
            chapterId: chapter.id,
            fromVersionId: current.id,
            toVersionId,
            htmlWouldChange,
          });
        }

        return {
          scannedPublishedChapters: chapters.length,
          changes,
        };
      },
      {
        isolationLevel: 'Serializable',
        maxWait: 5000,
        timeout: 30000,
      },
    );

    for (const change of report.changes) console.log(JSON.stringify(change));

    console.log(
      JSON.stringify({
        type: 'summary',
        mode: apply ? 'apply' : 'dry-run',
        scannedPublishedChapters: report.scannedPublishedChapters,
        candidates: report.changes.length,
        migrated: apply ? report.changes.length : 0,
      }),
    );
  } finally {
    await prisma.$disconnect();
  }
}

void main().catch(() => {
  console.error(
    'Content migration failed and its transaction was rolled back. ' +
      'Check database connectivity, stored hashes, format versions and concurrent writes.',
  );
  process.exitCode = 1;
});
