/**
 * Client for the city-retrieval RAG + Grok TTS service.
 *
 * Dev traffic goes through the Vite proxy:
 *   POST /api/city-summary  →  FastAPI /api/monument
 *   POST /api/city-tts      →  FastAPI /api/tts
 *
 * Never throws to the UI. Failed calls resolve to `null` so the
 * information panel can hide the RAG/narration block.
 */

const SUMMARY_ENDPOINT = '/api/city-summary';
const TTS_ENDPOINT = '/api/city-tts';
const AMBIENCE_ENDPOINT = '/api/city-ambience';
const DEFAULT_TIMEOUT_MS = 60_000;

interface FetchOptions {
  fetchImpl?: typeof fetch;
  bypassCache?: boolean;
  timeoutMs?: number;
}

export interface TicketLink {
  title: string;
  url: string;
}

export interface MonumentSummary {
  answer: string;
  tickets: TicketLink[];
}

const summaryCache = new Map<string, Promise<MonumentSummary | null>>();
const speechCache = new Map<string, Promise<string | null>>();
const ambienceCache = new Map<string, Promise<string | null>>();

export interface AmbienceQuery {
  city: string;
  place: string;
  year?: number;
  hint?: string;
}

export function ambienceCacheKey(input: AmbienceQuery): string {
  return JSON.stringify({
    city: input.city.trim(),
    place: input.place.trim(),
    year: input.year ?? null,
    hint: (input.hint ?? '').trim(),
  });
}

/** Structured input so the query composition is auditable and testable. */
export interface MonumentSummaryQuery {
  city: string;
  object: string;
  /** Historical year of the active era, when known. */
  year?: number;
  hint?: string;
}

export function summaryCacheKey(input: MonumentSummaryQuery): string {
  return JSON.stringify({
    city: input.city.trim(),
    object: input.object.trim(),
    year: input.year ?? null,
    hint: (input.hint ?? '').trim(),
  });
}

/** Compose a human-readable query — used by tests and logs, not the wire body. */
export function composeQuery(input: MonumentSummaryQuery): string {
  const trimmedHint = (input.hint ?? '').trim();
  const hintClause = trimmedHint
    ? ` The user context is: "${trimmedHint}".`
    : '';
  const yearClause =
    typeof input.year === 'number'
      ? ` Describe it as a visitor in the year ${input.year} would have understood it.`
      : '';
  return `Summarize the historical monument "${input.object}" in ${input.city} in 2-3 sentences. Focus on its origin, cultural significance, and what makes it recognizable.${yearClause}${hintClause}`;
}

function withTimeout(
  doFetch: typeof fetch,
  input: RequestInfo | URL,
  init: RequestInit,
  timeoutMs: number,
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  return doFetch(input, { ...init, signal: controller.signal }).finally(() =>
    clearTimeout(timer),
  );
}

export function parseTicketLinks(raw: unknown): TicketLink[] {
  if (!Array.isArray(raw)) return [];
  const tickets: TicketLink[] = [];
  for (const entry of raw) {
    if (!entry || typeof entry !== 'object') continue;
    const record = entry as { title?: unknown; url?: unknown };
    if (typeof record.title !== 'string' || typeof record.url !== 'string')
      continue;
    const title = record.title.trim();
    const url = record.url.trim();
    if (!title || !/^https:\/\//.test(url) || /\s/.test(url)) continue;
    tickets.push({ title, url });
    if (tickets.length >= 3) break;
  }
  return tickets;
}

function rememberFailure<T>(
  cache: Map<string, Promise<T | null>>,
  key: string,
  promise: Promise<T | null>,
) {
  void promise.then((value) => {
    if (value === null) {
      setTimeout(() => {
        if (cache.get(key) === promise) cache.delete(key);
      }, 5_000);
    }
  });
}

/**
 * Fetch a RAG-generated spoken-tour summary for a monument.
 * Returns `null` (never throws) if the service is unreachable.
 */
export function fetchMonumentSummary(
  input: MonumentSummaryQuery,
  options: FetchOptions = {},
): Promise<MonumentSummary | null> {
  const key = summaryCacheKey(input);
  if (!options.bypassCache) {
    const cached = summaryCache.get(key);
    if (cached) return cached;
  }

  const doFetch = options.fetchImpl ?? fetch;
  const promise = withTimeout(
    doFetch,
    SUMMARY_ENDPOINT,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        city: input.city,
        monument: input.object,
        year: input.year,
        hint: input.hint ?? '',
      }),
    },
    options.timeoutMs ?? DEFAULT_TIMEOUT_MS,
  )
    .then(async (response) => {
      if (!response.ok) return null;
      const payload = (await response.json()) as {
        answer?: unknown;
        tickets?: unknown;
      };
      const answer =
        typeof payload.answer === 'string' ? payload.answer.trim() : '';
      if (!answer) return null;
      return { answer, tickets: parseTicketLinks(payload.tickets) };
    })
    .catch(() => null);

  summaryCache.set(key, promise);
  rememberFailure(summaryCache, key, promise);
  return promise;
}

/**
 * Ask Grok TTS to speak `text`. Returns an object-URL for an MP3 blob,
 * or `null` if TTS is unavailable. Caller should revoke the URL on unmount.
 */
export function fetchMonumentSpeech(
  text: string,
  options: FetchOptions = {},
): Promise<string | null> {
  const trimmed = text.trim();
  if (!trimmed) return Promise.resolve(null);
  if (!options.bypassCache) {
    const cached = speechCache.get(trimmed);
    if (cached) return cached;
  }

  const doFetch = options.fetchImpl ?? fetch;
  const promise = withTimeout(
    doFetch,
    TTS_ENDPOINT,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: trimmed, voice_id: 'ara' }),
    },
    options.timeoutMs ?? 45_000,
  )
    .then(async (response) => {
      if (!response.ok) return null;
      const blob = await response.blob();
      if (blob.size === 0) return null;
      return URL.createObjectURL(blob);
    })
    .catch(() => null);

  speechCache.set(trimmed, promise);
  rememberFailure(speechCache, trimmed, promise);
  return promise;
}

/**
 * Ask Grok to design and mix a looping street bed for this place and year.
 * Returns an object-URL for a WAV blob, or `null` if unavailable.
 */
export function fetchSceneAmbience(
  input: AmbienceQuery,
  options: FetchOptions = {},
): Promise<string | null> {
  const key = ambienceCacheKey(input);
  if (!input.city.trim() || !input.place.trim()) return Promise.resolve(null);
  if (!options.bypassCache) {
    const cached = ambienceCache.get(key);
    if (cached) return cached;
  }

  const doFetch = options.fetchImpl ?? fetch;
  const promise = withTimeout(
    doFetch,
    AMBIENCE_ENDPOINT,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        city: input.city,
        place: input.place,
        year: input.year,
        hint: input.hint ?? '',
      }),
    },
    options.timeoutMs ?? 80_000,
  )
    .then(async (response) => {
      if (!response.ok) return null;
      const blob = await response.blob();
      if (blob.size === 0) return null;
      return URL.createObjectURL(blob);
    })
    .catch(() => null);

  ambienceCache.set(key, promise);
  rememberFailure(ambienceCache, key, promise);
  return promise;
}

export function _cachedKeys(): string[] {
  return Array.from(summaryCache.keys());
}

export function _resetCache(): void {
  summaryCache.clear();
  speechCache.clear();
  ambienceCache.clear();
}
