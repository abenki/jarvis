// See the Electron documentation for details on how to use preload scripts:
// https://www.electronjs.org/docs/latest/tutorial/process-model#preload-scripts

import { contextBridge, ipcRenderer } from 'electron';
import type { ModelInfo } from '../shared/types';

// Plain request/response data (no MessagePort involved) can go through
// contextBridge normally — the transfer issue below only applies to ports.
contextBridge.exposeInMainWorld('jarvis', {
  getDefaultModel: (): Promise<ModelInfo | null> => ipcRenderer.invoke('models:get-default'),
});

// A MessagePort created in the renderer's main world can't be passed through
// contextBridge's function-argument marshaling (it stops being a real
// transferable object). window.postMessage is a native engine-level transfer
// that survives the isolated-world boundary correctly, so we relay through it
// instead: main world -> window.postMessage -> preload listener -> ipcRenderer.
window.addEventListener('message', (event: MessageEvent) => {
  if (event.data?.type !== 'jarvis:inference:start') return;
  const [port] = event.ports;
  if (!port) return;
  ipcRenderer.postMessage('inference:start', event.data.payload, [port]);
});
