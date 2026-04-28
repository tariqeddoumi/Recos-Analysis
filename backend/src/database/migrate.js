'use strict';

require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });

const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

const DB_PATH = process.env.DB_PATH || './data/recos.db';
const UPLOAD_DIR = process.env.UPLOAD_DIR || './uploads';
const SCHEMA_PATH = path.join(__dirname, 'schema.sql');

function ensureDir(dirPath) {
  const resolved = path.resolve(dirPath);
  if (!fs.existsSync(resolved)) {
    fs.mkdirSync(resolved, { recursive: true });
    console.log(`[migrate] Created directory: ${resolved}`);
  }
}

function runMigration() {
  console.log('[migrate] Starting database migration...');

  // Ensure directories
  ensureDir(path.dirname(path.resolve(DB_PATH)));
  ensureDir(path.resolve(UPLOAD_DIR));
  ensureDir(path.resolve(UPLOAD_DIR + '/evidences'));
  ensureDir(path.resolve(UPLOAD_DIR + '/attachments'));
  ensureDir(path.resolve(UPLOAD_DIR + '/reports'));
  ensureDir(path.resolve('./logs'));

  // Open / create database
  const db = new Database(path.resolve(DB_PATH));
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  db.pragma('synchronous = NORMAL');

  // Read and execute schema
  const schema = fs.readFileSync(SCHEMA_PATH, 'utf8');

  // Split on semicolons but keep statement integrity (crude but effective for this schema)
  const statements = schema
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--'));

  const migrate = db.transaction(() => {
    for (const stmt of statements) {
      try {
        db.prepare(stmt).run();
      } catch (err) {
        // Skip "already exists" errors (IF NOT EXISTS guards them anyway)
        if (!err.message.includes('already exists')) {
          console.error(`[migrate] Error running statement:\n${stmt}\n`, err.message);
          throw err;
        }
      }
    }
  });

  migrate();

  db.close();
  console.log('[migrate] Migration completed successfully.');
}

runMigration();
