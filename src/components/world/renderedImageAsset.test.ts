import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  loadRenderedImage,
  overviewMarkerPosition,
} from './renderedImageAsset';

const asset = { url: '/panoramas/hero.webp', width: 4096, height: 2048 };
const images: StubImage[] = [];
let decode: () => Promise<void>;
class StubImage {
  src = '';
  decoding = '';
  naturalWidth = 4096;
  naturalHeight = 2048;
  constructor() {
    images.push(this);
  }
  decode() {
    return decode();
  }
  removeAttribute = vi.fn(() => {
    this.src = '';
  });
}

beforeEach(() => {
  images.length = 0;
  decode = () => Promise.resolve();
  vi.stubGlobal('Image', StubImage);
  vi.spyOn(globalThis, 'fetch').mockResolvedValue(
    new Response(new Blob(['image'])),
  );
  vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:active-panorama');
  vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined);
});
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('active panorama decode ownership', () => {
  it('keeps the decoded image until explicit disposal, then releases it once', async () => {
    const loaded = await loadRenderedImage(asset, new AbortController().signal);
    expect(loaded.image.src).toBe('blob:active-panorama');
    expect(URL.revokeObjectURL).not.toHaveBeenCalled();
    loaded.dispose();
    loaded.dispose();
    expect(URL.revokeObjectURL).toHaveBeenCalledExactlyOnceWith(
      'blob:active-panorama',
    );
    expect(images[0].removeAttribute).toHaveBeenCalledExactlyOnceWith('src');
  });

  it('cancels a pending decode immediately and releases late decode results', async () => {
    let finish!: () => void;
    decode = () =>
      new Promise((resolve) => {
        finish = resolve;
      });
    const controller = new AbortController();
    const pending = loadRenderedImage(asset, controller.signal);
    await vi.waitFor(() => expect(images).toHaveLength(1));
    const rejection = expect(pending).rejects.toMatchObject({
      name: 'AbortError',
    });
    controller.abort();
    await rejection;
    finish();
    await Promise.resolve();
    expect(URL.revokeObjectURL).toHaveBeenCalledTimes(1);
    expect(images[0].src).toBe('');
  });

  it('releases rejected or incorrectly sized images and does not hide network failures', async () => {
    await expect(
      loadRenderedImage(
        { ...asset, width: 2048 },
        new AbortController().signal,
      ),
    ).rejects.toThrow('dimensions');
    expect(URL.revokeObjectURL).toHaveBeenCalledTimes(1);
    vi.mocked(fetch).mockResolvedValue(new Response('', { status: 404 }));
    await expect(
      loadRenderedImage(asset, new AbortController().signal),
    ).rejects.toThrow('404');
    expect(images).toHaveLength(1);
  });

  it('does no work for a scene already left', async () => {
    const controller = new AbortController();
    controller.abort();
    await expect(
      loadRenderedImage(asset, controller.signal),
    ).rejects.toMatchObject({ name: 'AbortError' });
    expect(fetch).not.toHaveBeenCalled();
  });
});

it('positions overview markers using the same centered crop as the image', () => {
  expect(
    overviewMarkerPosition(
      [0.25, 0.75],
      { width: 1600, height: 900 },
      { width: 1600, height: 900 },
    ),
  ).toEqual({ left: 400, top: 675 });
  // A window narrower than the image's aspect crops the sides, so a left edge
  // marker projects outside the viewport.
  expect(
    overviewMarkerPosition(
      [0, 0.5],
      { width: 1600, height: 900 },
      { width: 1200, height: 900 },
    ).left,
  ).toBeCloseTo(-200);
});
