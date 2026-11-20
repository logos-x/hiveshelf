import '../scripts/load-env.js';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client.js';
import { normalizeLanguageTag } from '../src/common/utils/language-tag.ts';
import { createHash } from 'node:crypto';
import {
  sampleCover,
  sampleCoverChecksum,
  sampleCoverMimeType,
} from './fixtures/sample-cover.ts';

const genres = [
  { slug: 'fiction', name: 'Fiction' },
  { slug: 'short-story', name: 'Short story' },
];

const tags = [
  { slug: 'sample', name: 'Sample' },
  { slug: 'original-content', name: 'Original content' },
];

const books = [
  {
    sourceId: '3b560c41-7759-4b28-9c06-92fe9d758b30',
    workSlug: 'ngon-den-ben-cua-so',
    originalTitle: 'Ngọn đèn bên cửa sổ',
    editionSlug: 'ngon-den-ben-cua-so-vi',
    languageTag: 'vi',
    title: 'Ngọn đèn bên cửa sổ',
    description: 'Truyện ngắn mẫu do dự án tự viết để kiểm thử trình đọc.',
    chapters: [
      {
        position: 1,
        slug: 'anh-den',
        title: 'Ánh đèn',
        html: '<p id="p-1">Chiều xuống, An thắp ngọn đèn bên cửa sổ.</p>',
      },
      {
        position: 2,
        slug: 'nguoi-khach',
        title: 'Người khách',
        html: '<p id="p-1">Một người khách dừng chân trước ngôi nhà nhỏ.</p>',
      },
      {
        position: 3,
        slug: 'binh-minh',
        title: 'Bình minh',
        html: '<p id="p-1">Sáng hôm sau, An mở cửa đón những tia nắng đầu ngày.</p>',
      },
    ],
    coverId: 'a6fba639-7976-4837-b23c-b62716502375',
  },
  {
    sourceId: 'd4684b0c-2bdd-48b2-997c-c385069bb76f',
    workSlug: 'the-small-garden',
    originalTitle: 'The Small Garden',
    editionSlug: 'the-small-garden-en',
    languageTag: 'en',
    title: 'The Small Garden',
    description: 'An original sample story for testing the reader.',
    chapters: [
      {
        position: 1,
        slug: 'the-seed',
        title: 'The Seed',
        html: '<p id="p-1">Mia planted a seed beside the kitchen window.</p>',
      },
      {
        position: 2,
        slug: 'the-rain',
        title: 'The Rain',
        html: '<p id="p-1">Rain arrived overnight and softened the garden soil.</p>',
      },
      {
        position: 3,
        slug: 'the-first-leaf',
        title: 'The First Leaf',
        html: '<p id="p-1">A small green leaf appeared in the morning light.</p>',
      },
    ],
    coverId: 'fd24602a-f76a-4692-8e52-5f9afcfc63b7',
  },
];

