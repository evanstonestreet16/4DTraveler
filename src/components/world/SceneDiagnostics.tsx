import { useEffect } from 'react';
import { useThree } from '@react-three/fiber';

export interface RendererSnapshot {
  memory: { geometries: number; textures: number };
  render: {
    frame: number;
    calls: number;
    triangles: number;
    points: number;
    lines: number;
  };
  programs: number;
  pixelRatio: number;
}

export type ProfileCanvas = HTMLCanvasElement & {
  __worldRendererInfo?: () => RendererSnapshot;
};

/** Read-only benchmark bridge. Renderer/scene references never leave this closure. */
export function SceneDiagnostics() {
  const gl = useThree((state) => state.gl);
  useEffect(() => {
    if (!new URLSearchParams(location.search).has('profile')) return;
    const canvas = gl.domElement as ProfileCanvas;
    canvas.__worldRendererInfo = () => ({
      memory: { ...gl.info.memory },
      render: { ...gl.info.render },
      programs: gl.info.programs?.length ?? 0,
      pixelRatio: gl.getPixelRatio(),
    });
    return () => {
      delete canvas.__worldRendererInfo;
    };
  }, [gl]);
  return null;
}
