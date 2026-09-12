import type { IncomingMessage, ServerResponse } from 'node:http';
import type { Plugin } from 'vite';

/**
 * Vite dev-server middleware that mirrors three Tripo v3 endpoints so
 * the browser never sees the API key AND never has to fetch cross-origin
 * from Tripo's CloudFront (which responds without any
 * Access-Control-Allow-Origin header):
 *
 *   POST /api/tripo/generate           -> POST /v3/generation/text-to-model
 *   GET  /api/tripo/task/:id           -> GET  /v3/tasks/:id
 *   GET  /api/tripo/model?url=<signed> -> streams the GLB same-origin
 *
 * Production port to a real server is the same follow-up as the Grok
 * proxy — dev-only until we deploy.
 */
export interface TripoProxyOptions {
  apiKey: string | undefined;
  /**
   * Defaults to `P1-20260311` — Tripo's low-poly Smart Mesh model.
   * Measured latency:
   *   P1-20260311  ~57 s per prompt (Space Needle, same wording)
   *   v3.1-20260211 ~119 s per prompt (same wording)
   * The docs claim 2–10 s for P1 but that appears to be marketing.
   * P1 accepts text prompts via /v3/generation/text-to-model despite
   * the docs listing it under image-to-model workflows.
   */
  model?: string;
  /** Base URL for Tripo's REST API. */
  endpoint?: string;
}

interface GenerateBody {
  prompt?: unknown;
}

async function readJsonBody(req: IncomingMessage): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', (chunk: Buffer | string) => {
      chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
    });
    req.on('end', () => {
      const raw = Buffer.concat(chunks).toString('utf8');
      if (!raw) return resolve({});
      try {
        resolve(JSON.parse(raw));
      } catch (error) {
        reject(error);
      }
    });
    req.on('error', reject);
  });
}

function respondJson(res: ServerResponse, status: number, body: unknown) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(body));
}

