-- ============================================
-- Afroid — PostgreSQL Init Script
-- Runs automatically on first container start
-- ============================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "vector";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Confirm extensions loaded
DO $$
BEGIN
    RAISE NOTICE 'Extensions loaded: uuid-ossp, vector (pgvector), pg_trgm';
END $$;
