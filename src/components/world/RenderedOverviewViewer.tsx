import { useEffect, useRef, useState } from 'react';
import type { HistoricalWorld } from '../../types/world';
import { overviewMarkerPosition } from './renderedOverviewAsset';
import './RenderedOverviewViewer.css';

type Viewport = { width: number; height: number };

const clamp = (value: number, minimum: number, maximum: number) =>
  Math.min(Math.max(value, minimum), maximum);

export function RenderedOverviewViewer({
  world,
  selectedPOIId,
  onSelectPOI,
}: {
  world: HistoricalWorld;
  selectedPOIId: string | null;
  onSelectPOI: (id: string) => void;
}) {
  const overview = world.scene.overviewImage;
  const container = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState<Viewport>({
    width: window.innerWidth,
    height: window.innerHeight,
  });
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const [readyUrl, setReadyUrl] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

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

  if (!overview) return null;
  const portrait = size.height > size.width && !!overview.mobile;
  const preferred = portrait ? overview.mobile! : overview.desktop;
  const fallback = failedUrl === preferred.url;
  const asset = fallback ? overview.fallback : preferred;
  const ready = readyUrl === asset.url;
  const halfLabel = size.width <= 700 ? 72 : 112;

  return (
    <div
      ref={container}
      className="world-canvas rendered-overview-viewer"
      data-rendered-view="overview"
      data-image-status={fallback ? 'fallback' : ready ? 'ready' : 'loading'}
    >
      <img
        key={`${asset.url}:${attempt}`}
        className="rendered-overview-image"
        src={asset.url}
        width={asset.width}
        height={asset.height}
        alt={`Illustrative bird’s-eye reconstruction of ${world.locationName} in ${world.era.label}.`}
        draggable={false}
        onLoad={() => setReadyUrl(asset.url)}
        onError={() => {
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
          const anchor = overviewMarkerPosition(point, asset, size);
          const clampedLeft = clamp(
            anchor.left,
            halfLabel + 8,
            size.width - halfLabel - 8,
          );
          const label = {
            left:
              size.width > 700 && clampedLeft - halfLabel < 310
                ? 318 + halfLabel
                : clampedLeft,
            top: clamp(anchor.top, 64, size.height - 12),
          };
          return (
            <div className="rendered-poi" key={poi.id}>
              <svg className="rendered-poi-stem" aria-hidden="true">
                <line
                  x1={anchor.left}
                  y1={anchor.top}
                  x2={label.left}
                  y2={label.top}
                />
                <circle cx={anchor.left} cy={anchor.top} r="5" />
              </svg>
              <button
                className="rendered-poi-marker"
                data-overview-poi={poi.id}
                aria-label={`Select ${poi.name}`}
                aria-pressed={poi.id === selectedPOIId}
                style={label}
                onClick={() => onSelectPOI(poi.id)}
              >
                <span className="rendered-poi-number">0{index + 1}</span>
                <span>{poi.name}</span>
              </button>
            </div>
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
            The detailed overview could not load. Showing the fallback.
          </span>
          <button
            className="small-button"
            onClick={() => {
              setFailedUrl(null);
              setReadyUrl(null);
              setAttempt((value) => value + 1);
            }}
          >
            Retry image
          </button>
        </div>
      )}
    </div>
  );
}