export function tripoProxyPlugin(options: TripoProxyOptions): Plugin {
  const model = options.model ?? 'P1-20260311';
  const endpoint = options.endpoint ?? 'https://openapi.tripo3d.ai';
  return {
    name: '4dtraveler:tripo-proxy',
    configureServer(server) {
      // POST /api/tripo/generate -> kick off a text-to-model task.
      server.middlewares.use('/api/tripo/generate', async (req, res, next) => {
        if (req.method !== 'POST') return next();
        if (!options.apiKey) {
          return respondJson(res, 503, {
            error: 'TRIPO_API_KEY is not set. Add it to .env and restart Vite.',
          });
        }
        let body: GenerateBody;
        try {
          body = (await readJsonBody(req)) as GenerateBody;
        } catch (error) {
          return respondJson(res, 400, {
            error: 'Invalid JSON body',
            detail: error instanceof Error ? error.message : String(error),
          });
        }
        const prompt =
          typeof body.prompt === 'string' ? body.prompt.trim() : '';
        if (!prompt) {
          return respondJson(res, 400, { error: 'prompt is required' });
        }
        try {
          const upstream = await fetch(
            `${endpoint}/v3/generation/text-to-model`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${options.apiKey}`,
              },
              body: JSON.stringify({ model, prompt }),
            },
          );
          const json = (await upstream.json().catch(() => null)) as {
            code?: number;
            data?: { task_id?: string };
            message?: string;
          } | null;
          if (!upstream.ok || !json) {
            return respondJson(res, 502, {
              error: `Tripo upstream ${upstream.status}`,
              detail: json?.message ?? upstream.statusText,
            });
          }
          const taskId = json.data?.task_id;
          if (typeof taskId !== 'string' || taskId.length === 0) {
            return respondJson(res, 502, {
              error: 'Tripo response missing task_id',
              detail: JSON.stringify(json).slice(0, 400),
            });
          }
          return respondJson(res, 200, { taskId });
        } catch (error) {
          return respondJson(res, 500, {
            error: 'Proxy failure',
            detail: error instanceof Error ? error.message : String(error),
          });
        }
      });

      // GET /api/tripo/task/:id -> poll a task.
      server.middlewares.use('/api/tripo/task/', async (req, res, next) => {
        if (req.method !== 'GET') return next();
        if (!options.apiKey) {
          return respondJson(res, 503, {
            error: 'TRIPO_API_KEY is not set. Add it to .env and restart Vite.',
          });
        }
        const url = req.url ?? '';
        // req.url here is scoped to the middleware mount, so it looks like
        // `/<task_id>` or `/<task_id>?_=cachebust`. Trim to just the id.
        const idPart = url.split('?')[0].replace(/^\/+/, '');
        const taskId = decodeURIComponent(idPart);
        if (!taskId) {
          return respondJson(res, 400, { error: 'task id is required' });
        }
        try {
          const upstream = await fetch(
            `${endpoint}/v3/tasks/${encodeURIComponent(taskId)}`,
            {
              headers: {
                Authorization: `Bearer ${options.apiKey}`,
              },
            },
          );
          const json = (await upstream.json().catch(() => null)) as {
            code?: number;
            data?: {
              status?: string;
              progress?: number;
              output?: { model_url?: string; rendered_image_url?: string };
              error?: string;
            };
            message?: string;
          } | null;
          if (!upstream.ok || !json) {
            return respondJson(res, 502, {
              error: `Tripo upstream ${upstream.status}`,
              detail: json?.message ?? upstream.statusText,
            });
          }
          const data = json.data ?? {};
          // Tripo's CloudFront-signed model URLs are served without
          // Access-Control-Allow-Origin headers, so the browser will
          // block a direct fetch. Rewrite through our own streaming
          // route so useGLTF sees a same-origin URL.
          const rewriteModelUrl = (u?: string) =>
            typeof u === 'string' && u.length > 0
              ? `/api/tripo/model?url=${encodeURIComponent(u)}`
              : u;
          return respondJson(res, 200, {
            status: data.status,
            progress: data.progress,
            model_url: rewriteModelUrl(data.output?.model_url),
            rendered_image_url: rewriteModelUrl(
              data.output?.rendered_image_url,
            ),
            error: data.error,
          });
        } catch (error) {
          return respondJson(res, 500, {
            error: 'Proxy failure',
            detail: error instanceof Error ? error.message : String(error),
          });
        }
      });

      // GET /api/tripo/model?url=<signed cloudfront url> -> stream the
      // GLB body (or rendered image) back to the browser same-origin.
      // Only URLs whose host is under tripo3d.com are proxied to avoid
      // turning this into an open SSRF forwarder.
      server.middlewares.use('/api/tripo/model', async (req, res, next) => {
        if (req.method !== 'GET') return next();
        const rawUrl = req.url ?? '';
        const qs = rawUrl.split('?')[1] ?? '';
        const params = new URLSearchParams(qs);
        const target = params.get('url');
        if (!target) {
          return respondJson(res, 400, { error: 'url is required' });
        }
        let parsed: URL;
        try {
          parsed = new URL(target);
        } catch (error) {
          return respondJson(res, 400, {
            error: 'invalid url',
            detail: error instanceof Error ? error.message : String(error),
          });
        }
        if (
          parsed.protocol !== 'https:' ||
          !parsed.hostname.endsWith('tripo3d.com')
        ) {
          return respondJson(res, 400, {
            error: 'url host must be *.tripo3d.com',
            detail: parsed.hostname,
          });
        }
        try {
          const upstream = await fetch(parsed.toString());
          if (!upstream.ok || !upstream.body) {
            return respondJson(res, 502, {
              error: `Tripo asset upstream ${upstream.status}`,
              detail: upstream.statusText,
            });
          }
          res.statusCode = 200;
          const contentType =
            upstream.headers.get('content-type') ?? 'application/octet-stream';
          res.setHeader('Content-Type', contentType);
          const contentLength = upstream.headers.get('content-length');
          if (contentLength) res.setHeader('Content-Length', contentLength);
          res.setHeader('Cache-Control', 'private, max-age=240');
          // Tripo GLBs are typically <5 MB. Pipe rather than buffering
          // so first bytes reach the browser immediately.
          const reader = upstream.body.getReader();
          for (;;) {
            const { value, done } = await reader.read();
            if (done) break;
            if (value) res.write(Buffer.from(value));
          }
          res.end();
        } catch (error) {
          return respondJson(res, 500, {
            error: 'Proxy failure',
            detail: error instanceof Error ? error.message : String(error),
          });
        }
      });
    },
  };
}
