import fs from 'node:fs';
import path from 'node:path';
import { app } from 'electron';
import type { ModelInfo } from '../../shared/types';
import { listModels, upsertModel, getDefaultModel, setDefaultModel } from '../db/models';

export function getModelsDir(): string {
  const dir = path.join(app.getPath('userData'), 'models');
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

// The managed folder full of symlinks IS the model list — scanning it is
// the source of truth for "what models exist." The db only adds metadata
// (default flag, nickname, last-used) on top, keyed by filename.
export function scanModelsFolder(): ModelInfo[] {
  const dir = getModelsDir();
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const stored = new Map(listModels().map((model) => [model.id, model]));
  const results: ModelInfo[] = [];

  for (const entry of entries) {
    if (!entry.isSymbolicLink()) continue;

    const symlinkPath = path.join(dir, entry.name);
    let targetPath: string;
    let available: boolean;
    try {
      // Follows the full symlink chain (relevant since e.g. Hugging Face's
      // cache stores files as symlinks into a blobs/ dir) and throws if the
      // final target doesn't exist.
      targetPath = fs.realpathSync(symlinkPath);
      available = true;
    } catch {
      targetPath = fs.readlinkSync(symlinkPath);
      available = false;
    }

    const id = entry.name;
    const existing = stored.get(id);

    results.push({
      id,
      filename: entry.name,
      symlinkPath,
      targetPath,
      isDefault: existing?.isDefault ?? false,
      nickname: existing?.nickname ?? null,
      lastUsedAt: existing?.lastUsedAt ?? null,
      available,
    });
  }

  return results;
}

// Symlinks the given model file into the managed folder rather than copying
// it, so multi-gigabyte GGUFs never get duplicated on disk.
export function addModel(sourcePath: string): ModelInfo {
  const dir = getModelsDir();
  const filename = path.basename(sourcePath);
  const symlinkPath = path.join(dir, filename);

  if (!fs.existsSync(symlinkPath)) {
    fs.symlinkSync(sourcePath, symlinkPath);
  }

  const model: ModelInfo = {
    id: filename,
    filename,
    symlinkPath,
    targetPath: sourcePath,
    isDefault: false,
    nickname: null,
    lastUsedAt: null,
    available: true,
  };

  upsertModel(model);
  return model;
}

// Resolves a model id (as sent by the renderer in InferenceStartPayload) to
// the real file path to hand llama-server, following the managed symlink to
// its final target. Returns null if the id is unknown or its symlink is
// currently broken.
export function resolveModelPath(modelId: string): string | null {
  const model = scanModelsFolder().find((m) => m.id === modelId && m.available);
  return model ? model.targetPath : null;
}

// Run once at app startup: if no default model is set yet but at least one
// available model exists in the managed folder, pick the first one.
export function ensureDefaultModel(): void {
  if (getDefaultModel()) return;
  const [first] = scanModelsFolder().filter((m) => m.available);
  if (first) {
    setDefaultModel(first.id);
  }
}
