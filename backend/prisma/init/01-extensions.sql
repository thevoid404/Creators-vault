-- Runs once, on first container start, before any Prisma migration.
-- Prisma also declares this extension (postgresqlExtensions preview feature),
-- but creating it here means a fresh database is usable even if migrations are
-- applied by a role without CREATE EXTENSION rights.
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pg_trgm;
