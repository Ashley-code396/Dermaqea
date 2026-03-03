/*
  Warnings:

  - You are about to drop the column `approvalDate` on the `Product` table. All the data in the column will be lost.
  - You are about to drop the column `description` on the `Product` table. All the data in the column will be lost.
  - You are about to drop the column `name` on the `Product` table. All the data in the column will be lost.
  - You are about to drop the column `status` on the `Product` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[serialNumber]` on the table `Product` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `batchNumber` to the `Product` table without a default value. This is not possible if the table is not empty.
  - Added the required column `brand_wallet` to the `Product` table without a default value. This is not possible if the table is not empty.
  - Added the required column `expiryDate` to the `Product` table without a default value. This is not possible if the table is not empty.
  - Added the required column `manufactureDate` to the `Product` table without a default value. This is not possible if the table is not empty.
  - Added the required column `product_name` to the `Product` table without a default value. This is not possible if the table is not empty.
  - Added the required column `serialNumber` to the `Product` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Product" DROP COLUMN "approvalDate",
DROP COLUMN "description",
DROP COLUMN "name",
DROP COLUMN "status",
ADD COLUMN     "batchNumber" TEXT NOT NULL,
ADD COLUMN     "brand_wallet" TEXT NOT NULL,
ADD COLUMN     "expiryDate" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "extraData" JSONB,
ADD COLUMN     "manufactureDate" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "metadataHash" TEXT,
ADD COLUMN     "objectId" TEXT,
ADD COLUMN     "product_name" TEXT NOT NULL,
ADD COLUMN     "serialNumber" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Product_serialNumber_key" ON "Product"("serialNumber");

-- CreateIndex
CREATE INDEX "Product_manufacturerId_idx" ON "Product"("manufacturerId");
