import { readFile } from 'node:fs/promises';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { pittsburgh1892 } from '../../data/worlds/pittsburgh-1892';
import type { HistoricalWorld, SceneModel } from '../../types/world';
import { loadModelAsset } from './modelAsset';
import {
  CITY_PREFETCH_BYTE_LIMIT,
  createModelPrefetchSession,
  modelPrefetchCandidates,
} from './modelPrefetch';

const model = (url: string): SceneModel => ({ url, selectableNodes: {} });
const world: HistoricalWorld = {
  ...pittsburgh1892,
  scene: {
    ...pittsburgh1892.scene,
    presentation: 'immersive-city',
    model: model('/overview.glb?v=original'),
  },
  pois: pittsburgh1892.pois.map((poi, index) => ({
    ...poi,
    preview: index === 2,
    immersive: {
      background: '#eeeeee',
      primitives: [],
      look: { minPitch: -0.5, maxPitch: 1 },
      model: model(`/poi-${index}.glb?v=revision-${index}`),
    },
  })),
};

function response(bytes = 12) {
  return new Response(new Uint8Array(bytes), {
    headers: { 'content-length': String(bytes) },
  });
}

afterEach(() => vi.restoreAllMocks());

describe('city model prefetch', () => {
  it('uses exact authored URLs for the hero and next available POV, skipping previews and duplicates', () => {
    expect(modelPrefetchCandidates(pittsburgh1892)).toEqual([]);
    expect(modelPrefetchCandidates(world)).toEqual([
      '/poi-0.glb?v=revision-0',
      '/poi-1.glb?v=revision-1',
    ]);
    const duplicate: HistoricalWorld = {
      ...world,
      pois: [world.pois[0], world.pois[0], ...world.pois.slice(1)],
    };
    expect(modelPrefetchCandidates(duplicate)).toEqual(
      modelPrefetchCandidates(world),
    );
  });

  it('warms the HTTP cache sequentially once per session without parsing or retaining scenes', async () => {
    const fetch = vi
      .spyOn(globalThis, 'fetch')
      .mockImplementation(async () => response());
    const parse = vi.spyOn(GLTFLoader.prototype, 'parseAsync');
    const session = createModelPrefetchSession(world);
    await session.run(new AbortController().signal);
    await session.run(new AbortController().signal);
    expect(fetch.mock.calls.map(([url]) => url)).toEqual(
      modelPrefetchCandidates(world),
    );
    for (const [, options] of fetch.mock.calls)
      expect(options).toMatchObject({ cache: 'force-cache' });
    expect(parse).not.toHaveBeenCalled();
  });

  it('cancels a background body on exit and can resume the interrupted URL on the next overview', async () => {
    const cancel = vi.fn();
    const controller = new AbortController();
    const fetch = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(
        new Response(
          new ReadableStream<Uint8Array>({
            start(stream) {
              stream.enqueue(new Uint8Array(4));
            },
            cancel,
          }),
          { headers: { 'content-length': '12' } },
        ),
      )
      .mockImplementation(async () => response());
    const session = createModelPrefetchSession(world);
    const pending = session.run(controller.signal);
    await vi.waitFor(() => expect(fetch).toHaveBeenCalledTimes(1));
    controller.abort();
    await pending;
    expect(cancel).toHaveBeenCalledTimes(1);
    await session.run(new AbortController().signal);
    expect(fetch.mock.calls.map(([url]) => url)).toEqual([
      '/poi-0.glb?v=revision-0',
      '/poi-0.glb?v=revision-0',
      '/poi-1.glb?v=revision-1',
    ]);
  });

  it('bounds transfer work across overview visits and cancels bodies without a reliable affordable length', async () => {
    const cancel = vi.fn();
    const tooLarge = () =>
      new Response(new ReadableStream({ cancel }), {
        headers: { 'content-length': String(CITY_PREFETCH_BYTE_LIMIT + 1) },
      });
    const fetch = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(tooLarge())
      .mockResolvedValueOnce(new Response(new ReadableStream({ cancel })));
    const session = createModelPrefetchSession(world);
    await session.run(new AbortController().signal);
    await session.run(new AbortController().signal);
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(cancel).toHaveBeenCalledTimes(2);

    const overBudgetBody = vi.fn();
    fetch
      .mockReset()
      .mockResolvedValueOnce(response(CITY_PREFETCH_BYTE_LIMIT / 2 + 1))
      .mockResolvedValueOnce(
        new Response(new ReadableStream({ cancel: overBudgetBody }), {
          headers: {
            'content-length': String(CITY_PREFETCH_BYTE_LIMIT / 2 + 1),
          },
        }),
      );
    const bounded = createModelPrefetchSession(world);
    await bounded.run(new AbortController().signal);
    await bounded.run(new AbortController().signal);
    // The second response is declined at its headers, before its body is consumed.
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(overBudgetBody).toHaveBeenCalledTimes(1);
  });

  it('stops a misreported stream at the byte limit instead of requesting another model', async () => {
    const cancel = vi.fn();
    const fetch = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        new ReadableStream<Uint8Array>({
          start(stream) {
            stream.enqueue(new Uint8Array(CITY_PREFETCH_BYTE_LIMIT + 1));
          },
          cancel,
        }),
        { headers: { 'content-length': '10' } },
      ),
    );
    const session = createModelPrefetchSession(world);
    await session.run(new AbortController().signal);
    await session.run(new AbortController().signal);
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(cancel).toHaveBeenCalledTimes(1);
  });

  it('never starts after cancellation and treats a failed prefetch as optional for normal loading', async () => {
    const bytes = await readFile(
      new URL('../../../public/models/pipeline-fixture.glb', import.meta.url),
    );
    const fetch = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(new Response('', { status: 404 }))
      .mockResolvedValueOnce(response())
      .mockResolvedValueOnce(new Response(bytes));
    const session = createModelPrefetchSession(world);
    const controller = new AbortController();
    controller.abort();
    await session.run(controller.signal);
    expect(fetch).not.toHaveBeenCalled();
    await session.run(new AbortController().signal);
    const loaded = await loadModelAsset(
      {
        ...pittsburgh1892.scene.model!,
        url: world.pois[0].immersive!.model!.url,
        compressedUrl: undefined,
      },
      pittsburgh1892.objects,
      new AbortController().signal,
      vi.fn(),
    );
    expect(loaded.selection.size).toBe(pittsburgh1892.objects.length);
    expect(fetch.mock.calls.at(-1)?.[0]).toBe('/poi-0.glb?v=revision-0');
    loaded.dispose();
  });
});
