import type { GeneratedHistoryProfile } from '../../types/world';
import { seattleFixture } from './fixture';
import { validateHistoryProfile } from './validate';

/**
 * Small adapter around the Vite dev-server proxy at `/api/generate-history`.
 * The transport intentionally lives behind this module so we can swap Grok
 * for any other LLM later (or add caching) without touching UI code.
 */
export interface GenerateHistoryRequest {
  cityName: string;
  latitude: number;
  longitude: number;
  /** If true, skip the network and return the bundled fixture directly. */
  useFixture?: boolean;
  /** Cancels an in-flight generation. */
  signal?: AbortSignal;
}

export interface GenerateHistoryResult {
  profile: GeneratedHistoryProfile;
  /**
   * Whether the profile came from a live LLM call ('live'), the bundled
   * fixture requested up front ('fixture'), or a fixture fallback after a
   * live call failed ('fallback').
   */
  source: 'live' | 'fixture' | 'fallback';
  /** Underlying error when `source === 'fallback'`. */
  fallbackReason?: string;
}

const FIXTURE_CITY_MAP: Record<string, GeneratedHistoryProfile> = {
  seattle: seattleFixture,
};

function fixtureFor(cityName: string): GeneratedHistoryProfile | null {
  const key = cityName.trim().toLowerCase();
  return FIXTURE_CITY_MAP[key] ?? null;
}

export class HistoryGenerationError extends Error {
  constructor(
    message: string,
    readonly cause?: unknown,
  ) {
    super(message);
    this.name = 'HistoryGenerationError';
  }
}

export async function generateHistory(
  request: GenerateHistoryRequest,
): Promise<GenerateHistoryResult> {
  if (request.useFixture) {
    const fixture = fixtureFor(request.cityName);
    if (fixture) return { profile: fixture, source: 'fixture' };
    throw new HistoryGenerationError(
      `No fixture available for "${request.cityName}"`,
    );
  }
  let liveError: unknown = null;
  try {
    const response = await fetch('/api/generate-history', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        cityName: request.cityName,
        latitude: request.latitude,
        longitude: request.longitude,
      }),
      signal: request.signal,
    });
    if (!response.ok) {
      const body = await response.text().catch(() => '');
      throw new HistoryGenerationError(
        `Proxy returned ${response.status}: ${body || response.statusText}`,
      );
    }
    const json = (await response.json()) as unknown;
    const validated = validateHistoryProfile(json);
    return { profile: validated, source: 'live' };
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw error;
    }
    liveError = error;
  }

  // Live call failed. If we have a fixture for this city, use it silently
  // (the UI will show a "bundled fallback" badge) so the demo never dies.
  const fixture = fixtureFor(request.cityName);
  if (fixture) {
    const reason =
      liveError instanceof Error ? liveError.message : String(liveError);
    console.warn('[grok] live generation failed, using fixture:', reason);
    return { profile: fixture, source: 'fallback', fallbackReason: reason };
  }
  if (liveError instanceof HistoryGenerationError) throw liveError;
  throw new HistoryGenerationError(
    `Failed to generate history for "${request.cityName}"`,
    liveError,
  );
}
