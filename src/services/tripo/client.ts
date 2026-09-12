/**
 * Browser-side client for the Tripo P1 (Smart Mesh) text-to-3D pipeline.
 * Transport goes through the Vite dev-server proxy in
 * `vite.plugins/tripo-proxy.ts` so the TRIPO_API_KEY never leaves the
 * machine.
 *
 * Tripo is asynchronous: POST returns a task_id, then we poll the task
 * endpoint until status is `success` and a `model_url` appears. Typical
 * P1 latency is 2–10 seconds. Callers should render a placeholder until
 * the mesh URL resolves.
 */
export interface TripoGenerateOptions {
  prompt: string;
  /** Aborts polling. The task on Tripo's side keeps running (best-effort). */
  signal?: AbortSignal;
  /** Milliseconds to wait before giving up on the whole task. */
  timeoutMs?: number;
  /** Milliseconds between successive polls. */
  pollIntervalMs?: number;
}

export interface TripoGenerateResult {
  modelUrl: string;
  taskId: string;
}

export class TripoError extends Error {
  constructor(
    message: string,
    readonly cause?: unknown,
  ) {
    super(message);
    this.name = 'TripoError';
  }
}

interface TaskEnvelope {
  status?: string;
  progress?: number;
  model_url?: string;
  error?: string;
}

async function fetchJson(url: string, init?: RequestInit): Promise<unknown> {
  const response = await fetch(url, init);
  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new TripoError(
      `${init?.method ?? 'GET'} ${url} failed with ${response.status}: ${body || response.statusText}`,
    );
  }
  return (await response.json()) as unknown;
}

function delay(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) return reject(signal.reason);
    const timeout = setTimeout(() => {
      if (signal) signal.removeEventListener('abort', onAbort);
      resolve();
    }, ms);
    const onAbort = () => {
      clearTimeout(timeout);
      reject(signal!.reason);
    };
    signal?.addEventListener('abort', onAbort, { once: true });
  });
}

export async function generateTripoMesh(
  options: TripoGenerateOptions,
): Promise<TripoGenerateResult> {
  const timeoutMs = options.timeoutMs ?? 60_000;
  const pollIntervalMs = options.pollIntervalMs ?? 2_000;

  const kick = (await fetchJson('/api/tripo/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt: options.prompt }),
    signal: options.signal,
  })) as { taskId?: unknown };
  const taskId =
    typeof kick.taskId === 'string' && kick.taskId.length > 0
      ? kick.taskId
      : null;
  if (!taskId) throw new TripoError('Tripo proxy did not return a taskId');

  const startedAt = Date.now();
  // Polling loop. Bail out if the task takes longer than the timeout —
  // callers can just keep showing the primitive silhouette in that case.
  for (;;) {
    await delay(pollIntervalMs, options.signal);
    if (Date.now() - startedAt > timeoutMs) {
      throw new TripoError(
        `Tripo task ${taskId} did not finish in ${timeoutMs}ms`,
      );
    }
    const envelope = (await fetchJson(
      `/api/tripo/task/${encodeURIComponent(taskId)}`,
      { signal: options.signal },
    )) as TaskEnvelope;
    const status = envelope.status;
    if (status === 'success' && typeof envelope.model_url === 'string') {
      return { modelUrl: envelope.model_url, taskId };
    }
    if (status === 'failed' || status === 'cancelled' || status === 'expired') {
      throw new TripoError(
        `Tripo task ${taskId} finished with status="${status}"${
          envelope.error ? `: ${envelope.error}` : ''
        }`,
      );
    }
    // Any other status ("running", "queued", "processing", ...) → keep polling.
  }
}
