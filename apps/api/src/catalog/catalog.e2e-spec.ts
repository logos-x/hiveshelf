import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { AppModule } from '../app.module.ts';
import request from 'supertest';
import {
  apiErrorSchema,
  BookDetailSchema,
  BookListResponseSchema,
  ChapterContentSchema,
  ERROR_CODES,
} from '@hiveshelf/shared';
import { PrismaService } from '../prisma/prisma.service.ts';
import { createHash, randomUUID } from 'node:crypto';
import {
  CHAPTER_CONTENT_FORMAT_VERSION,
  createChapterVersion,
} from '../common/content/chapter-version.writer.ts';
import { sanitizeChapterHtml } from '../common/content/sanitize-chapter-html.ts';

describe('API books (e2e)', () => {
  let app: INestApplication | undefined;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app?.close();
  });

  it('GET /books without query', async () => {
    const response = await request(app!.getHttpServer())
      .get('/books')
      .expect(200);

    const result = BookListResponseSchema.parse(response.body);
    expect(result.items).toEqual([]);
    expect(result.pagination).toEqual({
      page: 1,
      pageSize: 20,
      total: 0,
      totalPages: 0,
    });
  });

  it('GET /books/:slug returns 404 for a draft edition', async () => {
    const slug = 'the-small-garden';
    const prisma = app!.get(PrismaService);
    const work = await prisma.work.findUniqueOrThrow({
      where: { slug },
      select: { edition: { select: { status: true } } },
    });
    expect(work.edition?.status).toBe('DRAFT');

    const response = await request(app!.getHttpServer())
      .get(`/books/${slug}`)
      .expect(404);

    const result = apiErrorSchema.parse(response.body);

    expect(result).toMatchObject({
      statusCode: 404,
      code: ERROR_CODES.NOT_FOUND,
    });
  });

  it('GET /books/:slug/chapters/:order returns 400 for order value is 0', async () => {
    const slug = 'the-small-garden';

    const response = await request(app!.getHttpServer())
      .get(`/books/${slug}/chapters/0`)
      .expect(400);

    const result = apiErrorSchema.parse(response.body);

    expect(result).toMatchObject({
      statusCode: 400,
      code: ERROR_CODES.VALIDATION_ERROR,
    });

    expect(result.details).toEqual(
      expect.arrayContaining([expect.objectContaining({ field: 'order' })]),
    );
  });

  it('GET /books/:slug/chapters/:order returns 200', async () => {
    const slug = 'the-small-garden';
    const prisma = app!.get(PrismaService);
    const edition = await prisma.edition.findFirstOrThrow({
      where: { work: { slug } },
      select: {
        id: true,
        status: true,
        publishedAt: true,
        chapters: {
          where: { position: 1 },
          select: {
            publishedVersion: { select: { id: true, contentHtml: true } },
          },
        },
      },
    });

    const version = edition.chapters[0]?.publishedVersion;
    if (!version) {
      throw new Error('Seed must provide a published version for chapter 1');
    }

    await prisma.edition.update({
      where: { id: edition.id },
      data: { status: 'PUBLISHED', publishedAt: new Date() },
    });

    try {
      const response = await request(app!.getHttpServer())
        .get(`/books/${slug}/chapters/1`)
        .expect(200);

      const result = ChapterContentSchema.parse(response.body);
      expect(result).toMatchObject({
        order: 1,
        title: 'The Seed',
        chapterVersionId: version.id,
        html: version.contentHtml,
      });
    } finally {
      await prisma.edition.update({
        where: { id: edition.id },
        data: { status: edition.status, publishedAt: edition.publishedAt },
      });
    }
  });

  it('returns the published version even when a newer draft exists', async () => {
    const slug = 'the-small-garden';
    const prisma = app!.get(PrismaService);
    const edition = await prisma.edition.findFirstOrThrow({
      where: { work: { slug } },
      select: {
        id: true,
        status: true,
        publishedAt: true,
        chapters: {
          where: { position: 1 },
          select: {
            id: true,
            publishedVersion: {
              select: {
                id: true,
                versionNumber: true,
                editionSourceId: true,
                contentHtml: true,
              },
            },
          },
        },
      },
    });

    const chapter = edition.chapters[0];
    const publishedVersion = chapter?.publishedVersion;

    if (!chapter || !publishedVersion) {
      throw new Error('Seed must provide a published version for chapter 1');
    }

    let draftId: string | undefined;

    await prisma.edition.update({
      where: { id: edition.id },
      data: { status: 'PUBLISHED', publishedAt: new Date() },
    });

    try {
      const draftHtml =
        '<p onclick="alert(1)">This is a newer draft.</p>' +
        '<script>alert(1)</script>';

      const draft = await createChapterVersion(prisma, {
        chapterId: chapter.id,
        editionId: edition.id,
        editionSourceId: publishedVersion.editionSourceId,
        versionNumber: publishedVersion.versionNumber + 1,
        title: 'A newer draft title',
        html: draftHtml,
      });

      draftId = draft.id;
      const storedDraft = await prisma.chapterVersion.findUniqueOrThrow({
        where: { id: draft.id },
      });

      const expectedDraftHtml = '<p id="p-1">This is a newer draft.</p>';

      expect(storedDraft.contentHtml).toBe(expectedDraftHtml);

      expect(storedDraft.contentFormatVersion).toBe(
        CHAPTER_CONTENT_FORMAT_VERSION,
      );

      expect(storedDraft.contentHash).toBe(
        createHash('sha256').update(expectedDraftHtml, 'utf8').digest('hex'),
      );

      const response = await request(app!.getHttpServer())
        .get(`/books/${slug}/chapters/1`)
        .expect(200);

      const result = ChapterContentSchema.parse(response.body);
      expect(result).toMatchObject({
        order: 1,
        chapterVersionId: publishedVersion.id,
        title: 'The Seed',
        html: publishedVersion.contentHtml,
      });
    } finally {
      try {
        if (draftId) {
          await prisma.chapterVersion.delete({ where: { id: draftId } });
        }
      } finally {
        await prisma.edition.update({
          where: { id: edition.id },
          data: {
            status: edition.status,
            publishedAt: edition.publishedAt,
          },
        });
      }
    }
  });

  it('stores sanitized chapter HTML and returns that exact published content', async () => {
    const slug = 'the-small-garden';
    const prisma = app!.get(PrismaService);

    const edition = await prisma.edition.findFirstOrThrow({
      where: { work: { slug } },
      select: {
        id: true,
        status: true,
        publishedAt: true,
        chapters: {
          where: { position: 1 },
          select: {
            id: true,
            position: true,
            publishedVersionId: true,
            publishedVersion: {
              select: {
                id: true,
                contentHtml: true,
                contentHash: true,
                editionSourceId: true,
              },
            },
          },
        },
      },
    });

    const chapter = edition.chapters[0];
    const originalVersion = chapter?.publishedVersion;

    if (!chapter || !originalVersion || !chapter.publishedVersionId) {
      throw new Error('Seed must provide a published version for chapter 1');
    }

    const latestVersion = await prisma.chapterVersion.aggregate({
      where: { chapterId: chapter.id },
      _max: { versionNumber: true },
    });

    const inputHtml =
      '<h2>Chương thử nghiệm</h2>' +
      '<p id="attacker" onclick="alert(1)">Xin chào <strong>bạn</strong>.</p>' +
      '<script>alert(document.cookie)</script>' +
      '<svg onload="alert(1)"><circle /></svg>' +
      '<img src="https://evil.example/tracking.png" alt="test">' +
      '<iframe src="https://evil.example"></iframe>' +
      '<style>body { background: red; }</style>' +
      '<form action="https://evil.example"><input name="secret"></form>' +
      '<p style="color:red">' +
      '<a href="javascript:alert(1)">Liên kết nguy hiểm</a> ' +
      '<a href="https://example.com/book" rel="opener" target="_blank">' +
      'Nguồn hợp lệ</a></p>';

    const expectedHtml =
      '<h2>Chương thử nghiệm</h2>' +
      '<p id="p-1">Xin chào <strong>bạn</strong>.</p>' +
      '<p id="p-2">' +
      '<a>Liên kết nguy hiểm</a> ' +
      '<a href="https://example.com/book" ' +
      'rel="noopener noreferrer nofollow">Nguồn hợp lệ</a></p>';

    const expectedHash = createHash('sha256')
      .update(expectedHtml, 'utf8')
      .digest('hex');

    let createdVersionId: string | undefined;

    try {
      const createdVersion = await prisma.$transaction(async (tx) => {
        const version = await createChapterVersion(tx, {
          chapterId: chapter.id,
          editionId: edition.id,
          versionNumber: (latestVersion._max.versionNumber ?? 0) + 1,
          title: 'Sanitized published chapter',
          html: inputHtml,
          editionSourceId: originalVersion.editionSourceId,
        });

        await tx.chapter.update({
          where: { id: chapter.id },
          data: { publishedVersionId: version.id },
        });

        await tx.edition.update({
          where: { id: edition.id },
          data: {
            status: 'PUBLISHED',
            publishedAt: new Date(),
          },
        });

        return version;
      });

      createdVersionId = createdVersion.id;

      const storedVersion = await prisma.chapterVersion.findUniqueOrThrow({
        where: { id: createdVersionId },
      });

      expect(storedVersion).toMatchObject({
        contentHtml: expectedHtml,
        contentHash: expectedHash,
        contentFormatVersion: CHAPTER_CONTENT_FORMAT_VERSION,
      });

      const response = await request(app!.getHttpServer())
        .get(`/books/${slug}/chapters/${chapter.position}`)
        .expect(200);

      const result = ChapterContentSchema.parse(response.body);

      expect(result).toMatchObject({
        editionId: edition.id,
        chapterId: chapter.id,
        chapterVersionId: createdVersionId,
        order: chapter.position,
        title: 'Sanitized published chapter',
        contentFormatVersion: CHAPTER_CONTENT_FORMAT_VERSION,
      });

      expect(result.html).toBe(expectedHtml);
      expect(result.html).toBe(storedVersion.contentHtml);

      const unchangedOriginal = await prisma.chapterVersion.findUniqueOrThrow({
        where: { id: originalVersion.id },
      });

      expect(unchangedOriginal.contentHtml).toBe(originalVersion.contentHtml);
      expect(unchangedOriginal.contentHash).toBe(originalVersion.contentHash);
    } finally {
      if (createdVersionId !== undefined) {
        const versionIdToDelete = createdVersionId;

        await prisma.$transaction(async (tx) => {
          await tx.chapter.update({
            where: { id: chapter.id },
            data: {
              publishedVersionId: chapter.publishedVersionId,
            },
          });

          await tx.edition.update({
            where: { id: edition.id },
            data: {
              status: edition.status,
              publishedAt: edition.publishedAt,
            },
          });

          await tx.chapterVersion.delete({
            where: { id: versionIdToDelete },
          });
        });
      }
    }
  });

  it('both edition have same published date', async () => {
    const prisma = app!.get(PrismaService);
    const editions = await prisma.edition.findMany({
      where: {
        slug: { in: ['ngon-den-ben-cua-so-vi', 'the-small-garden-en'] },
      },
      select: {
        id: true,
        status: true,
        publishedAt: true,
      },
    });

    expect(editions).toHaveLength(2);

    const publishedAt = new Date();
    try {
      await prisma.edition.updateMany({
        where: { id: { in: editions.map(({ id }) => id) } },
        data: {
          status: 'PUBLISHED',
          publishedAt: publishedAt,
        },
      });

      const response1 = await request(app!.getHttpServer())
        .get(`/books?page=1&pageSize=1`)
        .expect(200);

      const response2 = await request(app!.getHttpServer())
        .get(`/books?page=2&pageSize=1`)
        .expect(200);

      const result1 = BookListResponseSchema.parse(response1.body);
      const result2 = BookListResponseSchema.parse(response2.body);

      expect(result1.items).toHaveLength(1);
      expect(result1.pagination).toMatchObject({
        total: 2,
        totalPages: 2,
      });
      expect(result2.items).toHaveLength(1);
      expect(result2.pagination).toMatchObject({
        total: 2,
        totalPages: 2,
      });

      const expectedIds = editions
        .map(({ id }) => id)
        .sort()
        .reverse();

      const actualIds = [
        result1.items[0]?.editionId,
        result2.items[0]?.editionId,
      ];

      expect(actualIds).toEqual(expectedIds);
    } finally {
      await prisma.$transaction(
        editions.map(({ id, status, publishedAt }) =>
          prisma.edition.update({
            where: { id },
            data: { status, publishedAt },
          }),
        ),
      );
    }
  });

  it('hides a published edition from public endpoints when its work is blocked', async () => {
    const slug = 'the-small-garden';
    const prisma = app!.get(PrismaService);

    const work = await prisma.work.findUniqueOrThrow({
      where: { slug },
      select: {
        id: true,
        accessStatus: true,
        blockedAt: true,
        blockReason: true,
        edition: {
          select: {
            id: true,
            status: true,
            publishedAt: true,
          },
        },
      },
    });

    const edition = work.edition;
    if (!edition) {
      throw new Error('Not found edition in this work');
    }

    try {
      await prisma.edition.update({
        where: { id: edition.id },
        data: {
          status: 'PUBLISHED',
          publishedAt: new Date(),
        },
      });

      await request(app!.getHttpServer()).get(`/books/${slug}`).expect(200);

      await prisma.work.update({
        where: { id: work.id },
        data: {
          accessStatus: 'BLOCKED',
          blockedAt: new Date(),
          blockReason: 'Blocked for the catalog e2e test',
        },
      });

      const responseGetBooks = await request(app!.getHttpServer())
        .get(`/books`)
        .expect(200);
      const resultGetBooks = BookListResponseSchema.parse(
        responseGetBooks.body,
      );
      expect(resultGetBooks.items).toEqual([]);
      expect(resultGetBooks.pagination).toMatchObject({ total: 0 });

      const responseGetDetailBook = await request(app!.getHttpServer())
        .get(`/books/${slug}`)
        .expect(404);
      const resultGetDetailBook = apiErrorSchema.parse(
        responseGetDetailBook.body,
      );
      expect(resultGetDetailBook).toMatchObject({
        code: ERROR_CODES.NOT_FOUND,
      });

      const responseGetDetailChapter = await request(app!.getHttpServer())
        .get(`/books/${slug}/chapters/1`)
        .expect(404);
      const resultGetDetailChapter = apiErrorSchema.parse(
        responseGetDetailChapter.body,
      );
      expect(resultGetDetailChapter).toMatchObject({
        code: ERROR_CODES.NOT_FOUND,
      });
    } finally {
      await prisma.$transaction([
        prisma.work.update({
          where: { id: work.id },
          data: {
            accessStatus: work.accessStatus,
            blockedAt: work.blockedAt,
            blockReason: work.blockReason,
          },
        }),

        prisma.edition.update({
          where: { id: edition.id },
          data: {
            status: edition.status,
            publishedAt: edition.publishedAt,
          },
        }),
      ]);
    }
  });

  it('hides an archived edition with a publication date from public endpoints', async () => {
    const slug = 'the-small-garden';
    const prisma = app!.get(PrismaService);
    const edition = await prisma.edition.findFirstOrThrow({
      where: { work: { slug } },
      select: {
        id: true,
        status: true,
        publishedAt: true,
        work: {
          select: { accessStatus: true },
        },
        chapters: {
          where: { position: 1 },
          select: {
            publishedVersionId: true,
          },
        },
      },
    });

    expect(edition.work.accessStatus).toEqual('AVAILABLE');
    expect(edition.chapters[0]?.publishedVersionId).toBeTruthy();

    try {
      await prisma.edition.update({
        where: { id: edition.id },
        data: {
          status: 'ARCHIVED',
          publishedAt: new Date(),
        },
      });

      const responseGetBooks = await request(app!.getHttpServer())
        .get(`/books`)
        .expect(200);
      const books = BookListResponseSchema.parse(responseGetBooks.body);
      expect(books.items).toEqual([]);
      expect(books.pagination).toMatchObject({ total: 0 });

      const responseGetDetailBook = await request(app!.getHttpServer())
        .get(`/books/${slug}`)
        .expect(404);
      const detailBookError = apiErrorSchema.parse(responseGetDetailBook.body);
      expect(detailBookError.code).toEqual(ERROR_CODES.NOT_FOUND);

      const responseGetDetailChapter = await request(app!.getHttpServer())
        .get(`/books/${slug}/chapters/1`)
        .expect(404);
      const detailChapterError = apiErrorSchema.parse(
        responseGetDetailChapter.body,
      );
      expect(detailChapterError.code).toEqual(ERROR_CODES.NOT_FOUND);
    } finally {
      await prisma.edition.update({
        where: { id: edition.id },
        data: {
          status: edition.status,
          publishedAt: edition.publishedAt,
        },
      });
    }
  });

  it('hides an unpublished chapter from the table of contents and reader', async () => {
    const slug = 'the-small-garden';
    const prisma = app!.get(PrismaService);
    const edition = await prisma.edition.findFirstOrThrow({
      where: { work: { slug } },
      select: {
        id: true,
        status: true,
        publishedAt: true,
        chapters: {
          where: { position: 1 },
          select: {
            id: true,
            publishedVersionId: true,
          },
        },
      },
    });
    const chapter = edition.chapters[0];
    if (!chapter?.publishedVersionId) {
      throw new Error('Seed must provide a published version for chapter 1');
    }

    try {
      await prisma.$transaction([
        prisma.edition.update({
          where: { id: edition.id },
          data: {
            status: 'PUBLISHED',
            publishedAt: new Date(),
          },
        }),

        prisma.chapter.update({
          where: { id: chapter.id },
          data: {
            publishedVersionId: null,
          },
        }),
      ]);

      const detailResponse = await request(app!.getHttpServer())
        .get(`/books/${slug}`)
        .expect(200);
      const detail = BookDetailSchema.parse(detailResponse.body);
      expect(detail.chapters.map(({ order }) => order)).toEqual([2, 3]);

      const chapterResponse = await request(app!.getHttpServer())
        .get(`/books/${slug}/chapters/1`)
        .expect(404);
      const error = apiErrorSchema.parse(chapterResponse.body);
      expect(error.code).toEqual(ERROR_CODES.NOT_FOUND);
    } finally {
      await prisma.$transaction([
        prisma.chapter.update({
          where: { id: chapter.id },
          data: {
            publishedVersionId: chapter.publishedVersionId,
          },
        }),
        prisma.edition.update({
          where: { id: edition.id },
          data: {
            status: edition.status,
            publishedAt: edition.publishedAt,
          },
        }),
      ]);
    }
  });

  it('slug is unavailable', async () => {
    const slug = 'does-not-exist';
    const response = await request(app!.getHttpServer())
      .get(`/books/${slug}`)
      .expect(404);
    const result = apiErrorSchema.parse(response.body);
    expect(result.code).toEqual(ERROR_CODES.NOT_FOUND);
  });

  it('valid order but chapter not exists', async () => {
    const slug = 'the-small-garden';
    const prisma = app!.get(PrismaService);
    const edition = await prisma.edition.findFirstOrThrow({
      where: { work: { slug } },
      select: {
        id: true,
        status: true,
        publishedAt: true,
      },
    });

    try {
      await prisma.edition.update({
        where: { id: edition.id },
        data: {
          status: 'PUBLISHED',
          publishedAt: new Date(),
        },
      });

      const firstChapterResponse = await request(app!.getHttpServer())
        .get(`/books/${slug}/chapters/1`)
        .expect(200);
      const firstChapter = ChapterContentSchema.parse(
        firstChapterResponse.body,
      );
      expect(firstChapter).toBeTruthy();

      const lastChapterResponse = await request(app!.getHttpServer())
        .get(`/books/${slug}/chapters/999`)
        .expect(404);
      const lastChapter = apiErrorSchema.parse(lastChapterResponse.body);
      expect(lastChapter.code).toEqual(ERROR_CODES.NOT_FOUND);
    } finally {
      await prisma.edition.update({
        where: { id: edition.id },
        data: {
          status: edition.status,
          publishedAt: edition.publishedAt,
        },
      });
    }
  });

  it('pageSize limited', async () => {
    let response = await request(app!.getHttpServer())
      .get(`/books?pageSize=100`)
      .expect(200);
    const result = BookListResponseSchema.parse(response.body);
    expect(result.pagination.pageSize).toEqual(100);

    response = await request(app!.getHttpServer())
      .get(`/books?pageSize=101`)
      .expect(400);
    const error = apiErrorSchema.parse(response.body);
    expect(error.code).toEqual(ERROR_CODES.VALIDATION_ERROR);
    expect(error.details).toContainEqual(
      expect.objectContaining({ field: 'pageSize' }),
    );
  });

  it('rejects duplicate chapter positions within the same edition', async () => {
    const slug = 'the-small-garden-en';
    const prisma = app!.get(PrismaService);
    const edition = await prisma.edition.findUniqueOrThrow({
      where: { slug },
      select: {
        id: true,
        chapters: {
          where: { position: 1 },
        },
      },
    });

    expect(edition.chapters).toHaveLength(1);

    let createdChapterId: string | undefined;

    try {
      const createChapter = prisma.chapter
        .create({
          data: {
            editionId: edition.id,
            position: 1,
            slug: `duplicate-position-${randomUUID()}`,
          },
          select: { id: true },
        })
        .then((chapter) => {
          createdChapterId = chapter.id;
          return chapter;
        });

      await expect(createChapter).rejects.toMatchObject({ code: 'P2002' });
    } finally {
      if (createdChapterId) {
        await prisma.chapter.delete({ where: { id: createdChapterId } });
      }
    }
  });

  it('rejects create new chapter with position zero', async () => {
    const slug = 'the-small-garden-en';
    const prisma = app!.get(PrismaService);
    const edition = await prisma.edition.findUniqueOrThrow({
      where: { slug },
      select: {
        id: true,
      },
    });

    let createdChapterId: string | undefined;

    try {
      const createChapter = prisma.chapter
        .create({
          data: {
            editionId: edition.id,
            position: 0,
            slug: `slug-generate-${randomUUID()}`,
          },
          select: { id: true },
        })
        .then((chapter) => {
          createdChapterId = chapter.id;
          return chapter;
        });

      await expect(createChapter).rejects.toThrow(
        /chapters_position_positive_check/,
      );
    } finally {
      if (createdChapterId) {
        await prisma.chapter.delete({ where: { id: createdChapterId } });
      }
    }
  });

  it('rejects a published version that belongs to another chapter', async () => {
    const slug = 'the-small-garden-en';
    const prisma = app!.get(PrismaService);
    const edition = await prisma.edition.findUniqueOrThrow({
      where: { slug },
      select: {
        chapters: {
          where: { position: { in: [1, 2] } },
          orderBy: { position: 'asc' },
          select: {
            id: true,
            position: true,
            publishedVersionId: true,
          },
        },
      },
    });

    const [firstChapter, secondChapter] = edition.chapters;

    expect(firstChapter).toEqual(
      expect.objectContaining({
        position: 1,
        publishedVersionId: expect.any(String),
      }),
    );

    expect(secondChapter).toEqual(
      expect.objectContaining({
        position: 2,
        publishedVersionId: expect.any(String),
      }),
    );

    const firstPublishedVersionId = firstChapter?.publishedVersionId;

    try {
      const updateChapter = prisma.chapter.update({
        where: { id: firstChapter?.id },
        data: {
          publishedVersionId: secondChapter?.publishedVersionId,
        },
      });

      await expect(updateChapter).rejects.toThrow(
        /chapters_published_version_id_id_fkey/,
      );
    } finally {
      await prisma.chapter.update({
        where: { id: firstChapter?.id },
        data: {
          publishedVersionId: firstPublishedVersionId,
        },
      });
    }
  });

  it('rejects an edition source that belongs to another edition', async () => {
    const slug = 'the-small-garden-en';
    const other_slug = 'ngon-den-ben-cua-so-vi';
    const prisma = app!.get(PrismaService);
    const version = await prisma.chapterVersion.findFirstOrThrow({
      where: {
        edition: { slug },
        chapter: { position: 1 },
        publishedFor: { isNot: null },
      },
      select: {
        id: true,
        editionId: true,
        editionSourceId: true,
      },
    });

    const source = await prisma.editionSource.findFirstOrThrow({
      where: {
        edition: { slug: other_slug },
      },
      select: {
        id: true,
        editionId: true,
      },
    });

    expect(version.editionId).not.toBe(source.editionId);

    const originalEditionSourceId = version.editionSourceId;

    try {
      // eslint-disable-next-line hiveshelf/chapter-version-writes -- DB constraint test: intentionally assign a source from another edition.
      const updatedChapterVersion = prisma.chapterVersion.update({
        where: { id: version.id },
        data: {
          editionSourceId: source.id,
        },
      });

      await expect(updatedChapterVersion).rejects.toThrow(
        /chapter_versions_edition_source_id_edition_id_fkey/,
      );
    } finally {
      // eslint-disable-next-line hiveshelf/chapter-version-writes -- Restores the original source after the DB constraint test.
      await prisma.chapterVersion.update({
        where: { id: version.id },
        data: {
          editionSourceId: originalEditionSourceId,
        },
      });
    }
  });

  it('rejects duplicate work slugs', async () => {
    const firstSlug = 'the-small-garden';
    const secondSlug = 'ngon-den-ben-cua-so';
    const prisma = app!.get(PrismaService);

    const firstWork = await prisma.work.findUniqueOrThrow({
      where: { slug: firstSlug },
      select: {
        id: true,
        slug: true,
      },
    });

    try {
      const updatedWork = prisma.work.update({
        where: { id: firstWork.id },
        data: { slug: secondSlug },
      });

      await expect(updatedWork).rejects.toMatchObject({ code: 'P2002' });
    } finally {
      await prisma.work.update({
        where: { id: firstWork.id },
        data: { slug: firstSlug },
      });
    }
  });

  it('rejects duplicate edition slugs', async () => {
    const firstSlug = 'the-small-garden-en';
    const secondSlug = 'ngon-den-ben-cua-so-vi';
    const prisma = app!.get(PrismaService);

    const firstEdition = await prisma.edition.findUniqueOrThrow({
      where: { slug: firstSlug },
      select: {
        id: true,
        slug: true,
      },
    });

    try {
      const updatedEdition = prisma.edition.update({
        where: { id: firstEdition.id },
        data: {
          slug: secondSlug,
        },
      });

      await expect(updatedEdition).rejects.toThrow(/editions_slug_key/);
    } finally {
      await prisma.edition.update({
        where: { id: firstEdition.id },
        data: {
          slug: firstSlug,
        },
      });
    }
  });

  it('rejects a second edition for the same work', async () => {
    const firstSlug = 'the-small-garden-en';
    const secondSlug = 'ngon-den-ben-cua-so-vi';
    const prisma = app!.get(PrismaService);

    const firstEdition = await prisma.edition.findUniqueOrThrow({
      where: { slug: firstSlug },
      select: {
        id: true,
        workId: true,
      },
    });
    const secondEdition = await prisma.edition.findUniqueOrThrow({
      where: { slug: secondSlug },
      select: {
        id: true,
        workId: true,
      },
    });

    try {
      const updatedEdition = prisma.edition.update({
        where: { id: firstEdition.id },
        data: {
          workId: secondEdition.workId,
        },
      });

      await expect(updatedEdition).rejects.toMatchObject({ code: 'P2002' });
    } finally {
      await prisma.edition.update({
        where: { id: firstEdition.id },
        data: {
          workId: firstEdition.workId,
        },
      });
    }
  });

  it('rejects duplicate chapter slugs within same edition', async () => {
    const slug = 'the-small-garden-en';
    const prisma = app!.get(PrismaService);
    const edition = await prisma.edition.findUniqueOrThrow({
      where: { slug },
      select: {
        id: true,
        chapters: {
          where: { position: { in: [1, 2] } },
          orderBy: { position: 'asc' },
          select: {
            id: true,
            slug: true,
          },
        },
      },
    });

    const [firstChapter, secondChapter] = edition.chapters;

    expect(edition.chapters).toHaveLength(2);

    const firstSlug = firstChapter?.slug;
    const secondSlug = secondChapter?.slug;

    try {
      const updatedChapter = prisma.chapter.update({
        where: { id: secondChapter?.id },
        data: {
          slug: firstSlug,
        },
      });

      await expect(updatedChapter).rejects.toMatchObject({ code: 'P2002' });
    } finally {
      await prisma.chapter.update({
        where: { id: secondChapter?.id },
        data: {
          slug: secondSlug,
        },
      });
    }
  });

  it('rejects duplicate version numbers within the same chapter', async () => {
    const slug = 'the-small-garden-en';
    const prisma = app!.get(PrismaService);

    const version = await prisma.chapterVersion.findFirstOrThrow({
      where: {
        edition: { slug },
        chapter: { position: 1 },
        publishedFor: { isNot: null },
      },
      select: {
        id: true,
        editionId: true,
        editionSourceId: true,
        chapterId: true,
        versionNumber: true,
        contentHtml: true,
      },
    });

    let createdVersionId: string | undefined;

    try {
      const createVersion = createChapterVersion(prisma, {
        title: 'New Version',
        chapterId: version.chapterId,
        versionNumber: version.versionNumber,
        editionId: version.editionId,
        editionSourceId: version.editionSourceId,
        html: version.contentHtml,
      }).then((createdVersion) => {
        createdVersionId = createdVersion.id;
        return createdVersion;
      });

      await expect(createVersion).rejects.toMatchObject({ code: 'P2002' });
    } finally {
      if (createdVersionId) {
        await prisma.chapterVersion.delete({ where: { id: createdVersionId } });
      }
    }
  });

  it('rejects a chapter version with version number zero', async () => {
    const edition_slug = 'the-small-garden-en';
    const prisma = app!.get(PrismaService);
    const version = await prisma.chapterVersion.findFirstOrThrow({
      where: {
        edition: { slug: edition_slug },
        chapter: { position: 1 },
        versionNumber: 1,
      },
      select: {
        id: true,
        versionNumber: true,
      },
    });

    const originalVersionNumber = version.versionNumber;

    try {
      // eslint-disable-next-line hiveshelf/chapter-version-writes -- DB constraint test: intentionally assign an invalid version number.
      const editedVersion = prisma.chapterVersion.update({
        where: { id: version.id },
        data: {
          versionNumber: 0,
        },
      });

      await expect(editedVersion).rejects.toThrow(
        /chapter_versions_version_number_positive_check/,
      );
    } finally {
      // eslint-disable-next-line hiveshelf/chapter-version-writes -- Restore the original number after the DB constraint test.
      await prisma.chapterVersion.update({
        where: { id: version.id },
        data: {
          versionNumber: originalVersionNumber,
        },
      });
    }
  });

  it('rejects blocking a work without block metadata', async () => {
    const slug = 'the-small-garden';
    const prisma = app!.get(PrismaService);
    const work = await prisma.work.findFirstOrThrow({
      where: { slug },
      select: {
        id: true,
        accessStatus: true,
        blockedAt: true,
        blockReason: true,
      },
    });

    expect(work.blockedAt).toBeNull();
    expect(work.blockReason).toBeNull();

    const originalStatus = work.accessStatus;
    try {
      const editedWork = prisma.work.update({
        where: { id: work.id },
        data: {
          accessStatus: 'BLOCKED',
        },
      });

      await expect(editedWork).rejects.toThrow(/works_block_metadata_check/);
    } finally {
      await prisma.work.update({
        where: { id: work.id },
        data: {
          accessStatus: originalStatus,
        },
      });
    }
  });

  it('rejects an edition that references itself as its source', async () => {
    const edition_slug = 'the-small-garden-en';
    const prisma = app!.get(PrismaService);
    const edition = await prisma.edition.findUniqueOrThrow({
      where: { slug: edition_slug },
      select: {
        id: true,
        sourceEditionId: true,
      },
    });

    const originalId = edition.id;
    const originalSourceEditionId = edition.sourceEditionId;

    try {
      const editedEdition = prisma.edition.update({
        where: { id: edition.id },
        data: {
          sourceEditionId: originalId,
        },
      });

      await expect(editedEdition).rejects.toThrow(
        /editions_source_not_self_check/,
      );
    } finally {
      await prisma.edition.update({
        where: { id: edition.id },
        data: {
          sourceEditionId: originalSourceEditionId,
        },
      });
    }
  });

  it('keeps catalog fixtures consistent after two seed runs', async () => {
    const slugs = ['ngon-den-ben-cua-so', 'the-small-garden'];
    const prisma = app!.get(PrismaService);
    const works = await prisma.work.findMany({
      where: { slug: { in: slugs } },
      select: {
        slug: true,
        edition: {
          select: {
            slug: true,
            languageTag: true,
            sources: true,
            coverAsset: true,
            chapters: {
              orderBy: { position: 'asc' },
              select: {
                position: true,
                publishedVersionId: true,
                versions: {
                  select: {
                    id: true,
                    versionNumber: true,
                    contentHtml: true,
                    contentHash: true,
                    contentFormatVersion: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    expect(works).toHaveLength(2);

    const firstWork = works.find((work) => work.slug === 'ngon-den-ben-cua-so');
    if (!firstWork?.edition) {
      throw new Error(
        'Fixture missing Work ngon-den-ben-cua-so OR missing Edition',
      );
    }
    const firstEdition = firstWork.edition;
    expect(firstEdition).toMatchObject({
      slug: 'ngon-den-ben-cua-so-vi',
      languageTag: 'vi',
    });

    const secondWork = works.find((work) => work.slug === 'the-small-garden');
    if (!secondWork?.edition) {
      throw new Error(
        'Fixture missing Work the-small-garden OR missing Edition',
      );
    }
    const secondEdition = secondWork.edition;
    expect(secondEdition).toMatchObject({
      slug: 'the-small-garden-en',
      languageTag: 'en',
    });

    for (const edition of [firstEdition, secondEdition]) {
      expect(edition.sources).toHaveLength(1);
      expect(edition.coverAsset).toMatchObject({ status: 'PENDING' });

      const chaptersInEdition = edition.chapters;
      expect(chaptersInEdition.map((chapter) => chapter.position)).toEqual([
        1, 2, 3,
      ]);
      for (const chapter of chaptersInEdition) {
        expect(chapter.versions).toHaveLength(1);

        const [version] = chapter.versions;
        if (!version) {
          throw new Error(
            `Fixture missing version for chapter ${chapter.position} of edition ${edition.slug}`,
          );
        }

        expect(version.versionNumber).toBe(1);
        expect(chapter.publishedVersionId).toBe(version.id);
        expect(version.contentFormatVersion).toBe(
          CHAPTER_CONTENT_FORMAT_VERSION,
        );
        expect(version.contentHtml).toBe(
          sanitizeChapterHtml(version.contentHtml),
        );
        expect(version.contentHtml).toMatch(/^<p id="p-1">/);
        expect(version.contentHash).toBe(
          createHash('sha256')
            .update(version.contentHtml, 'utf8')
            .digest('hex'),
        );
      }
    }
  });

  it('sorts newer editions first and returns an empty page past the end', async () => {
    const prisma = app!.get(PrismaService);
    const server = app!.getHttpServer();
    const olderSlug = 'the-small-garden-en';
    const newerSlug = 'ngon-den-ben-cua-so-vi';

    const editions = await prisma.edition.findMany({
      where: { slug: { in: [olderSlug, newerSlug] } },
      orderBy: { id: 'asc' },
      select: {
        id: true,
        slug: true,
        status: true,
        publishedAt: true,
      },
    });

    const [newerEdition, olderEdition] = editions;

    if (!olderEdition || !newerEdition) {
      throw new Error('Fixture must provide both editions');
    }

    try {
      await prisma.$transaction([
        prisma.edition.update({
          where: { id: olderEdition.id },
          data: {
            status: 'PUBLISHED',
            publishedAt: new Date('2025-01-01T00:00:00.000Z'),
          },
        }),

        prisma.edition.update({
          where: { id: newerEdition.id },
          data: {
            status: 'PUBLISHED',
            publishedAt: new Date('2025-02-01T00:00:00.000Z'),
          },
        }),
      ]);

      const expectedPages = [
        { page: 1, editionIds: [newerEdition.id] },
        { page: 2, editionIds: [olderEdition.id] },
        { page: 3, editionIds: [] },
      ];

      for (const { page, editionIds } of expectedPages) {
        const response = await request(server)
          .get(`/books?page=${page}&pageSize=1`)
          .expect(200);

        const result = BookListResponseSchema.parse(response.body);

        expect(result.items.map((item) => item.editionId)).toEqual(editionIds);
        expect(result.pagination).toEqual({
          page,
          pageSize: 1,
          total: 2,
          totalPages: 2,
        });
      }
    } finally {
      await prisma.$transaction(
        editions.map(({ id, status, publishedAt }) =>
          prisma.edition.update({
            where: { id },
            data: {
              status,
              publishedAt,
            },
          }),
        ),
      );
    }
  });
});
