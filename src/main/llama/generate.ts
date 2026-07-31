import type { MessagePortMain } from 'electron';
import type { ChatMessage } from '../../shared/types';
import { getCurrentPort, startLlamaServer } from './server';

interface StreamInferenceArgs {
  port: MessagePortMain;
  messages: ChatMessage[];
  modelPath: string;
}

type PortMessage = { type: 'cancel' };

export async function streamInference({ port, messages, modelPath }: StreamInferenceArgs): Promise<void> {
  const controller = new AbortController();

  port.on('message', (event) => {
    const data = event.data as PortMessage;
    if (data?.type === 'cancel') {
      controller.abort();
    }
  });
  port.start();

  try {
    let llamaPort = getCurrentPort();
    if (llamaPort === null) {
      const result = await startLlamaServer(modelPath);
      llamaPort = result.port;
    }

    const response = await fetch(`http://127.0.0.1:${llamaPort}/v1/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: messages.map(({ role, content }) => ({ role, content })),
        stream: true,
      }),
      signal: controller.signal,
    });

    if (!response.body) {
      throw new Error('No response body from llama-server');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith('data:')) continue;

        const data = trimmed.slice('data:'.length).trim();
        if (data === '[DONE]') continue;

        const parsed = JSON.parse(data);
        const token: string | undefined = parsed.choices?.[0]?.delta?.content;
        if (token) {
          port.postMessage({ type: 'token', token });
        }
      }
    }

    port.postMessage({ type: 'done' });
  } catch (err) {
    if (controller.signal.aborted) {
      port.postMessage({ type: 'done', reason: 'cancelled' });
    } else {
      port.postMessage({
        type: 'error',
        message: err instanceof Error ? err.message : String(err),
      });
    }
  } finally {
    port.close();
  }
}
