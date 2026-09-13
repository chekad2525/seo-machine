import assert from 'node:assert/strict';
import test from 'node:test';
import { resolveMigrationDatabaseUrl } from './resolve-migration-url.mjs';

test('prefers an explicit direct URL', () => {
  const result = resolveMigrationDatabaseUrl({ DATABASE_URL: 'postgresql://runtime@host:6543/db', DIRECT_URL: 'postgresql://migration@host:5432/db' });
  assert.equal(result.url, 'postgresql://migration@host:5432/db');
  assert.equal(result.source, 'DIRECT_URL');
});

test('converts a Supabase transaction pooler URL to the session pooler', () => {
  const result = resolveMigrationDatabaseUrl({ DATABASE_URL: 'postgresql://postgres.ref:secret@aws-0-us-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true&sslmode=require' });
  assert.equal(result.url, 'postgresql://postgres.ref:secret@aws-0-us-east-1.pooler.supabase.com:5432/postgres?sslmode=require');
  assert.equal(result.source, 'Supabase Session Pooler');
});

test('keeps non-Supabase database URLs unchanged', () => {
  const value = 'postgresql://user:secret@example.com:5432/app';
  assert.equal(resolveMigrationDatabaseUrl({ DATABASE_URL: value }).url, value);
});
