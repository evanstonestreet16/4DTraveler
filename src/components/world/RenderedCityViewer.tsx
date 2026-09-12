import {
  Component,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import {
  BackSide,
  NoToneMapping,
  RepeatWrapping,
  SRGBColorSpace,
  Texture,
} from 'three';
import { useApp } from '../../app/AppContext';
import type { HistoricalWorld, RenderedImageAsset } from '../../types/world';
import { resolvePresentation } from '../../utils/presentation';
import type { QualityPreference } from '../../utils/quality';
import { CameraController } from './CameraController';
import { PanoramaHotspots } from './PanoramaHotspots';
import { SceneDiagnostics } from './SceneDiagnostics';
import { ViewportDpr } from './ViewportDpr';
import { useSceneQuality } from './useSceneQuality';
import {
  loadRenderedImage,
  overviewMarkerPosition,
} from './renderedImageAsset';
import { usePanoramaPrefetch } from './usePanoramaPrefetch';
import { OverviewEraTransition } from './OverviewEraTransition';
import './RenderedCityViewer.css';

type Viewport = { width: number; height: number };
type Presentation = ReturnType<typeof resolvePresentation>;

function StillImage({
  asset,
  label,
  className = '',
}: {
  asset: RenderedImageAsset;
  label: string;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);
  return failed ? null : (
    <img
      className={`rendered-still ${className}`}
      src={asset.url}
      width={asset.width}
      height={asset.height}
      alt={label}
      onError={() => setFailed(true)}
    />
  );
}

function OverviewView({
  world,
  size,
  mobile,
}: {
  world: HistoricalWorld;
  size: Viewport;
  mobile: boolean;
}) {
  return (
    <OverviewEraTransition world={world} portrait={size.height > size.width}>
      {(frame, ready) => (
        <OverviewMarkers
          world={world}
          size={size}
          mobile={mobile}
          ready={ready}
          asset={frame?.asset}
          fallback={frame?.fallback ?? false}
        />
      )}
    </OverviewEraTransition>
  );
}

function OverviewMarkers({
  world,
  size,
  mobile,
  ready,
  asset,
  fallback,
}: {
  world: HistoricalWorld;
  size: Viewport;
  mobile: boolean;
  ready: boolean;
  asset?: RenderedImageAsset;
  fallback: boolean;
}) {
  const { dispatch } = useApp();
  const overview = world.scene.overviewImage!;
  const portrait = size.height > size.width && !!overview.mobile;
  usePanoramaPrefetch(world, ready, mobile);
  return (
    <>
      {ready &&
        asset &&
        world.pois.map((poi, index) => {
          const marker = overview.markers[poi.id];
          if (!marker) return null;
          const point =
            portrait && !fallback
              ? (marker.mobile ?? marker.desktop)
              : marker.desktop;
          return (
            <button
              key={poi.id}
              className="rendered-poi-marker"
              data-overview-poi={poi.id}
              aria-label={`Visit ${poi.name}`}
              style={overviewMarkerPosition(point, asset, size)}
              disabled={poi.preview || !poi.immersive}
              onClick={() => dispatch({ type: 'poi', id: poi.id })}
            >
              <span className="rendered-poi-number">0{index + 1}</span>
              <span>
                {poi.name}
                {poi.preview || !poi.immersive ? ' · Preview' : ''}
              </span>
            </button>
          );
        })}
    </>
  );
}

class PanoramaBoundary extends Component<
  { children: ReactNode; onError: () => void },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch() {
    this.props.onError();
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}

function PanoramaContextGuard({ onLost }: { onLost: () => void }) {
  const gl = useThree((state) => state.gl);
  useEffect(() => {
    const canvas = gl.domElement;
    const lost = (event: Event) => {
      event.preventDefault();
      onLost();
    };
    canvas.addEventListener('webglcontextlost', lost);
    return () => canvas.removeEventListener('webglcontextlost', lost);
  }, [gl, onLost]);
  return null;
}

function PanoramaView({
  presentation,
  label,
  asset,
  maximumDpr,
}: {
  presentation: Presentation;
  label: string;
  asset: RenderedImageAsset;
  maximumDpr: number;
}) {
  const { state, dispatch } = useApp();
  const panorama = presentation.scene.panorama!;
  // Choose once per visit: rotating/resizing must not reset a visitor's gaze or decode another panorama.
  const [activeAsset] = useState(asset);
  const entryFocus = useRef(document.activeElement);
  const [texture, setTexture] = useState<Texture | null>(null);
  const [failure, setFailure] = useState<'image' | 'graphics' | null>(null);
  const [attempt, setAttempt] = useState(0);
  const graphicsFailed = useCallback(() => setFailure('graphics'), []);
  const retry = () => {
    setTexture(null);
    setFailure(null);
    setAttempt((value) => value + 1);
  };

  useEffect(() => {
    if (failure) return;
    // R3F initializes its renderer asynchronously, outside a React error boundary.
    // Detect unavailable WebGL before entering that path or decoding the panorama.
    const probe = document.createElement('canvas');
    try {
      const context = probe.getContext('webgl2');
      if (!context) {
        setFailure('graphics');
        return;
      }
      context.getExtension('WEBGL_lose_context')?.loseContext();
    } catch {
      setFailure('graphics');
      return;
    }
    const controller = new AbortController();
    let release: (() => void) | undefined;
    const timeout = window.setTimeout(() => controller.abort(), 25000);
    void loadRenderedImage(activeAsset, controller.signal)
      .then((loaded) => {
        if (controller.signal.aborted) {
          loaded.dispose();
          return;
        }
        const next = new Texture(loaded.image);
        next.colorSpace = SRGBColorSpace;
        next.wrapS = RepeatWrapping;
        // Sphere UVs viewed from inside need a horizontal flip: source right is east.
        next.repeat.x = -1;
        next.offset.x = 1;
        next.needsUpdate = true;
        release = () => {
          next.dispose();
          next.image = null;
          loaded.dispose();
        };
        setTexture(next);
      })
      .catch(() => {
        // Timeout is a visible recoverable failure; navigation cancellation is silent.
        if (
          !controller.signal.aborted ||
          controller.signal.reason?.name === 'AbortError'
        )
          setFailure('image');
      })
      .finally(() => window.clearTimeout(timeout));
    return () => {
      window.clearTimeout(timeout);
      controller.abort(new DOMException('View changed', 'ViewChanged'));
      release?.();
    };
  }, [activeAsset, attempt, failure]);

  const ready = !!texture && !failure;
  return (
    <div
      className="rendered-view"
      data-rendered-view={failure ? 'fallback' : 'panorama'}
      data-image-status={failure ? 'fallback' : ready ? 'ready' : 'loading'}
    >
      {!ready && (
        <StillImage
          asset={panorama.fallback}
          label={`Still reconstruction of ${label}.`}
        />
      )}
      {!failure && texture && (
        <PanoramaBoundary key={attempt} onError={graphicsFailed}>
          <Canvas
            frameloop="demand"
            dpr={[1, maximumDpr]}
            gl={{ antialias: false, toneMapping: NoToneMapping }}
            camera={{
              position: presentation.camera.position,
              fov: 62,
              near: presentation.camera.near ?? 0.1,
              far: presentation.camera.far ?? 400,
            }}
            onCreated={({ camera, gl }) => {
              camera.lookAt(...presentation.camera.target);
              gl.domElement.setAttribute('role', 'img');
              gl.domElement.tabIndex = 0;
              if (
                !state.selectedObjectId &&
                (document.activeElement === entryFocus.current ||
                  document.activeElement === document.body)
              )
                gl.domElement.focus({ preventScroll: true });
            }}
            fallback="Your browser cannot display the 360° view. Use the object list to explore."
          >
            <PanoramaContextGuard onLost={graphicsFailed} />
            <ViewportDpr maximum={maximumDpr} />
            <SceneDiagnostics />
            <CameraController
              view={presentation.camera}
              initialView={presentation.camera}
              fixedLook={presentation.look}
              hotspotInput
            />
            <mesh
              position={presentation.camera.position}
              rotation={[0, Math.PI / 2, 0]}
            >
              <sphereGeometry args={[50, 64, 32]} />
              <meshBasicMaterial
                map={texture}
                side={BackSide}
                toneMapped={false}
              />
            </mesh>
            <PanoramaHotspots
              hotspots={panorama.hotspots}
              objects={presentation.objects}
              selectedId={state.selectedObjectId}
              onSelect={(id) => dispatch({ type: 'object', id })}
              cameraPosition={presentation.camera.position}
            />
          </Canvas>
        </PanoramaBoundary>
      )}
      {!ready && (
        <div className="rendered-image-status" role="status">
          <span>
            {failure === 'graphics'
              ? 'The 360° view is unavailable. Explore the still and object list.'
              : failure === 'image'
                ? 'The panorama could not load. Explore the still and object list.'
                : 'Loading the 360° view…'}
          </span>
          {failure && (
            <button className="small-button" onClick={retry}>
              {failure === 'graphics' ? 'Reload 360° view' : 'Retry image'}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

/** City-agnostic still/360 viewer; all images, marker positions and eye anchors are data-owned. */
export function RenderedCityViewer({
  world,
  quality: preference = 'auto',
}: {
  world: HistoricalWorld;
  quality?: QualityPreference;
}) {
  const { state } = useApp();
  const container = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState<Viewport>(() => ({
    width: window.innerWidth,
    height: window.innerHeight,
  }));
  const { quality, settings } = useSceneQuality(preference);
  const presentation = useMemo(
    () => resolvePresentation(world, state.cameraMode, state.activePOIId),
    [world, state.cameraMode, state.activePOIId],
  );
  const mobile = size.width < 900 || quality !== 'high';
  useEffect(() => {
    const element = container.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => {
      if (entry.contentRect.width && entry.contentRect.height)
        setSize({
          width: entry.contentRect.width,
          height: entry.contentRect.height,
        });
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  const panorama = presentation.scene.panorama;
  const asset =
    panorama &&
    (mobile ? (panorama.mobile ?? panorama.desktop) : panorama.desktop);
  const label =
    world.pois.find((poi) => poi.id === state.activePOIId)?.name ??
    world.locationName;
  return (
    <div
      ref={container}
      className="world-canvas rendered-city-viewer"
      aria-label="Historical city view"
      data-scene-quality={quality}
    >
      {asset ? (
        <PanoramaView
          key={state.activePOIId}
          presentation={presentation}
          label={label}
          asset={asset}
          maximumDpr={settings.dpr}
        />
      ) : (
        <OverviewView world={world} size={size} mobile={mobile} />
      )}
    </div>
  );
}
