import { sanitizeChapterHtml } from './sanitize-chapter-html.ts';
import { createHash } from 'node:crypto';
import { Prisma } from '../../generated/prisma/client.ts';

export const CHAPTER_CONTENT_FORMAT_VERSION = 2;

export interface CreateChapterVersionInput {
  chapterId: string;
  editionId: string;
  versionNumber: number;
  title: string;
  html: string;
  editionSourceId: string;
}

type ChapterVersionWriterClient = {
  chapterVersion: Pick<Prisma.TransactionClient['chapterVersion'], 'create'>;
};

/**
 * Create snapshot Chapter after sanitize
 *
 * Receive Prisma client or transaction client to caller
 * can create version and update published pointer in one transaction
 */
export async function createChapterVersion(
  client: ChapterVersionWriterClient,
  input: CreateChapterVersionInput,
) {
  const contentHtml = sanitizeChapterHtml(input.html);

  const contentHash = createHash('sha256')
    .update(contentHtml, 'utf8')
    .digest('hex');

  return client.chapterVersion.create({
    data: {
      chapterId: input.chapterId,
      editionId: input.editionId,
      versionNumber: input.versionNumber,
      title: input.title,
      editionSourceId: input.editionSourceId,
      contentHtml,
      contentHash,
      contentFormatVersion: CHAPTER_CONTENT_FORMAT_VERSION,
    },
  });
}
