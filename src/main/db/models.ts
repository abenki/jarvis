import { getDb } from './index';
import type { ModelInfo } from '../../shared/types';

// The DB doesn't know whether a symlink target still exists on disk — that's
// determined by main/models/scan.ts at scan time, not stored here.
export type StoredModel = Omit<ModelInfo, 'available'>;

interface ModelRow {
  id: string;
  filename: string;
  symlink_path: string;
  target_path: string;
  is_default: number;
  nickname: string | null;
  last_used_at: number | null;
}

function rowToStoredModel(row: ModelRow): StoredModel {
  return {
    id: row.id,
    filename: row.filename,
    symlinkPath: row.symlink_path,
    targetPath: row.target_path,
    isDefault: row.is_default === 1,
    nickname: row.nickname,
    lastUsedAt: row.last_used_at,
  };
}

export function upsertModel(model: StoredModel): void {
  const db = getDb();
  db.prepare(
    `INSERT INTO models (id, filename, symlink_path, target_path, is_default, nickname, last_used_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       filename = excluded.filename,
       symlink_path = excluded.symlink_path,
       target_path = excluded.target_path,
       nickname = excluded.nickname,
       last_used_at = excluded.last_used_at`,
  ).run(
    model.id,
    model.filename,
    model.symlinkPath,
    model.targetPath,
    model.isDefault ? 1 : 0,
    model.nickname,
    model.lastUsedAt,
  );
}

export function listModels(): StoredModel[] {
  const db = getDb();
  const rows = db.prepare('SELECT * FROM models').all() as unknown as ModelRow[];
  return rows.map(rowToStoredModel);
}

export function getDefaultModel(): StoredModel | null {
  const db = getDb();
  const row = db.prepare('SELECT * FROM models WHERE is_default = 1').get() as unknown as
    | ModelRow
    | undefined;
  return row ? rowToStoredModel(row) : null;
}

export function setDefaultModel(id: string): void {
  const db = getDb();
  db.exec('BEGIN');
  try {
    db.prepare('UPDATE models SET is_default = 0').run();
    db.prepare('UPDATE models SET is_default = 1 WHERE id = ?').run(id);
    db.exec('COMMIT');
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }
}
