import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { app } from 'electron';

let db: DatabaseSync | null = null;

const SCHEMA = `
CREATE TABLE IF NOT EXISTS chats (
  id TEXT PRIMARY KEY,
  title TEXT,
  model_id TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS messages (
  id TEXT PRIMARY KEY,
  chat_id TEXT NOT NULL REFERENCES chats(id),
  role TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS models (
  id TEXT PRIMARY KEY,
  filename TEXT NOT NULL,
  symlink_path TEXT NOT NULL,
  target_path TEXT NOT NULL,
  is_default INTEGER NOT NULL DEFAULT 0,
  nickname TEXT,
  last_used_at INTEGER
);

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT
);
`;

export function getDb(): DatabaseSync {
  if (!db) {
    const dbPath = path.join(app.getPath('userData'), 'jarvis.sqlite');
    db = new DatabaseSync(dbPath);
    db.exec(SCHEMA);
  }
  return db;
}
