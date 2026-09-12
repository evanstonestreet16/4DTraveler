import { useEffect, useRef, useState } from 'react';

/** Ambient sources change with the view and always require a fresh Play action. */
export function AmbientControls({ src }: { src?: string }) {
  return src ? <AmbientTrack key={src} src={src} /> : null;
}

function AmbientTrack({ src }: { src: string }) {
  const audio = useRef<HTMLAudioElement>(null);
  const session = useRef({ active: false, request: 0 });
  const [status, setStatus] = useState<
    'idle' | 'loading' | 'playing' | 'error'
  >('idle');
  const busy = status === 'playing' || status === 'loading';

  useEffect(() => {
    const element = audio.current;
    const lifecycle = session.current;
    lifecycle.active = true;
    if (element) element.volume = 0.18;
    return () => {
      lifecycle.active = false;
      lifecycle.request++;
      element?.pause();
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
      if (!element.getAttribute('src')) element.src = src;
      else if (element.error) element.load();
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
              ? 'Loading ambience…'
              : 'Ambience is off'}
      </span>
      <audio
        ref={audio}
        data-ambient-audio
        preload="none"
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
