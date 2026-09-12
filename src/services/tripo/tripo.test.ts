import { afterEach, describe, expect, it, vi } from 'vitest';
import { generateTripoMesh, TripoError } from './client';

const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
  vi.restoreAllMocks();
});

function mockFetch(
  handlers: Array<(url: string) => Response | Promise<Response>>,
) {
  let call = 0;
  globalThis.fetch = vi.fn(async (input: RequestInfo | URL) => {
    const url = typeof input === 'string' ? input : input.toString();
    const handler = handlers[Math.min(call, handlers.length - 1)];
    call += 1;
    return handler(url);
  }) as unknown as typeof fetch;
}

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('generateTripoMesh', () => {
  it('polls until status=success and returns the model_url', async () => {
    mockFetch([
      () => jsonResponse(200, { taskId: 'task_abc' }),
      () => jsonResponse(200, { status: 'queued' }),
      () => jsonResponse(200, { status: 'running', progress: 40 }),
      () =>
        jsonResponse(200, {
          status: 'success',
          model_url: 'https://cdn.tripo/model.glb',
        }),
    ]);
    const progress: { status: string; percent: number }[] = [];
    const result = await generateTripoMesh({
      prompt: 'a low-poly cabin',
      pollIntervalMs: 1,
      timeoutMs: 5_000,
      onProgress: (update) =>
        progress.push({ status: update.status, percent: update.progress }),
    });
    expect(result).toEqual({
      modelUrl: 'https://cdn.tripo/model.glb',
      taskId: 'task_abc',
    });
    // The final "success" poll does not trigger onProgress; only the
    // non-terminal polls do.
    expect(progress).toEqual([
      { status: 'queued', percent: 0 },
      { status: 'running', percent: 40 },
    ]);
  });

  it('throws TripoError when the task reports failed', async () => {
    mockFetch([
      () => jsonResponse(200, { taskId: 'task_bad' }),
      () =>
        jsonResponse(200, {
          status: 'failed',
          error: 'safety_filter',
        }),
    ]);
    await expect(
      generateTripoMesh({
        prompt: 'nope',
        pollIntervalMs: 1,
        timeoutMs: 2_000,
      }),
    ).rejects.toBeInstanceOf(TripoError);
  });

  it('throws TripoError when the task exceeds the timeout', async () => {
    mockFetch([
      () => jsonResponse(200, { taskId: 'task_slow' }),
      () => jsonResponse(200, { status: 'running' }),
    ]);
    await expect(
      generateTripoMesh({
        prompt: 'infinite loop',
        pollIntervalMs: 5,
        timeoutMs: 10,
      }),
    ).rejects.toBeInstanceOf(TripoError);
  });
});
