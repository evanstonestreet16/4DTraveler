import { afterEach, describe, expect, it, vi } from 'vitest';
import type { HistoricalWorld } from '../../types/world';
import {
  createPanoramaPrefetchSession,
  PANORAMA_PREFETCH_BYTE_LIMIT,
} from './panoramaPrefetch';

const camera = {
  position: [0, 1.7, 0] as [number, number, number],
  target: [0, 1.7, -1] as [number, number, number],
};
const world: HistoricalWorld = {
  id: 'test-city',
  locationId: 'test',
  locationName: 'Test',
  era: { id: 'era', label: '125 CE', year: 125 },
  scene: { background: '#eee', primitives: [], overviewCamera: camera },
  objects: [],
  pois: ['hero', 'next'].map((id) => ({
    id,
    name: id,
    markerPosition: [0, 0, 0],
    camera,
    objectIds: [],
    immersive: {
      background: '#eee',
      primitives: [],
      look: { minPitch: -1, maxPitch: 1 },
      panorama: {
        desktop: { url: `/${id}-desktop.webp`, width: 4096, height: 2048 },
        fallback: { url: `/${id}-still.webp`, width: 1280, height: 720 },
        hotspots: [],
      },
    },
  })),
};
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('encoded hero panorama prefetch', () => {
  it('warms the hero panorama once, without decoding an image', async () => {
    const fetch = vi
      .spyOn(globalThis, 'fetch')
      .mockImplementation(async () => new Response(new Uint8Array(12)));
    const image = vi.fn();
    vi.stubGlobal('Image', image);
    const session = createPanoramaPrefetchSession(world);
    await session.run(new AbortController().signal);
    await session.run(new AbortController().signal);
    await session.run(new AbortController().signal);
    expect(fetch.mock.calls.map(([url]) => url)).toEqual([
      '/hero-desktop.webp',
    ]);
    expect(fetch.mock.calls[0][1]).toMatchObject({ cache: 'force-cache' });
    expect(image).not.toHaveBeenCalled();
  });

  it('cancels a streaming transfer on departure and resumes on a later overview', async () => {
    const cancel = vi.fn();
    const controller = new AbortController();
    const fetch = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(
        new Response(
          new ReadableStream({
            start(stream) {
              stream.enqueue(new Uint8Array(4));
            },
            cancel,
          }),
        ),
      )
      .mockResolvedValueOnce(new Response(new Uint8Array(12)));
    const session = createPanoramaPrefetchSession(world);
    const pending = session.run(controller.signal);
    await vi.waitFor(() => expect(fetch).toHaveBeenCalledTimes(1));
    controller.abort();
    await pending;
    expect(cancel).toHaveBeenCalledTimes(1);
    await session.run(new AbortController().signal);
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(fetch.mock.calls.map(([url]) => url)).toEqual([
      '/hero-desktop.webp',
      '/hero-desktop.webp',
    ]);
  });

  it('declines oversized headers and stops streams that exceed the budget', async () => {
    const cancel = vi.fn();
    const fetch = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(
        new Response(new ReadableStream({ cancel }), {
          headers: {
            'content-length': String(PANORAMA_PREFETCH_BYTE_LIMIT + 1),
          },
        }),
      )
      .mockResolvedValueOnce(
        new Response(
          new ReadableStream({
            start(stream) {
              stream.enqueue(new Uint8Array(PANORAMA_PREFETCH_BYTE_LIMIT + 1));
            },
            cancel,
          }),
        ),
      );
    // A session never refetches a URL it already declined, so the header and
    // stream budgets need separate sessions to both be exercised.
    const header = createPanoramaPrefetchSession(world);
    await header.run(new AbortController().signal);
    await header.run(new AbortController().signal);
    const stream = createPanoramaPrefetchSession(world);
    await stream.run(new AbortController().signal);
    expect(cancel).toHaveBeenCalledTimes(2);
    expect(fetch).toHaveBeenCalledTimes(2);
  });
});
