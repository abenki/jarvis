export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  createdAt: number;
}

export interface ModelInfo {
  id: string;
  filename: string;
  symlinkPath: string;
  targetPath: string;
  isDefault: boolean;
  nickname: string | null;
  lastUsedAt: number | null;
  /** false when the symlink target no longer exists (moved/unmounted volume) */
  available: boolean;
}

export interface InferenceStartPayload {
  chatId: string;
  modelId: string;
  messages: ChatMessage[];
}
