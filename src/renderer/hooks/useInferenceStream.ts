import { useCallback, useRef, useState } from 'react';
import type { InferenceStartPayload } from '../../shared/types';

type PortMessage =
  | { type: 'token'; token: string }
  | { type: 'done'; reason?: string }
  | { type: 'error'; message: string };

export function useInferenceStream() {
  const [content, setContent] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const portRef = useRef<MessagePort | null>(null);

  const start = useCallback((payload: InferenceStartPayload, onComplete?: (content: string) => void) => {
    setContent('');
    setError(null);
    setIsStreaming(true);

    const { port1, port2 } = new MessageChannel();
    portRef.current = port1;
    let fullContent = '';

    port1.onmessage = (event: MessageEvent<PortMessage>) => {
      const data = event.data;
      if (data.type === 'token') {
        fullContent += data.token;
        setContent(fullContent);
        return;
      }
      if (data.type === 'error') {
        setError(data.message);
      }
      setIsStreaming(false);
      port1.close();
      portRef.current = null;
      if (fullContent) {
        onComplete?.(fullContent);
      }
    };

    window.postMessage({ type: 'jarvis:inference:start', payload }, '*', [port2]);
  }, []);

  const cancel = useCallback(() => {
    portRef.current?.postMessage({ type: 'cancel' });
  }, []);

  return { content, isStreaming, error, start, cancel };
}
