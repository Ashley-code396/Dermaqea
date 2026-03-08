-- AlterTable
ALTER TABLE "Manufacturer" ADD COLUMN     "businessRegNumber" TEXT,
ADD COLUMN     "country" TEXT,
ADD COLUMN     "logoUrl" TEXT,
ADD COLUMN     "website" TEXT,
ALTER COLUMN "passwordHash" DROP NOT NULL;

-- CreateTable
CREATE TABLE "ManufacturerDocument" (
    "id" TEXT NOT NULL,
    "manufacturerId" TEXT NOT NULL,
    "docType" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "ipfsHash" TEXT,
    "url" TEXT,
    "status" "VerificationStatus" NOT NULL DEFAULT 'PENDING',
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ManufacturerDocument_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ManufacturerDocument_manufacturerId_idx" ON "ManufacturerDocument"("manufacturerId");

-- AddForeignKey
ALTER TABLE "ManufacturerDocument" ADD CONSTRAINT "ManufacturerDocument_manufacturerId_fkey" FOREIGN KEY ("manufacturerId") REFERENCES "Manufacturer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
