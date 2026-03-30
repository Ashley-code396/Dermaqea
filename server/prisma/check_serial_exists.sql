SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'SerialRegistry';
SELECT COUNT(*) as code_count FROM "Code";