async function main(): Promise<void> {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error('DATABASE_URL is required.');
  }

  const url = new URL(connectionString);

  if (!['postgres:', 'postgresql:'].includes(url.protocol)) {
    throw new Error('DATABASE_URL must use PostgreSQL.');
  }

  const adapter = new PrismaPg({
    connectionString,
    connectionTimeoutMillis: 3000,
  });

  const prisma = new PrismaClient({ adapter });

  try {
    await prisma.systemInfo.upsert({
      where: { key: 'bootstrap' },
      update: {},
      create: {
        key: 'bootstrap',
        value: 'initialized',
      },
    });

    for (const genre of genres) {
      await prisma.genre.upsert({
        where: { slug: genre.slug },
        update: {},
        create: genre,
      });
    }

    for (const tag of tags) {
      await prisma.tag.upsert({
        where: { slug: tag.slug },
        update: {},
        create: tag,
      });
    }

    for (const book of books) {
      const languageTag = normalizeLanguageTag(book.languageTag);

      await prisma.$transaction(async (tx) => {
        const work = await tx.work.upsert({
          where: { slug: book.workSlug },
          update: {},
          create: {
            slug: book.workSlug,
            originalTitle: book.originalTitle,
          },
        });

        const edition = await tx.edition.upsert({
          where: { workId: work.id },
          update: {},
          create: {
            workId: work.id,
            slug: book.editionSlug,
            languageTag,
            title: book.title,
            description: book.description,
          },
        });

        const cover = await tx.mediaAsset.upsert({
          where: { id: book.coverId },
          update: {},
          create: {
            id: book.coverId,
            objectKey: `covers/${edition.id}/${book.coverId}.png`,
            kind: 'COVER',
            mimeType: sampleCoverMimeType,
            byteSize: BigInt(sampleCover.length),
            checksumSha256: sampleCoverChecksum,
            status: 'PENDING',
          },
        });

        await tx.mediaAsset.updateMany({
          where: {
            id: book.coverId,
            status: 'PENDING',
          },
          data: {
            mimeType: sampleCoverMimeType,
            byteSize: BigInt(sampleCover.length),
            checksumSha256: sampleCoverChecksum,
          },
        });

        if (edition.status === 'DRAFT' && edition.publishedAt === null) {
          await tx.edition.updateMany({
            where: {
              id: edition.id,
              coverAssetId: null,
            },
            data: {
              coverAssetId: cover.id,
            },
          });
        }

        await tx.editionSource.upsert({
          where: { id: book.sourceId },
          update: {},
          create: {
            id: book.sourceId,
            editionId: edition.id,
            sourceType: 'ADMIN_ENTRY',
            citation: `Original development fixture: ${book.title}`,
            rightsBasis: 'PERMISSION',
            rightsStatement:
              'Nội dung mẫu do dự án tự tạo và cho phép dùng để phát triển, ' +
              'kiểm thử HiveShelf. Không đại diện cho căn cứ sử dụng sách bên ngoài.',
          },
        });

        for (const chapterData of book.chapters) {
          const chapter = await tx.chapter.upsert({
            where: {
              editionId_position: {
                editionId: edition.id,
                position: chapterData.position,
              },
            },
            update: {},
            create: {
              editionId: edition.id,
              position: chapterData.position,
              slug: chapterData.slug,
            },
          });

          const contentHash = createHash('sha256')
            .update(chapterData.html, 'utf8')
            .digest('hex');

          const version = await tx.chapterVersion.upsert({
            where: {
              chapterId_versionNumber: {
                chapterId: chapter.id,
                versionNumber: 1,
              },
            },
            update: {},
            create: {
              chapterId: chapter.id,
              editionId: edition.id,
              versionNumber: 1,
              title: chapterData.title,
              contentHtml: chapterData.html,
              contentFormatVersion: 1,
              editionSourceId: book.sourceId,
              contentHash,
            },
          });

          if (edition.status === 'DRAFT' && edition.publishedAt === null) {
            await tx.chapter.updateMany({
              where: {
                id: chapter.id,
                publishedVersionId: null,
              },
              data: {
                publishedVersionId: version.id,
              },
            });
          }
        }

        for (const genre of genres) {
          const existingGenre = await tx.genre.findUniqueOrThrow({
            where: { slug: genre.slug },
          });

          await tx.workGenre.upsert({
            where: {
              workId_genreId: {
                workId: work.id,
                genreId: existingGenre.id,
              },
            },
            update: {},
            create: {
              workId: work.id,
              genreId: existingGenre.id,
            },
          });
        }

        for (const tag of tags) {
          const existingTag = await tx.tag.findUniqueOrThrow({
            where: { slug: tag.slug },
          });

          await tx.workTag.upsert({
            where: {
              workId_tagId: {
                workId: work.id,
                tagId: existingTag.id,
              },
            },
            update: {},
            create: {
              workId: work.id,
              tagId: existingTag.id,
            },
          });
        }
      });
    }

    console.log(
      'Seed completed: bootstrap, genres, tags and sample books are present.',
    );
  } finally {
    await prisma.$disconnect();
  }
}

void main().catch(() => {
  console.error('Seed failed. Check database connectivity and migrations.');
  process.exitCode = 1;
});
