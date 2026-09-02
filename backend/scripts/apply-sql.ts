/**
 * Applies a raw .sql file through the Prisma connection.
 *
 * Used for the DDL Prisma cannot express in schema.prisma — the pgvector HNSW
 * index and the pg_trgm indexes that back keyword search.
 *
 *   npx ts-node scripts/apply-sql.ts prisma/sql/vector-index.sql
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { PrismaClient } from '@prisma/client';

async function main(): Promise<void> {
  const [, , file] = process.argv;
  if (!file) {
    console.error('Usage: ts-node scripts/apply-sql.ts <path-to.sql>');
    process.exit(1);
  }

  const path = resolve(process.cwd(), file);
  const sql = readFileSync(path, 'utf8');

  // Split on semicolons at end of line so that each statement is sent
  // separately; $executeRawUnsafe accepts one statement at a time.
  const statements = sql
    .split(/;\s*$/m)
    .map((statement) => statement.trim())
    .filter((statement) => statement.length > 0 && !statement.startsWith('--'));

  const prisma = new PrismaClient();
  try {
    for (const statement of statements) {
      const label = statement.replace(/\s+/g, ' ').slice(0, 80);
      process.stdout.write(`  -> ${label}...\n`);
      await prisma.$executeRawUnsafe(statement);
    }
    console.log(`Applied ${statements.length} statement(s) from ${file}`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
