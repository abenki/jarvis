import { useState } from 'react';
import { useInferenceStream } from './hooks/useInferenceStream';
import type { ChatMessage } from '../shared/types';

function App() {
  const [chatId] = useState(() => crypto.randomUUID());
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const { content, isStreaming, error, start, cancel } = useInferenceStream();

  const send = () => {
    if (!input.trim() || isStreaming) return;

    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: input,
      createdAt: Date.now(),
    };
    const history = [...messages, userMessage];
    setMessages(history);
    setInput('');

    start({ chatId, modelId: 'temp', messages: history }, (finalContent) => {
      setMessages((prev) => [
        ...prev,
        { id: crypto.randomUUID(), role: 'assistant', content: finalContent, createdAt: Date.now() },
      ]);
    });
  };

  return (
    <div style={{ padding: 16, fontFamily: 'sans-serif' }}>
      <h1>Jarvis</h1>
      <div style={{ marginBottom: 16 }}>
        {messages.map((m) => (
          <p key={m.id}>
            <strong>{m.role}:</strong> {m.content}
          </p>
        ))}
        {isStreaming && (
          <p>
            <strong>assistant:</strong> {content}
          </p>
        )}
      </div>
      <textarea
        value={input}
        onChange={(e) => setInput(e.target.value)}
        rows={3}
        style={{ width: '100%' }}
        placeholder="Type a message..."
      />
      <div style={{ marginTop: 8 }}>
        <button onClick={send} disabled={isStreaming}>
          {isStreaming ? 'Generating…' : 'Send'}
        </button>
        {isStreaming && (
          <button onClick={cancel} style={{ marginLeft: 8 }}>
            Stop
          </button>
        )}
      </div>
      {error && <p style={{ color: 'red' }}>Error: {error}</p>}
    </div>
  );
}

export default App;
