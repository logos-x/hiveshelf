-- CreateEnum
CREATE TYPE "WorkAccessStatus" AS ENUM ('AVAILABLE', 'BLOCKED');

-- CreateEnum
CREATE TYPE "EditionStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "EditionSourceType" AS ENUM ('ADMIN_ENTRY', 'PUBLIC_DOMAIN_IMPORT');

-- CreateEnum
CREATE TYPE "RightsBasis" AS ENUM ('PUBLIC_DOMAIN', 'PERMISSION');

-- CreateEnum
CREATE TYPE "MediaAssetKind" AS ENUM ('COVER');

-- CreateEnum
CREATE TYPE "MediaAssetStatus" AS ENUM ('PENDING', 'READY', 'REJECTED');

-- CreateTable
CREATE TABLE "works" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "slug" TEXT NOT NULL,
    "original_title" TEXT NOT NULL,
    "access_status" "WorkAccessStatus" NOT NULL DEFAULT 'AVAILABLE',
    "blocked_at" TIMESTAMPTZ(3),
    "block_reason" TEXT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "works_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "genres" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "genres_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "work_genres" (
    "work_id" UUID NOT NULL,
    "genre_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "work_genres_pkey" PRIMARY KEY ("work_id","genre_id")
);

-- CreateTable
CREATE TABLE "tags" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "tags_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "work_tags" (
    "work_id" UUID NOT NULL,
    "tag_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "work_tags_pkey" PRIMARY KEY ("work_id","tag_id")
);

-- CreateTable
CREATE TABLE "media_assets" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "object_key" TEXT NOT NULL,
    "kind" "MediaAssetKind" NOT NULL,
    "mime_type" TEXT NOT NULL,
    "byte_size" BIGINT NOT NULL,
    "checksum_sha256" TEXT NOT NULL,
    "status" "MediaAssetStatus" NOT NULL DEFAULT 'PENDING',
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "media_assets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "editions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "work_id" UUID NOT NULL,
    "source_edition_id" UUID,
    "language_tag" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "cover_asset_id" UUID,
    "status" "EditionStatus" NOT NULL DEFAULT 'DRAFT',
    "published_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "editions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "edition_sources" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "edition_id" UUID NOT NULL,
    "source_type" "EditionSourceType" NOT NULL,
    "citation" TEXT NOT NULL,
    "source_url" TEXT,
    "rights_basis" "RightsBasis" NOT NULL,
    "rights_statement" TEXT NOT NULL,
    "retrieved_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "edition_sources_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chapters" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "edition_id" UUID NOT NULL,
    "slug" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    "published_version_id" UUID,

    CONSTRAINT "chapters_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chapter_versions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "chapter_id" UUID NOT NULL,
    "edition_id" UUID NOT NULL,
    "version_number" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "content_html" TEXT NOT NULL,
    "content_format_version" INTEGER NOT NULL DEFAULT 1,
    "edition_source_id" UUID NOT NULL,
    "content_hash" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "chapter_versions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "works_slug_key" ON "works"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "genres_slug_key" ON "genres"("slug");

-- CreateIndex
CREATE INDEX "work_genres_genre_id_work_id_idx" ON "work_genres"("genre_id", "work_id");

-- CreateIndex
CREATE UNIQUE INDEX "tags_slug_key" ON "tags"("slug");

-- CreateIndex
CREATE INDEX "work_tags_tag_id_work_id_idx" ON "work_tags"("tag_id", "work_id");

-- CreateIndex
CREATE UNIQUE INDEX "media_assets_object_key_key" ON "media_assets"("object_key");

-- CreateIndex
CREATE UNIQUE INDEX "editions_work_id_key" ON "editions"("work_id");

-- CreateIndex
CREATE UNIQUE INDEX "editions_slug_key" ON "editions"("slug");

-- CreateIndex
CREATE INDEX "editions_cover_asset_id_idx" ON "editions"("cover_asset_id");

-- CreateIndex
CREATE INDEX "editions_source_edition_id_work_id_idx" ON "editions"("source_edition_id", "work_id");

-- CreateIndex
CREATE INDEX "editions_status_published_at_idx" ON "editions"("status", "published_at");

-- CreateIndex
CREATE UNIQUE INDEX "editions_id_work_id_key" ON "editions"("id", "work_id");

-- CreateIndex
CREATE INDEX "edition_sources_edition_id_idx" ON "edition_sources"("edition_id");

-- CreateIndex
CREATE UNIQUE INDEX "edition_sources_id_edition_id_key" ON "edition_sources"("id", "edition_id");

