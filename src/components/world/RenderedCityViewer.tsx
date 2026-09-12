import {
  Component,
  useCallback,
  useEffect,
  useLayoutEffect,
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
import type {
  HistoricalWorld,
  PointOfInterest,
  RenderedImageAsset,
} from '../../types/world';
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
import './RenderedCityViewer.css';

type Viewport = { width: number; height: number };
type Presentation = ReturnType<typeof resolvePresentation>;

function OverviewMarker({
  poi,
  index,
  anchor,
  viewport,
  onSelect,
}: {
  poi: PointOfInterest;
  index: number;
  anchor: { left: number; top: number };
  viewport: Viewport;
  onSelect: () => void;
}) {
  const button = useRef<HTMLButtonElement>(null);
  const [size, setSize] = useState<Viewport | null>(null);
  useLayoutEffect(() => {
    const element = button.current;
    if (!element) return;
    const measure = () => {
      const { width, height } = element.getBoundingClientRect();
      setSize((previous) =>
        previous?.width === width && previous.height === height
          ? previous
          : { width, height },
      );
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  const width = size?.width ?? 0;
  const height = size?.height ?? 0;
  const clamp = (value: number, maximum: number) =>
    Math.max(8, Math.min(value, maximum - 8));
  const left = clamp(anchor.left - width / 2, viewport.width - width);
  const above = anchor.top - height - 12;
  const top = clamp(
    above >= 8 ? above : anchor.top + 12,
    viewport.height - height,
  );
  const onscreen =
    anchor.left >= 0 &&
    anchor.left <= viewport.width &&
    anchor.top >= 0 &&
    anchor.top <= viewport.height;
  return (
    <>
      {size && onscreen && (
        <svg className="rendered-poi-stem" aria-hidden="true">
          <line
            x1={Math.max(left + 7, Math.min(anchor.left, left + width - 7))}
            y1={anchor.top < top ? top : top + height}
            x2={anchor.left}
            y2={anchor.top}
          />
          <circle
            data-overview-anchor={poi.id}
            cx={anchor.left}
            cy={anchor.top}
            r="3"
          />
        </svg>
      )}
      <button
        ref={button}
        className="rendered-poi-marker"
        data-overview-poi={poi.id}
        aria-label={`Visit ${poi.name}`}
        style={{ left, top, visibility: size ? undefined : 'hidden' }}
        disabled={poi.preview || !poi.immersive}
        onClick={onSelect}
      >
        <span className="rendered-poi-number">0{index + 1}</span>
        <span>
          {poi.name}
          {poi.preview || !poi.immersive ? ' · Preview' : ''}
        </span>
      </button>
    </>
  );
}

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
  const { dispatch } = useApp();
  const overview = world.scene.overviewImage!;
  const portrait = size.height > size.width && !!overview.mobile;
  const preferred = portrait ? overview.mobile! : overview.desktop;
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const [readyUrl, setReadyUrl] = useState<string | null>(null);
  const [unavailableUrl, setUnavailableUrl] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const fallback = failedUrl === preferred.url;
  const asset = fallback ? overview.fallback : preferred;
  const ready = readyUrl === asset.url;
  usePanoramaPrefetch(world, ready, mobile);
  useEffect(() => {
    if (ready || unavailableUrl === asset.url) return;
    const timeout = window.setTimeout(() => {
      if (fallback) setUnavailableUrl(asset.url);
      setFailedUrl(preferred.url);
      setReadyUrl(null);
    }, 25000);
    return () => window.clearTimeout(timeout);
  }, [asset.url, preferred.url, fallback, ready, unavailableUrl, attempt]);
  const retry = () => {
    setFailedUrl(null);
    setReadyUrl(null);
    setUnavailableUrl(null);
    setAttempt((value) => value + 1);
  };
  return (
    <div
      className="rendered-view"
      data-rendered-view="overview"
      data-image-status={fallback ? 'fallback' : ready ? 'ready' : 'loading'}
    >
      <img
        key={`${asset.url}:${attempt}`}
        className="rendered-still rendered-overview-image"
        src={asset.url}
        width={asset.width}
        height={asset.height}
        style={{
          visibility: unavailableUrl === asset.url ? 'hidden' : undefined,
        }}
        alt={`Illustrative bird’s-eye reconstruction of ${world.locationName} in ${world.era.label}.`}
        draggable={false}
        onLoad={() => {
          setUnavailableUrl(null);
          setReadyUrl(asset.url);
        }}
        onError={() => {
          if (fallback) setUnavailableUrl(asset.url);
          setFailedUrl(preferred.url);
          setReadyUrl(null);
        }}
      />
      {ready &&
        world.pois.map((poi, index) => {
          const marker = overview.markers[poi.id];
          if (!marker) return null;
          const point =
            portrait && !fallback
              ? (marker.mobile ?? marker.desktop)
              : marker.desktop;
          return (
            <OverviewMarker
              key={poi.id}
              poi={poi}
              index={index}
              anchor={overviewMarkerPosition(point, asset, size)}
              viewport={size}
              onSelect={() => dispatch({ type: 'poi', id: poi.id })}
            />
          );
        })}
      {!ready && !fallback && (
        <div className="rendered-image-status" role="status">
          Loading the city view…
        </div>
      )}
      {fallback && (
        <div className="rendered-image-status" role="status">
          <span>
            The detailed overview could not load. You can still choose a place.
          </span>
          <button className="small-button" onClick={retry}>
            Retry image
          </button>
        </div>
      )}
    </div>
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
