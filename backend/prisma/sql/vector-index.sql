-- ---------------------------------------------------------------------------
-- Indexes Prisma cannot express in schema.prisma.
-- Run once after the initial migration:   npm run db:indexes
-- Safe to re-run: every statement is IF NOT EXISTS.
-- ---------------------------------------------------------------------------

CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Approximate-nearest-neighbour index over the asset embeddings.
--
-- HNSW rather than IVFFlat: it needs no training pass, so it works on an empty
-- table and stays correct as assets are added one at a time, which is exactly
-- the write pattern here. `vector_cosine_ops` matches the `<=>` operator used by
-- the similarity and semantic-search queries.
CREATE INDEX IF NOT EXISTS assets_embedding_hnsw_idx
  ON assets USING hnsw (embedding vector_cosine_ops);

-- Trigram indexes backing the keyword search's ILIKE '%term%' predicates. A
-- plain B-tree cannot serve a leading wildcard; without these, keyword search
-- degrades to a sequential scan once the table grows.
CREATE INDEX IF NOT EXISTS assets_title_trgm_idx
  ON assets USING gin (title gin_trgm_ops);

CREATE INDEX IF NOT EXISTS assets_description_trgm_idx
  ON assets USING gin (description gin_trgm_ops);

CREATE INDEX IF NOT EXISTS assets_category_trgm_idx
  ON assets USING gin (category gin_trgm_ops);

CREATE INDEX IF NOT EXISTS tags_name_trgm_idx
  ON tags USING gin (name gin_trgm_ops);

CREATE INDEX IF NOT EXISTS projects_name_trgm_idx
  ON projects USING gin (name gin_trgm_ops);