-- CreateIndex
CREATE UNIQUE INDEX "chapters_edition_id_slug_key" ON "chapters"("edition_id", "slug");

-- CreateIndex
CREATE UNIQUE INDEX "chapters_edition_id_position_key" ON "chapters"("edition_id", "position");

-- CreateIndex
CREATE UNIQUE INDEX "chapters_id_edition_id_key" ON "chapters"("id", "edition_id");

-- CreateIndex
CREATE UNIQUE INDEX "chapters_published_version_id_id_key" ON "chapters"("published_version_id", "id");

-- CreateIndex
CREATE INDEX "chapter_versions_edition_id_idx" ON "chapter_versions"("edition_id");

-- CreateIndex
CREATE INDEX "chapter_versions_edition_source_id_edition_id_idx" ON "chapter_versions"("edition_source_id", "edition_id");

-- CreateIndex
CREATE UNIQUE INDEX "chapter_versions_chapter_id_version_number_key" ON "chapter_versions"("chapter_id", "version_number");

-- CreateIndex
CREATE UNIQUE INDEX "chapter_versions_id_chapter_id_key" ON "chapter_versions"("id", "chapter_id");

-- AddForeignKey
ALTER TABLE "work_genres" ADD CONSTRAINT "work_genres_work_id_fkey" FOREIGN KEY ("work_id") REFERENCES "works"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_genres" ADD CONSTRAINT "work_genres_genre_id_fkey" FOREIGN KEY ("genre_id") REFERENCES "genres"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_tags" ADD CONSTRAINT "work_tags_work_id_fkey" FOREIGN KEY ("work_id") REFERENCES "works"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_tags" ADD CONSTRAINT "work_tags_tag_id_fkey" FOREIGN KEY ("tag_id") REFERENCES "tags"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "editions" ADD CONSTRAINT "editions_work_id_fkey" FOREIGN KEY ("work_id") REFERENCES "works"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "editions" ADD CONSTRAINT "editions_cover_asset_id_fkey" FOREIGN KEY ("cover_asset_id") REFERENCES "media_assets"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "editions" ADD CONSTRAINT "editions_source_edition_id_work_id_fkey" FOREIGN KEY ("source_edition_id", "work_id") REFERENCES "editions"("id", "work_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "edition_sources" ADD CONSTRAINT "edition_sources_edition_id_fkey" FOREIGN KEY ("edition_id") REFERENCES "editions"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "chapters" ADD CONSTRAINT "chapters_edition_id_fkey" FOREIGN KEY ("edition_id") REFERENCES "editions"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "chapters" ADD CONSTRAINT "chapters_published_version_id_id_fkey" FOREIGN KEY ("published_version_id", "id") REFERENCES "chapter_versions"("id", "chapter_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "chapter_versions" ADD CONSTRAINT "chapter_versions_chapter_id_edition_id_fkey" FOREIGN KEY ("chapter_id", "edition_id") REFERENCES "chapters"("id", "edition_id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "chapter_versions" ADD CONSTRAINT "chapter_versions_edition_id_fkey" FOREIGN KEY ("edition_id") REFERENCES "editions"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "chapter_versions" ADD CONSTRAINT "chapter_versions_edition_source_id_edition_id_fkey" FOREIGN KEY ("edition_source_id", "edition_id") REFERENCES "edition_sources"("id", "edition_id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- Chapter position must be positive
ALTER TABLE "chapters" ADD CONSTRAINT "chapters_position_positive_check" CHECK ("position" > 0);

-- Chapter version number must be positive
ALTER TABLE "chapter_versions" ADD CONSTRAINT "chapter_versions_version_number_positive_check" CHECK ("version_number" > 0);

-- Asset size must be positive
ALTER TABLE "media_assets" ADD CONSTRAINT "media_assets_byte_size_positive_check" CHECK ("byte_size" > 0);

-- An Edition cannot reference itself as its translation source
ALTER TABLE "editions" ADD CONSTRAINT "editions_source_not_self_check" CHECK ("source_edition_id" IS NULL OR "source_edition_id" <> "id");

-- Block metadata must match the Work access status
ALTER TABLE "works" ADD CONSTRAINT "works_block_metadata_check" CHECK (
  ("access_status" = 'AVAILABLE' AND "blocked_at" IS NULL AND "block_reason" IS NULL) OR
  ("access_status" = 'BLOCKED' AND "blocked_at" IS NOT NULL AND "block_reason" IS NOT NULL)
);
