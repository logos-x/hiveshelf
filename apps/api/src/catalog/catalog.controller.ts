import { Controller, Get, Inject, Param, Query } from '@nestjs/common';
import { CatalogService } from './catalog.service.ts';
import {
  BookDetail,
  BookListQuerySchema,
  BookListResponse,
  BookSlugParamsSchema,
  ChapterContent,
  ChapterParamsSchema,
} from '@hiveshelf/shared';

@Controller('books')
export class CatalogController {
  constructor(
    @Inject(CatalogService)
    private readonly catalog: CatalogService,
  ) {}

  @Get()
  listBooks(@Query() query: unknown): Promise<BookListResponse> {
    return this.catalog.listBooks(BookListQuerySchema.parse(query));
  }

  @Get(':slug')
  getBook(@Param() params: unknown): Promise<BookDetail> {
    const { slug } = BookSlugParamsSchema.parse(params);
    return this.catalog.getBook(slug);
  }

  @Get(':slug/chapters/:order')
  getChapters(@Param() params: unknown): Promise<ChapterContent> {
    const { slug, order } = ChapterParamsSchema.parse(params);
    return this.catalog.getChapter(slug, order);
  }
}
