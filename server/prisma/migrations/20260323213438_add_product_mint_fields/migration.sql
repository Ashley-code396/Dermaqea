-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "digest" TEXT,
ADD COLUMN     "minted" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "mintedAt" TIMESTAMP(3);
