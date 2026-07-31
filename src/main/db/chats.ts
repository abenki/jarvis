import { randomUUID } from 'node:crypto';
import { getDb } from './index';
import type { ChatMessage } from '../../shared/types';

export interface Chat {
  id: string;
  title: string | null;
  modelId: string | null;
  createdAt: number;
  updatedAt: number;
}

export function createChat(modelId: string, title: string | null = null): Chat {
  const db = getDb();
  const id = randomUUID();
  const now = Date.now();
  db.prepare(
    'INSERT INTO chats (id, title, model_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?)',
  ).run(id, title, modelId, now, now);
  return { id, title, modelId, createdAt: now, updatedAt: now };
}

// Idempotent create for chat ids generated client-side (the renderer picks
// the id up front so it can include it in the very first inference request).
export function ensureChat(id: string, modelId: string, title: string | null = null): void {
  const db = getDb();
  const now = Date.now();
  db.prepare(
    'INSERT OR IGNORE INTO chats (id, title, model_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?)',
  ).run(id, title, modelId, now, now);
}

export function addMessage(chatId: string, message: ChatMessage): void {
  const db = getDb();
  db.prepare(
    'INSERT INTO messages (id, chat_id, role, content, created_at) VALUES (?, ?, ?, ?, ?)',
  ).run(message.id, chatId, message.role, message.content, message.createdAt);
  db.prepare('UPDATE chats SET updated_at = ? WHERE id = ?').run(Date.now(), chatId);
}

export function getChatMessages(chatId: string): ChatMessage[] {
  const db = getDb();
  const rows = db
    .prepare('SELECT id, role, content, created_at FROM messages WHERE chat_id = ? ORDER BY created_at ASC')
    .all(chatId) as { id: string; role: ChatMessage['role']; content: string; created_at: number }[];
  return rows.map((row) => ({
    id: row.id,
    role: row.role,
    content: row.content,
    createdAt: row.created_at,
  }));
}

export function listChats(): Chat[] {
  const db = getDb();
  const rows = db
    .prepare('SELECT id, title, model_id, created_at, updated_at FROM chats ORDER BY updated_at DESC')
    .all() as { id: string; title: string | null; model_id: string | null; created_at: number; updated_at: number }[];
  return rows.map((row) => ({
    id: row.id,
    title: row.title,
    modelId: row.model_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));
}
