import type { Prisma } from '../generated/prisma/client.ts';
import {
  BookDetail,
  BookListItem,
  BookListQuery,
  BookListResponse,
  ChapterContent,
} from '@hiveshelf/shared';
import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.ts';

const publicEditionWhere = {
  status: 'PUBLISHED',
  publishedAt: { not: null },
  work: { is: { accessStatus: 'AVAILABLE' } },
} satisfies Prisma.EditionWhereInput;

const bookListSelect = {
  id: true,
  slug: true,
  languageTag: true,
  title: true,
  description: true,
  publishedAt: true,
  work: {
    select: {
      id: true,
      slug: true,
      authorNames: true,
      workGenres: {
        select: { genre: { select: { slug: true, name: true } } },
      },
      workTags: {
        select: { tag: { select: { slug: true, name: true } } },
      },
    },
  },
} satisfies Prisma.EditionSelect;

type BookListRow = Prisma.EditionGetPayload<{ select: typeof bookListSelect }>;

function toBookListItem(edition: BookListRow): BookListItem {
  if (edition.publishedAt === null) {
    throw new Error('Published edition is missing publishedAt');
  }

  return {
    workId: edition.work.id,
    slug: edition.work.slug,
    editionId: edition.id,
    editionSlug: edition.slug,
    languageTag: edition.languageTag,
    title: edition.title,
    description: edition.description,
    genres: edition.work.workGenres.map(({ genre }) => genre),
    tags: edition.work.workTags.map(({ tag }) => tag),
    publishedAt: edition.publishedAt.toISOString(),
  };
}

@Injectable()
export class CatalogService {
  constructor(
    @Inject(PrismaService)
    private readonly prisma: PrismaService,
  ) {}

  async listBooks({
    page,
    pageSize,
  }: BookListQuery): Promise<BookListResponse> {
    const total = await this.prisma.edition.count({
      where: publicEditionWhere,
    });
    const totalPages = Math.ceil(total / pageSize);
    const pagination = { page, pageSize, total, totalPages };

    if (page > totalPages) {
      return { items: [], pagination };
    }

    const editions = await this.prisma.edition.findMany({
      where: publicEditionWhere,
      select: bookListSelect,
      orderBy: [{ publishedAt: 'desc' }, { id: 'desc' }],
      skip: (page - 1) * pageSize,
      take: pageSize,
    });

    return { items: editions.map(toBookListItem), pagination };
  }

  async getBook(slug: string): Promise<BookDetail> {
    const edition = await this.prisma.edition.findFirst({
      where: {
        ...publicEditionWhere,
        work: {
          is: { ...publicEditionWhere.work.is, slug },
        },
      },
      select: {
        ...bookListSelect,
        chapters: {
          where: { publishedVersionId: { not: null } },
          orderBy: { position: 'asc' },
          select: {
            id: true,
            slug: true,
            position: true,
            publishedVersion: {
              select: {
                title: true,
                editionSource: {
                  select: {
                    id: true,
                    citation: true,
                    sourceUrl: true,
                    rightsStatement: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!edition) {
      throw new NotFoundException('Book not found');
    }

    const sourcesById = new Map<string, BookDetail['sources'][number]>();

    for (const chapter of edition.chapters) {
      const source = chapter.publishedVersion?.editionSource;

      if (!source) continue;

      sourcesById.set(source.id, {
        citation: source.citation,
        sourceUrl: source.sourceUrl,
        rightsStatement: source.rightsStatement,
      });
    }

    return {
      ...toBookListItem(edition),
      authorNames: edition.work.authorNames,
      sources: [...sourcesById.values()],
      chapters: edition.chapters.flatMap((chapter) =>
        chapter.publishedVersion
          ? [
              {
                chapterId: chapter.id,
                slug: chapter.slug,
                order: chapter.position,
                title: chapter.publishedVersion.title,
              },
            ]
          : [],
      ),
    };
  }

  async getChapter(slug: string, order: number): Promise<ChapterContent> {
    const chapter = await this.prisma.chapter.findFirst({
      where: {
        position: order,
        publishedVersionId: { not: null },
        edition: {
          is: {
            ...publicEditionWhere,
            work: {
              is: { ...publicEditionWhere.work.is, slug },
            },
          },
        },
      },
      select: {
        id: true,
        editionId: true,
        position: true,
        edition: { select: { workId: true } },
        publishedVersion: {
          select: {
            id: true,
            title: true,
            contentHtml: true,
            contentFormatVersion: true,
          },
        },
      },
    });

    if (!chapter?.publishedVersion) {
      throw new NotFoundException('Chapter not found');
    }

    const version = chapter.publishedVersion;

    return {
      workId: chapter.edition.workId,
      editionId: chapter.editionId,
      chapterId: chapter.id,
      chapterVersionId: version.id,
      order: chapter.position,
      title: version.title,
      html: version.contentHtml,
      contentFormatVersion: version.contentFormatVersion,
    };
  }
}
