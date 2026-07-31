import path from 'node:path';
import { app } from 'electron';

/**
 * In dev, we rely on `llama-server` being resolvable via PATH (e.g. a Homebrew
 * install) unless LLAMA_SERVER_PATH overrides it. Packaged builds ship a pinned
 * binary under resources/bin, since a GUI app's PATH can't be trusted to include
 * Homebrew's prefix.
 */
export function resolveLlamaServerPath(): string {
  if (app.isPackaged) {
    return path.join(process.resourcesPath, 'bin', 'llama-server');
  }
  return process.env.LLAMA_SERVER_PATH ?? 'llama-server';
}
