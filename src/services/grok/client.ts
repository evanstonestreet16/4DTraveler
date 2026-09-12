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
  /** If true, skip the network and return a bundled fixture (demo mode). */
  useFixture?: boolean;
  /** Passed through to fetch; lets the UI cancel in-flight generation. */
  signal?: AbortSignal;
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
): Promise<GeneratedHistoryProfile> {
  if (request.useFixture) {
    const fixture = fixtureFor(request.cityName);
    if (fixture) return fixture;
    throw new HistoryGenerationError(
      `No fixture available for "${request.cityName}"`,
    );
  }
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
    return validateHistoryProfile(json);
  } catch (error) {
    if (error instanceof HistoryGenerationError) throw error;
    // Fall back to fixture so a broken key still lets the demo run.
    const fixture = fixtureFor(request.cityName);
    if (fixture) return fixture;
    throw new HistoryGenerationError(
      `Failed to generate history for "${request.cityName}"`,
      error,
    );
  }
}
