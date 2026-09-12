import type { Texture } from 'three';
import type { RenderedImageAsset } from '../../types/world';

export interface PanoramaFrame {
  asset: RenderedImageAsset;
  texture: Texture;
  dispose: () => void;
}

/** Keep the visible panorama alive until its replacement has actually drawn. */
export class PanoramaFrameBuffer {
  private visible: PanoramaFrame | null = null;
  private pending: PanoramaFrame | null = null;
  private owned = new Set<PanoramaFrame>();

  stage(frame: PanoramaFrame) {
    this.owned.add(frame);
    this.pending = frame;
  }

  present(frame: PanoramaFrame) {
    if (frame === this.visible) return true;
    // A late render callback must not promote a superseded request.
    if (frame !== this.pending) return false;
    for (const previous of this.owned) {
      if (previous !== frame) {
        previous.dispose();
        this.owned.delete(previous);
      }
    }
    this.visible = frame;
    this.pending = null;
    return true;
  }

  dispose() {
    for (const frame of this.owned) frame.dispose();
    this.owned.clear();
    this.pending = null;
    this.visible = null;
  }
}
