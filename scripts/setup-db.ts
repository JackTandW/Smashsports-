/**
 * One-time database setup script for Neon Postgres.
 * Creates all tables and indexes defined in db/schema.sql.
 *
 * Usage: npx tsx scripts/setup-db.ts
 */
import { config } from 'dotenv';
import fs from 'fs';
import path from 'path';

// Load .env.local (Next.js convention)
config({ path: path.join(process.cwd(), '.env.local') });

import { neon } from '@neondatabase/serverless';

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error('DATABASE_URL is not set. Add it to .env.local');
    process.exit(1);
  }

  const sql = neon(url);
  const schemaPath = path.join(process.cwd(), 'db', 'schema.sql');
  const raw = fs.readFileSync(schemaPath, 'utf-8');

  // Remove comments, then split on semicolons to get individual statements
  const cleaned = raw
    .split('\n')
    .filter((line) => !line.trimStart().startsWith('--'))
    .join('\n');

  const statements = cleaned
    .split(';')
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  console.log(`Running ${statements.length} statements against Neon...`);

  let success = 0;
  let failed = 0;

  for (const stmt of statements) {
    try {
      await sql.query(stmt);
      const match = stmt.match(/(?:TABLE|INDEX)\s+(?:IF NOT EXISTS\s+)?(\w+)/i);
      console.log(`  ✓ ${match ? match[1] : stmt.slice(0, 50)}`);
      success++;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`  ✗ ${stmt.slice(0, 60)}...\n    ${msg}`);
      failed++;
    }
  }

  console.log(`\nDone: ${success} succeeded, ${failed} failed.`);

  // Verify tables exist
  const tables = await sql`
    SELECT table_name FROM information_schema.tables
    WHERE table_schema = 'public'
    ORDER BY table_name
  `;
  console.log(`Tables: ${tables.map((t) => t.table_name).join(', ')}`);
}

main();
