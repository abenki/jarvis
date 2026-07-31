import { ipcMain, type IpcMainEvent } from 'electron';
import type { InferenceStartPayload } from '../../shared/types';
import { streamInference } from '../llama/generate';

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
    void streamInference({ port, messages: payload.messages, modelPath: TEMP_MODEL_PATH });
  });
}
