import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  _resetTripoCacheForTests,
  generateTripoMesh,
  TripoError,
} from './client';

const originalFetch = globalThis.fetch;

beforeEach(() => {
  _resetTripoCacheForTests();
});

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

  it('serves the second call from cache without re-hitting the proxy', async () => {
    let calls = 0;
    globalThis.fetch = vi.fn(async (input: RequestInfo | URL) => {
      calls += 1;
      const url = typeof input === 'string' ? input : input.toString();
      if (url === '/api/tripo/generate') {
        return jsonResponse(200, { taskId: 'task_cache' });
      }
      return jsonResponse(200, {
        status: 'success',
        model_url: 'https://cdn.tripo/space-needle.glb',
      });
    }) as unknown as typeof fetch;

    const first = await generateTripoMesh({
      prompt: 'cached space needle',
      pollIntervalMs: 1,
      timeoutMs: 5_000,
    });
    const second = await generateTripoMesh({
      prompt: 'cached space needle',
      pollIntervalMs: 1,
      timeoutMs: 5_000,
    });
    expect(first).toEqual(second);
    // First call: 1 POST + 1 GET = 2 fetches. Second call: 0 fetches (cache hit).
    expect(calls).toBe(2);
  });

  it('does NOT cache failed generations (next mount can retry)', async () => {
    let generateCalls = 0;
    globalThis.fetch = vi.fn(async (input: RequestInfo | URL) => {
      const url = typeof input === 'string' ? input : input.toString();
      if (url === '/api/tripo/generate') {
        generateCalls += 1;
        return jsonResponse(200, { taskId: `task_${generateCalls}` });
      }
      // First run fails, second run succeeds.
      if (generateCalls === 1) {
        return jsonResponse(200, { status: 'failed', error: 'safety' });
      }
      return jsonResponse(200, {
        status: 'success',
        model_url: 'https://cdn.tripo/model.glb',
      });
    }) as unknown as typeof fetch;

    await expect(
      generateTripoMesh({
        prompt: 'retry me',
        pollIntervalMs: 1,
        timeoutMs: 5_000,
      }),
    ).rejects.toBeInstanceOf(TripoError);

    const result = await generateTripoMesh({
      prompt: 'retry me',
      pollIntervalMs: 1,
      timeoutMs: 5_000,
    });
    expect(result.modelUrl).toBe('https://cdn.tripo/model.glb');
    expect(generateCalls).toBe(2);
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
