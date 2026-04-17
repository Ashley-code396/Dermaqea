/*
  Warnings:

  - You are about to drop the column `serialId` on the `Code` table. All the data in the column will be lost.
  - You are about to drop the column `batchNumber` on the `Product` table. All the data in the column will be lost.
  - You are about to drop the column `digest` on the `Product` table. All the data in the column will be lost.
  - You are about to drop the column `minted` on the `Product` table. All the data in the column will be lost.
  - You are about to drop the column `mintedAt` on the `Product` table. All the data in the column will be lost.
  - You are about to drop the column `objectId` on the `Product` table. All the data in the column will be lost.
  - You are about to drop the column `serialNumber` on the `Product` table. All the data in the column will be lost.
  - You are about to drop the column `serialId` on the `ScanLog` table. All the data in the column will be lost.
  - You are about to drop the column `serialId` on the `SecurityAlert` table. All the data in the column will be lost.
  - You are about to drop the `Batch` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ProductTwin` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `SerialRegistry` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `codeId` to the `ScanLog` table without a default value. This is not possible if the table is not empty.
  - Added the required column `codeId` to the `SecurityAlert` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "Batch" DROP CONSTRAINT "Batch_productId_fkey";

-- DropForeignKey
ALTER TABLE "Code" DROP CONSTRAINT "QrCode_serialId_fkey";

-- DropForeignKey
ALTER TABLE "ProductTwin" DROP CONSTRAINT "ProductTwin_batchId_fkey";

-- DropForeignKey
ALTER TABLE "ScanLog" DROP CONSTRAINT "ScanLog_serialId_fkey";

-- DropForeignKey
ALTER TABLE "SecurityAlert" DROP CONSTRAINT "SecurityAlert_serialId_fkey";

-- DropForeignKey
ALTER TABLE "SerialRegistry" DROP CONSTRAINT "SerialRegistry_batchId_fkey";

-- DropForeignKey
ALTER TABLE "SerialRegistry" DROP CONSTRAINT "SerialRegistry_twinObjectId_fkey";

-- DropIndex
DROP INDEX "QrCode_serialId_key";

-- DropIndex
DROP INDEX "Product_serialNumber_key";

-- DropIndex
DROP INDEX "ScanLog_serialId_idx";

-- AlterTable
ALTER TABLE "Code" RENAME CONSTRAINT "QrCode_pkey" TO "Code_pkey";
ALTER TABLE "Code" DROP COLUMN "serialId";
ALTER TABLE "Code" ADD COLUMN     "glyphGeneratedAt" TIMESTAMP(3);
ALTER TABLE "Code" ADD COLUMN     "glyphSvg" TEXT;
ALTER TABLE "Code" ADD COLUMN     "printedAt" TIMESTAMP(3);
ALTER TABLE "Code" ADD COLUMN     "productId" TEXT;
ALTER TABLE "Code" ALTER COLUMN "codeValue" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Product" DROP COLUMN "batchNumber";
ALTER TABLE "Product" DROP COLUMN "digest";
ALTER TABLE "Product" DROP COLUMN "minted";
ALTER TABLE "Product" DROP COLUMN "mintedAt";
ALTER TABLE "Product" DROP COLUMN "objectId";
ALTER TABLE "Product" DROP COLUMN "serialNumber";
ALTER TABLE "Product" ADD COLUMN     "rejectionReason" TEXT;
ALTER TABLE "Product" ADD COLUMN     "status" "ProductStatus" NOT NULL DEFAULT 'PENDING';

-- AlterTable
ALTER TABLE "ScanLog" DROP COLUMN "serialId";
ALTER TABLE "ScanLog" ADD COLUMN     "codeId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "SecurityAlert" DROP COLUMN "serialId";
ALTER TABLE "SecurityAlert" ADD COLUMN     "codeId" TEXT NOT NULL;

-- DropTable
DROP TABLE "Batch";

-- DropTable
DROP TABLE "ProductTwin";

-- DropTable
DROP TABLE "SerialRegistry";

-- DropEnum
DROP TYPE "BatchStatus";

-- CreateIndex
CREATE INDEX "Code_productId_idx" ON "Code"("productId");

-- CreateIndex
CREATE INDEX "ScanLog_codeId_idx" ON "ScanLog"("codeId");

-- AddForeignKey
ALTER TABLE "Code" ADD CONSTRAINT "Code_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScanLog" ADD CONSTRAINT "ScanLog_codeId_fkey" FOREIGN KEY ("codeId") REFERENCES "Code"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SecurityAlert" ADD CONSTRAINT "SecurityAlert_codeId_fkey" FOREIGN KEY ("codeId") REFERENCES "Code"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
