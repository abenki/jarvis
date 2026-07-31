import { ipcMain, type IpcMainEvent, type MessagePortMain } from 'electron';
import { randomUUID } from 'node:crypto';
import type { InferenceStartPayload } from '../../shared/types';
import { streamInference } from '../llama/generate';
import { ensureChat, addMessage } from '../db/chats';
import { resolveModelPath } from '../models/scan';

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
  const modelPath = resolveModelPath(payload.modelId);
  if (!modelPath) {
    port.postMessage({ type: 'error', message: `Model not found or unavailable: ${payload.modelId}` });
    port.close();
    return;
  }

  ensureChat(payload.chatId, payload.modelId);

  // payload.messages is the full running transcript (sent each turn so
  // llama.cpp has context) — only the last one is new from the db's point
  // of view, everything before it was already persisted on a prior turn.
  const newMessage = payload.messages[payload.messages.length - 1];
  if (newMessage) {
    addMessage(payload.chatId, newMessage);
  }

  const result = await streamInference({ port, messages: payload.messages, modelPath });

  if (result.status !== 'error' && result.content) {
    addMessage(payload.chatId, {
      id: randomUUID(),
      role: 'assistant',
      content: result.content,
      createdAt: Date.now(),
    });
  }
}
