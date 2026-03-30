-- Migration: rename qrData -> codeData and rename QrCode -> Code
-- This migration performs only non-destructive renames where possible.

BEGIN;

-- Rename SerialRegistry.qrData -> codeData when present
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'SerialRegistry') THEN
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'SerialRegistry' AND column_name = 'qrData'
    ) THEN
      EXECUTE 'ALTER TABLE "SerialRegistry" RENAME COLUMN "qrData" TO "codeData"';
    END IF;
  END IF;
END$$;

-- Rename QrCode table to Code and its qrImageUrl column to codeValue if present
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'QrCode') THEN
    EXECUTE 'ALTER TABLE "QrCode" RENAME TO "Code"';
  END IF;

  IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'Code') THEN
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'Code' AND column_name = 'qrImageUrl'
    ) THEN
      EXECUTE 'ALTER TABLE "Code" RENAME COLUMN "qrImageUrl" TO "codeValue"';
    END IF;
  END IF;
END$$;

COMMIT;
