import { useState } from 'react';
import { useInferenceStream } from './hooks/useInferenceStream';
import type { ChatMessage } from '../shared/types';

function App() {
  const [input, setInput] = useState('');
  const { content, isStreaming, error, start, cancel } = useInferenceStream();

  const send = () => {
    if (!input.trim() || isStreaming) return;
    const message: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: input,
      createdAt: Date.now(),
    };
    start({ chatId: crypto.randomUUID(), modelId: 'temp', messages: [message] });
    setInput('');
  };

  return (
    <div style={{ padding: 16, fontFamily: 'sans-serif' }}>
      <h1>Jarvis</h1>
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
      <pre style={{ whiteSpace: 'pre-wrap', marginTop: 16 }}>{content}</pre>
    </div>
  );
}

export default App;
