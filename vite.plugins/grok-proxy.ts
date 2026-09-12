import type { IncomingMessage, ServerResponse } from 'node:http';
import type { Plugin } from 'vite';
import { HISTORY_PROFILE_SYSTEM_PROMPT } from '../src/services/grok/systemPrompt';
import { validateHistoryProfile } from '../src/services/grok/validate';

/**
 * Vite dev-server middleware that forwards POST /api/generate-history to
 * Grok (xAI). The API key stays in `process.env.GROK_API_KEY` and never
 * reaches the browser bundle.
 *
 * Production deployment currently only ships as `vite dev` — porting this
 * plugin to a real server (Cloudflare Worker, Express, etc.) is the next
 * step when we take this past the hackathon demo.
 */
export interface GrokProxyOptions {
  apiKey: string | undefined;
  model?: string;
  endpoint?: string;
}

interface GenerateHistoryBody {
  cityName?: unknown;
  latitude?: unknown;
  longitude?: unknown;
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

function extractJsonFromContent(content: string): string {
  const trimmed = content.trim();
  if (trimmed.startsWith('{')) return trimmed;
  // Strip common wrappers if the model ignored our "no fences" instruction.
  const fenceMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (fenceMatch) return fenceMatch[1].trim();
  const braceStart = trimmed.indexOf('{');
  const braceEnd = trimmed.lastIndexOf('}');
  if (braceStart >= 0 && braceEnd > braceStart) {
    return trimmed.slice(braceStart, braceEnd + 1);
  }
  return trimmed;
}

export function grokProxyPlugin(options: GrokProxyOptions): Plugin {
  const model = options.model ?? 'grok-4-latest';
  const endpoint = options.endpoint ?? 'https://api.x.ai/v1/chat/completions';
  return {
    name: '4dtraveler:grok-proxy',
    configureServer(server) {
      server.middlewares.use(
        '/api/generate-history',
        async (req, res, next) => {
          if (req.method !== 'POST') {
            return next();
          }
          if (!options.apiKey) {
            return respondJson(res, 503, {
              error:
                'GROK_API_KEY is not set. Add it to .env and restart Vite.',
            });
          }
          let body: GenerateHistoryBody;
          try {
            body = (await readJsonBody(req)) as GenerateHistoryBody;
          } catch (error) {
            return respondJson(res, 400, {
              error: 'Invalid JSON body',
              detail: error instanceof Error ? error.message : String(error),
            });
          }
          const cityName =
            typeof body.cityName === 'string' ? body.cityName : '';
          if (!cityName) {
            return respondJson(res, 400, { error: 'cityName is required' });
          }
          const userPrompt = `Generate the history profile for ${cityName}. Follow every rule in the system prompt.`;
          try {
            const upstream = await fetch(endpoint, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${options.apiKey}`,
              },
              body: JSON.stringify({
                model,
                temperature: 0.2,
                response_format: { type: 'json_object' },
                messages: [
                  {
                    role: 'system',
                    content: HISTORY_PROFILE_SYSTEM_PROMPT,
                  },
                  {
                    role: 'user',
                    content: userPrompt,
                  },
                ],
              }),
            });
            if (!upstream.ok) {
              const detail = await upstream.text().catch(() => '');
              return respondJson(res, 502, {
                error: `Grok upstream ${upstream.status}`,
                detail,
              });
            }
            const upstreamJson = (await upstream.json()) as {
              choices?: { message?: { content?: string } }[];
            };
            const content = upstreamJson.choices?.[0]?.message?.content;
            if (typeof content !== 'string' || content.length === 0) {
              return respondJson(res, 502, {
                error: 'Grok returned an empty completion',
              });
            }
            let parsed: unknown;
            try {
              parsed = JSON.parse(extractJsonFromContent(content));
            } catch (error) {
              return respondJson(res, 502, {
                error: 'Grok returned non-JSON content',
                detail: error instanceof Error ? error.message : String(error),
                sample: content.slice(0, 400),
              });
            }
            try {
              const validated = validateHistoryProfile(parsed);
              return respondJson(res, 200, validated);
            } catch (error) {
              return respondJson(res, 502, {
                error: 'Grok output failed schema validation',
                detail: error instanceof Error ? error.message : String(error),
              });
            }
          } catch (error) {
            return respondJson(res, 500, {
              error: 'Proxy failure',
              detail: error instanceof Error ? error.message : String(error),
            });
          }
        },
      );
    },
  };
}
