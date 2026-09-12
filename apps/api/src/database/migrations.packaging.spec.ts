import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'path';

describe('prisma migrations packaging', () => {
  const root = resolve(process.cwd(), '../../packages/database/prisma/migrations');
  const alt = resolve(process.cwd(), '../database/prisma/migrations');
  const migrationsDir = existsSync(root) ? root : alt;

  it('has migration_lock.toml for postgresql', () => {
    const lock = resolve(migrationsDir, 'migration_lock.toml');
    assert.ok(existsSync(lock), `missing ${lock}`);
    const text = readFileSync(lock, 'utf8');
    assert.match(text, /provider\s*=\s*"postgresql"/);
  });

  it('has at least one SQL migration folder', () => {
    const dirs = readdirSync(migrationsDir, { withFileTypes: true }).filter(
      (d) => d.isDirectory() && /^\d+_/.test(d.name),
    );
    assert.ok(dirs.length >= 1, 'expected baseline migration');
    for (const d of dirs) {
      const sql = resolve(migrationsDir, d.name, 'migration.sql');
      assert.ok(existsSync(sql), `missing ${sql}`);
      const body = readFileSync(sql, 'utf8');
      assert.ok(
        /CREATE TABLE|CREATE TYPE|CREATE EXTENSION|ALTER TABLE|ALTER TYPE/i.test(body),
        `unexpected migration body in ${d.name}`,
      );
    }
  });
});
