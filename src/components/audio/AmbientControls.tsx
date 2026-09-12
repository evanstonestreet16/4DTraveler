import { useEffect, useRef, useState } from 'react';
import { fetchSceneAmbience } from '../../services/cityRetrieval';

/** Ambient sources are generated for the current place and always need Play. */
export function AmbientControls({
  city,
  place,
  year,
  hint,
}: {
  city?: string;
  place?: string;
  year?: number;
  hint?: string;
}) {
  if (!city || !place) return null;
  return (
    <AmbientTrack
      key={`${city}:${place}:${year ?? ''}`}
      city={city}
      place={place}
      year={year}
      hint={hint}
    />
  );
}

function AmbientTrack({
  city,
  place,
  year,
  hint,
}: {
  city: string;
  place: string;
  year?: number;
  hint?: string;
}) {
  const audio = useRef<HTMLAudioElement>(null);
  const session = useRef({ active: false, request: 0 });
  const urlRef = useRef<string | null>(null);
  const [status, setStatus] = useState<
    'idle' | 'loading' | 'playing' | 'error'
  >('idle');
  const busy = status === 'playing' || status === 'loading';

  useEffect(() => {
    const element = audio.current;
    const lifecycle = session.current;
    lifecycle.active = true;
    if (element) element.volume = 0.45;
    return () => {
      lifecycle.active = false;
      lifecycle.request++;
      element?.pause();
      if (urlRef.current) URL.revokeObjectURL(urlRef.current);
      urlRef.current = null;
    };
  }, []);

  async function toggle() {
    const element = audio.current;
    if (!element) return;
    const request = ++session.current.request;
    if (busy) {
      element.pause();
      setStatus('idle');
      return;
    }
    setStatus('loading');
    try {
      element.muted = false;
      element.volume = 0.45;
      if (!urlRef.current) {
        const url = await fetchSceneAmbience({ city, place, year, hint });
        if (!session.current.active || request !== session.current.request)
          return;
        if (!url) {
          setStatus('error');
          return;
        }
        urlRef.current = url;
        element.src = url;
      } else if (element.error) {
        element.load();
      }
      await element.play();
    } catch {
      if (session.current.active && request === session.current.request)
        setStatus('error');
    }
  }

  return (
    <section className="ambient-controls" aria-label="Scene ambience">
      <button
        className="small-button"
        onClick={() => void toggle()}
        aria-pressed={busy}
      >
        {busy ? 'Pause ambience' : 'Play ambience'}
      </button>
      <span className="audio-status" role="status">
        {status === 'error'
          ? 'Ambience unavailable. Try Play again.'
          : status === 'playing'
            ? 'Quiet ambience playing'
            : status === 'loading'
              ? 'Drafting the street…'
              : 'Ambience is off'}
      </span>
      <audio
        ref={audio}
        data-ambient-audio
        preload="none"
        playsInline
        loop
        onPlaying={(event) => {
          if (session.current.active && !event.currentTarget.paused)
            setStatus('playing');
        }}
        onPause={(event) => {
          if (
            session.current.active &&
            event.currentTarget.paused &&
            !event.currentTarget.error
          )
            setStatus('idle');
        }}
        onError={() => {
          if (session.current.active) setStatus('error');
        }}
      />
    </section>
  );
}
