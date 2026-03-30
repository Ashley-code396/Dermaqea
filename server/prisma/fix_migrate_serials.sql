-- Backup SerialRegistry first (safe)
CREATE TABLE IF NOT EXISTS "SerialRegistry_backup" AS TABLE "SerialRegistry" WITH NO DATA;

INSERT INTO "SerialRegistry_backup"
SELECT * FROM "SerialRegistry" WHERE NOT EXISTS (SELECT 1 FROM "SerialRegistry_backup" b WHERE b.id = "SerialRegistry".id);

-- Migration: migrate data from SerialRegistry into Code and repoint logs/alerts to Code
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'SerialRegistry') THEN

    -- Ensure Code has productId
    ALTER TABLE "Code" ADD COLUMN IF NOT EXISTS "productId" uuid;

    -- Insert Code rows for serials that don't already have a matching codeValue
    INSERT INTO "Code" ("codeValue", "generatedAt", "downloadedAt", "productId")
    SELECT sr."codeData", sr."createdAt", NULL, sr."productId"
    FROM "SerialRegistry" sr
    WHERE NOT EXISTS (SELECT 1 FROM "Code" c WHERE c."codeValue" = sr."codeData");

    -- Ensure Code.productId is set for records derived from serials
    UPDATE "Code" c
    SET "productId" = sr."productId"
    FROM "SerialRegistry" sr
    WHERE c."codeValue" = sr."codeData" AND (c."productId" IS NULL OR c."productId" = '');

    -- Add codeId columns to logs/alerts if missing
    ALTER TABLE "ScanLog" ADD COLUMN IF NOT EXISTS "codeId" uuid;
    ALTER TABLE "SecurityAlert" ADD COLUMN IF NOT EXISTS "codeId" uuid;

    -- Populate codeId on logs/alerts by joining on the codeValue -> code mapping
    UPDATE "ScanLog" sl
    SET "codeId" = c.id
    FROM "Code" c, "SerialRegistry" sr
    WHERE sl."serialId" = sr.id AND c."codeValue" = sr."codeData";

    UPDATE "SecurityAlert" sa
    SET "codeId" = c.id
    FROM "Code" c, "SerialRegistry" sr
    WHERE sa."serialId" = sr.id AND c."codeValue" = sr."codeData";

    -- Drop old serialId columns on logs/alerts
    ALTER TABLE "ScanLog" DROP COLUMN IF EXISTS "serialId";
    ALTER TABLE "SecurityAlert" DROP COLUMN IF EXISTS "serialId";

    -- Finally drop the SerialRegistry table (destructive)
    DROP TABLE IF EXISTS "SerialRegistry";
  END IF;
END$$;

-- Confirm: list counts
SELECT '--- counts after migration ---' as info;
SELECT 'codes' as what, COUNT(*) FROM "Code";
SELECT 'scanlogs_missing_code' as what, COUNT(*) FROM "ScanLog" WHERE "codeId" IS NULL;
SELECT 'alerts_missing_code' as what, COUNT(*) FROM "SecurityAlert" WHERE "codeId" IS NULL;
SELECT '--- end ---' as info;
