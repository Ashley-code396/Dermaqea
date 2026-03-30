-- Guarded migration: add UI-friendly columns to Product if they don't already exist.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'Product' AND column_name = 'name'
  ) THEN
    ALTER TABLE "Product" ADD COLUMN name text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'Product' AND column_name = 'sku'
  ) THEN
    ALTER TABLE "Product" ADD COLUMN sku text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'Product' AND column_name = 'category'
  ) THEN
    ALTER TABLE "Product" ADD COLUMN category text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'Product' AND column_name = 'description'
  ) THEN
    ALTER TABLE "Product" ADD COLUMN description text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'Product' AND column_name = 'ingredients'
  ) THEN
    ALTER TABLE "Product" ADD COLUMN ingredients jsonb;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'Product' AND column_name = 'certifications'
  ) THEN
    ALTER TABLE "Product" ADD COLUMN certifications jsonb;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'Product' AND column_name = 'images'
  ) THEN
    ALTER TABLE "Product" ADD COLUMN images jsonb;
  END IF;
END$$;
