import type { IncomingMessage, ServerResponse } from 'node:http';
import type { Plugin } from 'vite';
import type { GeneratedHistoryProfile } from '../src/types/world';
import {
  mergeRefinedParts,
  objectsNeedingDetail,
  parseStructureDetailResponse,
  structureDetailUserPrompt,
} from '../src/services/grok/refineStructures';
import {
  HISTORY_PROFILE_SYSTEM_PROMPT,
  STRUCTURE_DETAIL_SYSTEM_PROMPT,
} from '../src/services/grok/systemPrompt';
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

const PROFILE_MAX_TOKENS = 16384;
const DETAIL_MAX_TOKENS = 12288;

interface GrokChatOptions {
  system: string;
  user: string;
  temperature: number;
  maxTokens: number;
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

class GrokUpstreamError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly detail?: string,
    readonly sample?: string,
  ) {
    super(message);
    this.name = 'GrokUpstreamError';
  }
}

async function completeGrokJson(
  options: GrokProxyOptions,
  chat: GrokChatOptions,
): Promise<unknown> {
  const model = options.model ?? 'grok-4-latest';
  const endpoint = options.endpoint ?? 'https://api.x.ai/v1/chat/completions';
  const upstream = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${options.apiKey}`,
    },
    body: JSON.stringify({
      model,
      temperature: chat.temperature,
      max_tokens: chat.maxTokens,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: chat.system },
        { role: 'user', content: chat.user },
      ],
    }),
  });
  if (!upstream.ok) {
    const detail = await upstream.text().catch(() => '');
    throw new GrokUpstreamError(
      `Grok upstream ${upstream.status}`,
      502,
      detail,
    );
  }
  const upstreamJson = (await upstream.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  const content = upstreamJson.choices?.[0]?.message?.content;
  if (typeof content !== 'string' || content.length === 0) {
    throw new GrokUpstreamError('Grok returned an empty completion', 502);
  }
  try {
    return JSON.parse(extractJsonFromContent(content));
  } catch (error) {
    throw new GrokUpstreamError(
      'Grok returned non-JSON content',
      502,
      error instanceof Error ? error.message : String(error),
      content.slice(0, 400),
    );
  }
}

/**
 * Second Grok pass: if the first profile still has thin silhouettes,
 * ask for denser `parts[]` and merge them. A failed detail pass keeps
 * the already-valid first profile so generation still succeeds.
 */
async function thickenThinStructures(
  options: GrokProxyOptions,
  profile: GeneratedHistoryProfile,
): Promise<GeneratedHistoryProfile> {
  const targets = objectsNeedingDetail(profile);
  if (targets.length === 0) return profile;
  try {
    const parsed = await completeGrokJson(options, {
      system: STRUCTURE_DETAIL_SYSTEM_PROMPT,
      user: structureDetailUserPrompt(profile.cityName, targets),
      temperature: 0.35,
      maxTokens: DETAIL_MAX_TOKENS,
    });
    const refinements = parseStructureDetailResponse(parsed);
    if (refinements.length === 0) return profile;
    return validateHistoryProfile(mergeRefinedParts(profile, refinements));
  } catch (error) {
    console.warn(
      '[grok] structure detail pass failed; keeping first profile:',
      error instanceof Error ? error.message : error,
    );
    return profile;
  }
}

export function grokProxyPlugin(options: GrokProxyOptions): Plugin {
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
          const latitude =
            typeof body.latitude === 'number' ? body.latitude : undefined;
          const longitude =
            typeof body.longitude === 'number' ? body.longitude : undefined;
          const coords =
            latitude !== undefined && longitude !== undefined
              ? ` (approx. ${latitude.toFixed(2)}, ${longitude.toFixed(2)})`
              : '';
          const userPrompt = `Generate the history profile for ${cityName}${coords}. Prefer real named buildings from that city. Every clickable object must be a multi-part miniature — roofs, openings, plinths, and an era ornament — not a lone box. Follow every rule in the system prompt.`;
          try {
            const parsed = await completeGrokJson(options, {
              system: HISTORY_PROFILE_SYSTEM_PROMPT,
              user: userPrompt,
              temperature: 0.3,
              maxTokens: PROFILE_MAX_TOKENS,
            });
            try {
              const validated = validateHistoryProfile(parsed);
              const detailed = await thickenThinStructures(options, validated);
              return respondJson(res, 200, detailed);
            } catch (error) {
              return respondJson(res, 502, {
                error: 'Grok output failed schema validation',
                detail: error instanceof Error ? error.message : String(error),
              });
            }
          } catch (error) {
            if (error instanceof GrokUpstreamError) {
              return respondJson(res, error.status, {
                error: error.message,
                detail: error.detail,
                sample: error.sample,
              });
            }
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
