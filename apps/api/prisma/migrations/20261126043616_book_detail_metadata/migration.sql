-- AlterTable
ALTER TABLE "edition_sources" ALTER COLUMN "rights_basis" DROP NOT NULL,
ALTER COLUMN "rights_statement" DROP NOT NULL;

-- AlterTable
ALTER TABLE "works" ADD COLUMN     "author_names" TEXT[] DEFAULT ARRAY[]::TEXT[];
