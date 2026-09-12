import { describe, expect, it, vi } from 'vitest';
import { Texture } from 'three';
import { PanoramaFrameBuffer } from './panoramaFrameBuffer';

const frame = (name: string) => ({
  asset: { url: `/${name}.webp`, width: 8192, height: 4096 },
  texture: new Texture(),
  dispose: vi.fn(),
});

describe('panorama frame handoff', () => {
  it('retains the previous image through decoding and releases it only after the replacement draws', () => {
    const buffer = new PanoramaFrameBuffer();
    const first = frame('first');
    const next = frame('next');
    buffer.stage(first);
    expect(buffer.present(first)).toBe(true);
    buffer.stage(next);
    expect(first.dispose).not.toHaveBeenCalled();
    expect(next.dispose).not.toHaveBeenCalled();
    expect(buffer.present(next)).toBe(true);
    expect(first.dispose).toHaveBeenCalledTimes(1);
    expect(next.dispose).not.toHaveBeenCalled();
    buffer.dispose();
    buffer.dispose();
    expect(next.dispose).toHaveBeenCalledTimes(1);
  });

  it('ignores stale draw callbacks during rapid switching without clearing a still-visible texture', () => {
    const buffer = new PanoramaFrameBuffer();
    const first = frame('first');
    const skipped = frame('skipped');
    const latest = frame('latest');
    buffer.stage(first);
    buffer.present(first);
    buffer.stage(skipped);
    buffer.stage(latest);
    expect(buffer.present(skipped)).toBe(false);
    expect(first.dispose).not.toHaveBeenCalled();
    expect(skipped.dispose).not.toHaveBeenCalled();
    expect(buffer.present(latest)).toBe(true);
    expect(first.dispose).toHaveBeenCalledTimes(1);
    expect(skipped.dispose).toHaveBeenCalledTimes(1);
    expect(latest.dispose).not.toHaveBeenCalled();
    buffer.dispose();
  });

  it('releases visible and pending images when leaving and rejects late presentation', () => {
    const buffer = new PanoramaFrameBuffer();
    const first = frame('first');
    const pending = frame('pending');
    buffer.stage(first);
    buffer.present(first);
    buffer.stage(pending);
    buffer.dispose();
    expect(buffer.present(pending)).toBe(false);
    expect(first.dispose).toHaveBeenCalledTimes(1);
    expect(pending.dispose).toHaveBeenCalledTimes(1);
  });
});
