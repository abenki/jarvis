import { ipcMain, type IpcMainEvent, type MessagePortMain } from 'electron';
import { randomUUID } from 'node:crypto';
import type { InferenceStartPayload } from '../../shared/types';
import { streamInference } from '../llama/generate';
import { ensureChat, addMessage } from '../db/chats';

// TEMPORARY: model resolution is hardcoded until main/models/scan.ts + the
// models DB table exist. payload.modelId is accepted but ignored for now.
const TEMP_MODEL_PATH =
  '/Users/anass/.cache/huggingface/hub/models--ggml-org--gemma-4-12B-it-GGUF/snapshots/44ee90c4b61e888ac5b318a54ec7a94df61e9cd7/gemma-4-12B-it-Q4_K_M.gguf';

export function registerInferenceIpc(): void {
  ipcMain.on('inference:start', (event: IpcMainEvent, payload: InferenceStartPayload) => {
    const [port] = event.ports;
    if (!port) {
      return;
    }
    void handleInference(port, payload);
  });
}

async function handleInference(port: MessagePortMain, payload: InferenceStartPayload): Promise<void> {
  ensureChat(payload.chatId, payload.modelId);

  // payload.messages is the full running transcript (sent each turn so
  // llama.cpp has context) — only the last one is new from the db's point
  // of view, everything before it was already persisted on a prior turn.
  const newMessage = payload.messages[payload.messages.length - 1];
  if (newMessage) {
    addMessage(payload.chatId, newMessage);
  }

  const result = await streamInference({
    port,
    messages: payload.messages,
    modelPath: TEMP_MODEL_PATH,
  });

  if (result.status !== 'error' && result.content) {
    addMessage(payload.chatId, {
      id: randomUUID(),
      role: 'assistant',
      content: result.content,
      createdAt: Date.now(),
    });
  }
}
