import type { ModelInfo } from '../shared/types';

declare global {
  interface Window {
    jarvis: {
      getDefaultModel: () => Promise<ModelInfo | null>;
    };
  }
}

export {};
