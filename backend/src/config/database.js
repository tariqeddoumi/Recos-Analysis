'use strict';

require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });

const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const logger = require('./logger');

const DB_PATH = path.resolve(process.env.DB_PATH || './data/recos.db');
const SCHEMA_PATH = path.join(__dirname, '../database/schema.sql');

// Ensure database directory exists
const dbDir = path.dirname(DB_PATH);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

let db;

function getDb() {
  if (!db) {
    db = new Database(DB_PATH, {
      verbose: process.env.NODE_ENV === 'development' ? null : null
    });

    // Performance pragmas
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
    db.pragma('synchronous = NORMAL');
    db.pragma('cache_size = -32000'); // 32MB cache
    db.pragma('temp_store = MEMORY');
    db.pragma('mmap_size = 268435456'); // 256MB mmap

    // Run schema if tables don't exist
    runSchema(db);

    logger.info(`Database connected: ${DB_PATH}`);
  }
  return db;
}

function runSchema(database) {
  try {
    // Check if tables already exist
    const tableCheck = database.prepare(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='users'"
    ).get();

    if (!tableCheck) {
      logger.info('Running database schema...');
      const schema = fs.readFileSync(SCHEMA_PATH, 'utf8');

      // Execute schema in a transaction
      const runSchema = database.transaction(() => {
        // Split statements carefully, preserving trigger bodies
        const stmts = splitSQLStatements(schema);
        for (const stmt of stmts) {
          if (stmt.trim()) {
            try {
              database.prepare(stmt).run();
            } catch (err) {
              if (!err.message.includes('already exists')) {
                logger.error(`Schema error: ${err.message}\nStatement: ${stmt}`);
                throw err;
              }
            }
          }
        }
      });

      runSchema();
      logger.info('Schema applied successfully.');
    }
  } catch (err) {
    logger.error('Failed to run schema:', err);
    throw err;
  }
}

function splitSQLStatements(sql) {
  // Remove single-line comments
  const noLineComments = sql.replace(/--[^\n]*/g, '');

  const statements = [];
  let current = '';
  let inString = false;
  let stringChar = '';

  for (let i = 0; i < noLineComments.length; i++) {
    const ch = noLineComments[i];

    if (inString) {
      current += ch;
      if (ch === stringChar) {
        inString = false;
      }
    } else {
      if (ch === "'" || ch === '"') {
        inString = true;
        stringChar = ch;
        current += ch;
      } else if (ch === ';') {
        const stmt = current.trim();
        if (stmt) statements.push(stmt);
        current = '';
      } else {
        current += ch;
      }
    }
  }

  const remaining = current.trim();
  if (remaining) statements.push(remaining);

  return statements;
}

function closeDb() {
  if (db) {
    db.close();
    db = null;
    logger.info('Database connection closed.');
  }
}

// Initialize on first import
const instance = getDb();

module.exports = instance;
module.exports.getDb = getDb;
module.exports.closeDb = closeDb;
