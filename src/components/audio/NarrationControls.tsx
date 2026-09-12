import { useEffect, useRef } from 'react';
import { useApp } from '../../app/AppContext';

const statusLabels = {
  idle: 'Ready to play',
  loading: 'Loading narration…',
  playing: 'Playing narration',
  paused: 'Narration paused',
  ended: 'Narration complete',
  error: 'Narration unavailable. Check the audio file and try again.',
};

export function NarrationControls({
  src,
  transcript,
}: {
  src?: string;
  transcript?: string;
}) {
  const { state, dispatch } = useApp();
  const audio = useRef<HTMLAudioElement>(null);
  const lifecycle = useRef({ request: 0, mounted: false });
  const status = state.audioState;
  const busy = status === 'playing' || status === 'loading';

  useEffect(() => {
    const element = audio.current;
    const session = lifecycle.current;
    session.mounted = true;
    dispatch({ type: 'audio', state: 'idle' });
    return () => {
      session.mounted = false;
      session.request++;
      element?.pause();
    };
  }, [src, dispatch]);

  async function play() {
    const element = audio.current;
    if (!element || !src) return;
    const id = ++lifecycle.current.request;
    dispatch({ type: 'audio', state: 'loading' });
    try {
      if (element.error) element.load();
      await element.play();
    } catch {
      // A pause or unmount cancels a pending play request without becoming an error.
      if (id === lifecycle.current.request && lifecycle.current.mounted)
        dispatch({ type: 'audio', state: 'error' });
    }
  }

  function pause() {
    lifecycle.current.request++;
    audio.current?.pause();
    dispatch({ type: 'audio', state: 'paused' });
  }

  return (
    <section className="narration" aria-label="World narration">
      <div className="narration-main">
        <div>
          <p className="eyebrow">Listen to this world</p>
          <p className="muted">Temporary local narration</p>
        </div>
        <div className="narration-actions">
          <button
            className="primary-button"
            disabled={!src || busy}
            onClick={play}
          >
            Play Narration
          </button>
          <button className="small-button" disabled={!busy} onClick={pause}>
            Pause Narration
          </button>
        </div>
        <p className="audio-status" role="status">
          {src
            ? statusLabels[status]
            : 'No narration is available for this world.'}
        </p>
      </div>
      {src && (
        <audio
          ref={audio}
          src={src}
          preload="none"
          onPlaying={() => dispatch({ type: 'audio', state: 'playing' })}
          onPause={(event) => {
            if (
              lifecycle.current.mounted &&
              !event.currentTarget.ended &&
              !event.currentTarget.error
            )
              dispatch({ type: 'audio', state: 'paused' });
          }}
          onEnded={() => dispatch({ type: 'audio', state: 'ended' })}
          onError={() => dispatch({ type: 'audio', state: 'error' })}
        />
      )}
      {transcript && (
        <details className="transcript">
          <summary>Read narration transcript</summary>
          <p>{transcript}</p>
        </details>
      )}
    </section>
  );
}
