import { spawn, ChildProcess } from 'node:child_process';
import net from 'node:net';
import { resolveLlamaServerPath } from './binary';

let currentProcess: ChildProcess | null = null;
let currentPort: number | null = null;

export function findFreePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.unref();
    server.on('error', reject);
    server.listen(0, () => {
      const address = server.address();
      if (address && typeof address === 'object') {
        const { port } = address;
        server.close(() => resolve(port));
      } else {
        server.close();
        reject(new Error('Could not determine a free port'));
      }
    });
  });
}

export async function waitForReady(port: number, timeoutMs = 60000): Promise<void> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(`http://127.0.0.1:${port}/health`);
      if (res.ok) return;
    } catch {
      // Server socket not open yet; keep polling.
    }
    await new Promise((resolve) => setTimeout(resolve, 300));
  }
  throw new Error(`llama-server did not become ready on port ${port} within ${timeoutMs}ms`);
}

export async function startLlamaServer(modelPath: string): Promise<{ port: number }> {
  if (currentProcess) {
    await stopLlamaServer();
  }

  const port = await findFreePort();
  const binaryPath = resolveLlamaServerPath();

  const child = spawn(
    binaryPath,
    ['--model', modelPath, '--port', String(port), '--n-gpu-layers', '99', '--ctx-size', '8192'],
    { stdio: ['ignore', 'pipe', 'pipe'] },
  );

  child.stdout?.on('data', (chunk: Buffer) => {
    console.log(`[llama-server] ${chunk.toString().trim()}`);
  });
  child.stderr?.on('data', (chunk: Buffer) => {
    console.error(`[llama-server] ${chunk.toString().trim()}`);
  });
  child.on('exit', (code) => {
    console.log(`[llama-server] exited with code ${code}`);
    if (currentProcess === child) {
      currentProcess = null;
      currentPort = null;
    }
  });

  currentProcess = child;
  currentPort = port;

  await waitForReady(port);
  return { port };
}

export function stopLlamaServer(): Promise<void> {
  return new Promise((resolve) => {
    if (!currentProcess) {
      resolve();
      return;
    }
    const proc = currentProcess;
    proc.once('exit', () => resolve());
    proc.kill();
    currentProcess = null;
    currentPort = null;
  });
}

export function getCurrentPort(): number | null {
  return currentPort;
}
