import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useApp } from '../../app/AppContext';
import type {
  HistoricalWorld,
  OverviewImage,
  RenderedImageAsset,
} from '../../types/world';
import {
  loadRenderedImage,
  type LoadedRenderedImage,
} from './renderedImageAsset';
import { requestEraId } from '../timeline/OverviewTimeSlider';
import './OverviewEraTransition.css';

type Frame = { worldId: string; asset: RenderedImageAsset; fallback: boolean };
type OwnedFrame = Frame & LoadedRenderedImage;
export function overviewAsset(overview: OverviewImage, portrait: boolean) {
  return portrait ? (overview.mobile ?? overview.desktop) : overview.desktop;
}

/** Owns at most two decoded stills. The incoming DOM image becomes the final
 * overview, so committing the world never replaces it with an undecoded image. */
export function OverviewEraTransition({
  world,
  portrait,
  children,
}: {
  world: HistoricalWorld;
  portrait: boolean;
  children: (frame: Frame | null, ready: boolean) => ReactNode;
}) {
  const { state, dispatch } = useApp();
  const transition = state.eraTransition;
  const destination = transition?.world ?? world;
  const overview = destination.scene.overviewImage!;
  const preferred = overviewAsset(overview, portrait);
  const host = useRef<HTMLDivElement>(null);
  const atmosphere = useRef<HTMLDivElement>(null);
  const current = useRef<OwnedFrame | null>(null);
  const finish = useRef<(() => void) | null>(null);
  const skipNext = useRef(false);
  const lastAttempt = useRef(0);
  const [attempt, setAttempt] = useState(0);
  const [frame, setFrame] = useState<Frame | null>(null);
  const [phase, setPhase] = useState<'loading' | 'playing' | 'ready' | 'error'>(
    'loading',
  );
  const [failure, setFailure] = useState<HistoricalWorld | null>(null);

  useEffect(() => {
    const existing = current.current;
    if (
      existing?.worldId === destination.id &&
      lastAttempt.current === attempt &&
      (existing.asset.url === preferred.url ||
        (existing.fallback && existing.asset.url === overview.fallback.url))
    ) {
      setPhase('ready');
      skipNext.current = false;
      return;
    }
    lastAttempt.current = attempt;
    const container = host.current!;
    const controller = new AbortController();
    let canceled = false;
    let transferred = false;
    let next: OwnedFrame | null = null;
    let deadline: number | undefined;
    const animations: Animation[] = [];
    const timeout = window.setTimeout(() => controller.abort(), 15000);
    setPhase('loading');
    setFailure(null);
    const cancelAnimations = () =>
      animations.forEach((animation) => animation.cancel());
    const land = () => {
      if (canceled || transferred || !next) return;
      transferred = true;
      window.clearTimeout(deadline);
      cancelAnimations();
      next.image.style.opacity = '1';
      next.image.style.clipPath = 'none';
      next.image.style.transform = 'none';
      next.image.style.zIndex = '0';
      next.image.removeAttribute('aria-hidden');
      if (current.current) {
        current.current.image.remove();
        current.current.dispose();
      }
      current.current = next;
      setFrame({
        worldId: next.worldId,
        asset: next.asset,
        fallback: next.fallback,
      });
      setPhase('ready');
      finish.current = null;
      skipNext.current = false;
      if (transition)
        dispatch({ type: 'era-commit', requestId: transition.requestId });
    };
    void (async () => {
      let asset = preferred;
      let loaded: LoadedRenderedImage;
      try {
        loaded = await loadRenderedImage(asset, controller.signal);
      } catch (error) {
        if (controller.signal.aborted) throw error;
        asset = overview.fallback;
        loaded = await loadRenderedImage(asset, controller.signal);
      }
      if (canceled) {
        loaded.dispose();
        return;
      }
      window.clearTimeout(timeout);
      next = {
        ...loaded,
        asset,
        worldId: destination.id,
        fallback: asset.url !== preferred.url,
      };
      const image = next.image;
      image.className = 'rendered-still rendered-overview-image';
      image.dataset.assetUrl = asset.url;
      image.alt =
        overview.description ??
        `Illustrative bird’s-eye reconstruction of ${destination.locationName} in ${destination.era.label}.`;
      image.width = asset.width;
      image.height = asset.height;
      image.draggable = false;
      image.style.opacity = '0';
      image.style.zIndex = '1';
      image.setAttribute('aria-hidden', 'true');
      container.appendChild(image);
      finish.current = land;
      const reducedMotion = matchMedia(
        '(prefers-reduced-motion: reduce)',
      ).matches;
      if (
        !transition ||
        !current.current ||
        reducedMotion ||
        skipNext.current ||
        document.hidden
      ) {
        land();
        return;
      }
      setPhase('playing');
      const duration = Math.min(
        2400,
        Math.max(
          1800,
          destination.scene.overviewTransition?.durationMs ?? 2200,
        ),
      );
      const forward = destination.era.year > world.era.year;
      const origin = forward ? '0% 52%' : '100% 52%';
      // A wide soft light pass conceals the edge of a directional circular reveal.
      try {
        animations.push(
          image.animate(
            [
              {
                opacity: 0,
                clipPath: `circle(0% at ${origin})`,
                transform: 'scale(1.015)',
                offset: 0,
              },
              {
                opacity: 1,
                clipPath: `circle(14% at ${origin})`,
                transform: 'scale(1.012)',
                offset: 0.18,
              },
              {
                opacity: 1,
                clipPath: `circle(150% at ${origin})`,
                transform: 'scale(1)',
                offset: 0.92,
              },
              {
                opacity: 1,
                clipPath: `circle(150% at ${origin})`,
                transform: 'scale(1)',
                offset: 1,
              },
            ],
            { duration, fill: 'forwards', easing: 'cubic-bezier(.3,0,.2,1)' },
          ),
        );
        animations.push(
          current.current.image.animate(
            [
              { transform: 'scale(1)', filter: 'brightness(1)' },
              { transform: 'scale(1.015)', filter: 'brightness(1.08)' },
            ],
            { duration, fill: 'forwards' },
          ),
        );
        if (atmosphere.current)
          animations.push(
            atmosphere.current.animate(
              [
                {
                  opacity: 0,
                  transform: `translateX(${forward ? '-65%' : '65%'})`,
                  offset: 0,
                },
                { opacity: 0.65, transform: 'translateX(0)', offset: 0.4 },
                {
                  opacity: 0,
                  transform: `translateX(${forward ? '65%' : '-65%'})`,
                  offset: 1,
                },
              ],
              { duration, fill: 'forwards', easing: 'ease-in-out' },
            ),
          );
        void animations[0].finished.then(land).catch(() => undefined);
        // Completion must not depend on an animation event being delivered.
        deadline = window.setTimeout(land, duration + 150);
      } catch {
        land();
      }
    })()
      .catch(() => {
        if (canceled) return;
        setFailure(destination);
        setPhase(current.current ? 'ready' : 'error');
        if (transition)
          dispatch({ type: 'era-cancel', requestId: transition.requestId });
      })
      .finally(() => window.clearTimeout(timeout));
    return () => {
      canceled = true;
      controller.abort();
      window.clearTimeout(timeout);
      window.clearTimeout(deadline);
      cancelAnimations();
      finish.current = null;
      if (next && !transferred) {
        next.image.remove();
        next.dispose();
      }
    };
  }, [destination, preferred, overview, world, transition, attempt, dispatch]);

  useEffect(() => {
    if (!transition) return;
    const skip = () => {
      skipNext.current = true;
      finish.current?.();
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      if (finish.current) skip();
      else dispatch({ type: 'era-cancel', requestId: transition.requestId });
    };
    const hidden = () => {
      if (document.hidden) skip();
    };
    // A changed crop restarts decoding first. The next frame lands without motion.
    const resized = () => {
      skipNext.current = true;
      if (window.innerHeight > window.innerWidth === portrait)
        finish.current?.();
    };
    const motion = matchMedia('(prefers-reduced-motion: reduce)');
    const changedMotion = () => {
      if (motion.matches) skip();
    };
    document.addEventListener('keydown', escape);
    document.addEventListener('visibilitychange', hidden);
    window.addEventListener('resize', resized);
    motion.addEventListener('change', changedMotion);
    return () => {
      document.removeEventListener('keydown', escape);
      document.removeEventListener('visibilitychange', hidden);
      window.removeEventListener('resize', resized);
      motion.removeEventListener('change', changedMotion);
    };
  }, [transition, dispatch, portrait]);

  useEffect(
    () => () => {
      current.current?.image.remove();
      current.current?.dispose();
      current.current = null;
    },
    [],
  );

  const ready = frame?.worldId === world.id && phase === 'ready' && !transition;
  const retry = () => {
    if (failure && failure.id !== world.id)
      dispatch({
        type: 'era-request',
        requestId: requestEraId(),
        world: failure,
      });
    else setAttempt((value) => value + 1);
  };
  return (
    <div
      className="rendered-view"
      data-rendered-view="overview"
      data-image-status={
        frame?.fallback ? 'fallback' : ready ? 'ready' : 'loading'
      }
      data-transition-phase={
        transition ? (phase === 'playing' ? 'playing' : 'preparing') : 'idle'
      }
    >
      <div className="overview-frame-host" ref={host} />
      <div ref={atmosphere} className="era-atmosphere" aria-hidden="true" />
      {children(frame, ready)}
      {transition && (
        <div className="era-travel-status" role="status">
          <span>
            {phase === 'playing' ? 'Traveling' : 'Preparing'} to{' '}
            {destination.era.label}…
          </span>
          <button
            className="small-button"
            onClick={() => {
              if (finish.current) finish.current();
              else
                dispatch({
                  type: 'era-cancel',
                  requestId: transition.requestId,
                });
            }}
          >
            {phase === 'playing' ? 'Skip transition' : 'Cancel'}
          </button>
        </div>
      )}
      {!transition && (failure || frame?.fallback) && (
        <div className="rendered-image-status" role="status">
          <span>
            {failure
              ? `Could not load ${failure.era.label}. ${frame ? 'Your current view is still available.' : 'Please retry the city view.'}`
              : 'Showing a lighter city image.'}
          </span>
          <button className="small-button" onClick={retry}>
            Retry image
          </button>
        </div>
      )}
      {!transition && !failure && !frame && (
        <div className="rendered-image-status" role="status">
          Loading the city view…
        </div>
      )}
    </div>
  );
}
