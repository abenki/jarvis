import { ipcMain } from 'electron';
import { getDefaultModel } from '../db/models';
import { scanModelsFolder } from '../models/scan';
import type { ModelInfo } from '../../shared/types';

export function registerModelsIpc(): void {
  ipcMain.handle('models:get-default', (): ModelInfo | null => {
    const stored = getDefaultModel();
    if (!stored) return null;
    return scanModelsFolder().find((m) => m.id === stored.id) ?? null;
  });
}
