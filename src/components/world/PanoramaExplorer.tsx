import { useState } from 'react';
import { useApp } from '../../app/AppContext';
import { resolvePresentation } from '../../utils/presentation';
import { PanoramaView } from './PanoramaView';

/** Nearby-image navigation stays within the selected POI and its object context. */
export function PanoramaExplorer({
  presentation,
  label,
  mobile,
  maximumDpr,
}: {
  presentation: ReturnType<typeof resolvePresentation>;
  label: string;
  mobile: boolean;
  maximumDpr: number;
}) {
  const { dispatch } = useApp();
  // Keep the image variant stable across viewport changes during a visit.
  const [useMobile] = useState(mobile);
  const [index, setIndex] = useState(0);
  const [hasMoved, setHasMoved] = useState(false);
  const panorama = presentation.scene.panorama!;
  const views = panorama.viewpoints;
  const current = views?.[index];
  const image = current ?? panorama;
  const asset = useMobile ? (image.mobile ?? image.desktop) : image.desktop;
  const count = views?.length ?? 0;
  const previousIndex = (index + count - 1) % count;
  const nextIndex = (index + 1) % count;
  const move = (destination: number) => {
    dispatch({ type: 'object', id: null });
    setHasMoved(true);
    setIndex(destination);
  };

  return (
    <>
      <PanoramaView
        key={current?.id ?? 'entry'}
        presentation={
          current
            ? {
                ...presentation,
                scene: {
                  ...presentation.scene,
                  panorama: { ...panorama, ...current },
                },
              }
            : presentation
        }
        label={current ? `${label} · ${current.label}` : label}
        asset={asset}
        maximumDpr={maximumDpr}
        focusOnLoad={!hasMoved}
      />
      {views && current && count > 1 && (
        <nav
          className="panorama-navigation"
          aria-label="Nearby street views"
          data-street-view={current.id}
        >
          <button
            type="button"
            aria-label={`Move to ${views[previousIndex].label}`}
            title={views[previousIndex].label}
            onClick={() => move(previousIndex)}
          >
            <span aria-hidden="true">←</span>
          </button>
          <span className="panorama-navigation-label" aria-live="polite">
            <strong>{current.label}</strong>
            <span>
              {index + 1} / {count} · Nearby views
            </span>
          </span>
          <button
            type="button"
            aria-label={`Move to ${views[nextIndex].label}`}
            title={views[nextIndex].label}
            onClick={() => move(nextIndex)}
          >
            <span aria-hidden="true">→</span>
          </button>
        </nav>
      )}
    </>
  );
}
