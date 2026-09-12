import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  _cachedKeys,
  _resetCache,
  composeQuery,
  fetchMonumentSpeech,
  fetchMonumentSummary,
  parseTicketLinks,
} from './client';

function jsonResponse(body: unknown, init: ResponseInit = {}): Response {
  return new Response(JSON.stringify(body), {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(init.headers ?? {}) },
  });
}

describe('cityRetrieval.composeQuery', () => {
  it('always mentions the monument and city', () => {
    const query = composeQuery({ object: 'Colosseum', city: 'Rome' });
    expect(query).toContain('Colosseum');
    expect(query).toContain('Rome');
  });

  it('includes the hint when provided', () => {
    const q = composeQuery({
      object: 'Space Needle',
      city: 'Seattle',
      hint: "1962 World's Fair tower",
    });
    expect(q).toContain("1962 World's Fair tower");
  });

  it('omits the hint clause when hint is empty or whitespace', () => {
    const q = composeQuery({ object: 'X', city: 'Y', hint: '   ' });
    expect(q).not.toContain('user context');
  });

  it('mentions the historical year when provided', () => {
    const q = composeQuery({ object: 'Colosseum', city: 'Rome', year: 80 });
    expect(q).toContain('80');
  });
});

describe('cityRetrieval.fetchMonumentSummary', () => {
  beforeEach(() => _resetCache());

  it('returns the answer field from a successful response', async () => {
    const fake = vi
      .fn<typeof fetch>()
      .mockResolvedValue(jsonResponse({ answer: 'A brief history.' }));
    const answer = await fetchMonumentSummary(
      { object: 'Colosseum', city: 'Rome' },
      { fetchImpl: fake },
    );
    expect(answer).toEqual({ answer: 'A brief history.', tickets: [] });
    expect(fake).toHaveBeenCalledTimes(1);
    const [, init] = fake.mock.calls[0]!;
    expect(init?.method).toBe('POST');
    expect(JSON.parse(init?.body as string)).toEqual({
      city: 'Rome',
      monument: 'Colosseum',
      year: undefined,
      hint: '',
    });
  });

  it('caches successful responses so repeat calls do not hit the network', async () => {
    const fake = vi
      .fn<typeof fetch>()
      .mockResolvedValue(jsonResponse({ answer: 'cached' }));
    const q = { object: 'Pantheon', city: 'Rome' };
    const first = await fetchMonumentSummary(q, { fetchImpl: fake });
    const second = await fetchMonumentSummary(q, { fetchImpl: fake });
    expect(first).toEqual({ answer: 'cached', tickets: [] });
    expect(second).toEqual({ answer: 'cached', tickets: [] });
    expect(fake).toHaveBeenCalledTimes(1);
    expect(_cachedKeys().length).toBe(1);
  });

  it('deduplicates concurrent in-flight requests for the same query', async () => {
    let resolve!: (r: Response) => void;
    const pending = new Promise<Response>((r) => (resolve = r));
    const fake = vi.fn<typeof fetch>().mockReturnValue(pending);
    const q = { object: 'Forum', city: 'Rome' };
    const [a, b] = [
      fetchMonumentSummary(q, { fetchImpl: fake }),
      fetchMonumentSummary(q, { fetchImpl: fake }),
    ];
    resolve(jsonResponse({ answer: 'once' }));
    expect(await a).toEqual({ answer: 'once', tickets: [] });
    expect(await b).toEqual({ answer: 'once', tickets: [] });
    expect(fake).toHaveBeenCalledTimes(1);
  });

  it('returns null on non-2xx responses without throwing', async () => {
    const fake = vi
      .fn<typeof fetch>()
      .mockResolvedValue(new Response('', { status: 500 }));
    const answer = await fetchMonumentSummary(
      { object: 'X', city: 'Y' },
      { fetchImpl: fake },
    );
    expect(answer).toBeNull();
  });

  it('returns null when fetch rejects (service unreachable)', async () => {
    const fake = vi
      .fn<typeof fetch>()
      .mockRejectedValue(new Error('ECONNREFUSED'));
    const answer = await fetchMonumentSummary(
      { object: 'X', city: 'Y' },
      { fetchImpl: fake },
    );
    expect(answer).toBeNull();
  });

  it('returns null when the payload is missing the answer field', async () => {
    const fake = vi
      .fn<typeof fetch>()
      .mockResolvedValue(jsonResponse({ answer: '' }));
    const answer = await fetchMonumentSummary(
      { object: 'X', city: 'Y' },
      { fetchImpl: fake },
    );
    expect(answer).toBeNull();
  });

  it('keeps only safe https ticket links from the payload', async () => {
    const fake = vi.fn<typeof fetch>().mockResolvedValue(
      jsonResponse({
        answer: 'Visit the Colosseum.',
        tickets: [
          {
            title: 'Official tickets',
            url: 'https://colosseo.it/en/tickets',
          },
          { title: 'Bad scheme', url: 'javascript:alert(1)' },
          { title: 'Spaces', url: 'https://example.com/path with space' },
        ],
      }),
    );
    const summary = await fetchMonumentSummary(
      { object: 'Colosseum', city: 'Rome' },
      { fetchImpl: fake },
    );
    expect(summary).toEqual({
      answer: 'Visit the Colosseum.',
      tickets: [
        {
          title: 'Official tickets',
          url: 'https://colosseo.it/en/tickets',
        },
      ],
    });
  });
});

describe('cityRetrieval.parseTicketLinks', () => {
  it('drops missing titles, non-https URLs, and extra entries', () => {
    expect(
      parseTicketLinks([
        { title: 'One', url: 'https://example.com/1' },
        { title: 'HTTP', url: 'http://example.com/tickets' },
        { title: '', url: 'https://example.com/empty' },
        { title: 'Two', url: 'https://example.com/2' },
        { title: 'Three', url: 'https://example.com/3' },
        { title: 'Four', url: 'https://example.com/4' },
      ]),
    ).toEqual([
      { title: 'One', url: 'https://example.com/1' },
      { title: 'Two', url: 'https://example.com/2' },
      { title: 'Three', url: 'https://example.com/3' },
    ]);
  });
});

describe('cityRetrieval.fetchMonumentSpeech', () => {
  beforeEach(() => {
    _resetCache();
    vi.stubGlobal(
      'URL',
      class {
        static createObjectURL() {
          return 'blob:mock-narration';
        }
        static revokeObjectURL() {
          return undefined;
        }
      },
    );
  });

  it('returns an object URL for a successful MP3 response', async () => {
    const fake = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(new Blob(['ID3'], { type: 'audio/mpeg' }), {
        status: 200,
      }),
    );
    const url = await fetchMonumentSpeech('The Colosseum opened in 80 AD.', {
      fetchImpl: fake,
    });
    expect(url).toBe('blob:mock-narration');
    expect(JSON.parse(fake.mock.calls[0]![1]?.body as string)).toEqual({
      text: 'The Colosseum opened in 80 AD.',
      voice_id: 'ara',
    });
  });

  it('returns null on TTS failure without throwing', async () => {
    const fake = vi
      .fn<typeof fetch>()
      .mockResolvedValue(new Response('', { status: 502 }));
    await expect(
      fetchMonumentSpeech('hello', { fetchImpl: fake }),
    ).resolves.toBeNull();
  });
});
