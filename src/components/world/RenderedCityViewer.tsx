import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useApp } from '../../app/AppContext';
import type {
  HistoricalWorld,
  PointOfInterest,
  RenderedImageAsset,
} from '../../types/world';
import { resolvePresentation } from '../../utils/presentation';
import type { QualityPreference } from '../../utils/quality';
import { useSceneQuality } from './useSceneQuality';
import { overviewMarkerPosition } from './renderedImageAsset';
import { PanoramaExplorer } from './PanoramaExplorer';
import { usePanoramaPrefetch } from './usePanoramaPrefetch';
import { OverviewEraTransition } from './OverviewEraTransition';
import './RenderedCityViewer.css';

type Viewport = { width: number; height: number };

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
        aria-label={
          poi.preview || !poi.immersive
            ? `${poi.name} · Preview`
            : `Visit ${poi.name}`
        }
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
    </>
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
        <PanoramaExplorer
          key={state.activePOIId}
          presentation={presentation}
          label={label}
          mobile={mobile}
          maximumDpr={settings.dpr}
        />
      ) : (
        <OverviewView world={world} size={size} mobile={mobile} />
      )}
    </div>
  );
}
