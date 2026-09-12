import { useEffect, useRef, useState } from 'react';
import { useApp } from '../../app/AppContext';

const statusLabels = {
  idle: 'Ready to play',
  loading: 'Loading narration…',
  playing: 'Playing narration',
  paused: 'Narration paused',
  ended: 'Narration complete',
  error: 'Narration unavailable. Read the transcript or try Play again.',
};

function timestamp(seconds: number) {
  const whole = Math.max(0, Math.floor(seconds));
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, '0')}`;
}

export function NarrationControls({
  src,
  transcript,
  label = 'Narration',
}: {
  src?: string;
  transcript?: string;
  label?: string;
}) {
  const { state, dispatch } = useApp();
  const audio = useRef<HTMLAudioElement>(null);
  const lifecycle = useRef({ request: 0, mounted: false, source: '' });
  const [track, setTrack] = useState<{ src?: string; transcript?: string }>({});
  const [progress, setProgress] = useState({ elapsed: 0, duration: 0 });
  const status = state.audioState;
  const busy = status === 'playing' || status === 'loading';
  const differentTrack = Boolean(track.src && track.src !== src);
  const hasAudio = Boolean(src || track.src);

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
  }, [dispatch, hasAudio]);

  async function play(replay = false) {
    const element = audio.current;
    if (!element || !src) return;
    const id = ++lifecycle.current.request;
    dispatch({ type: 'audio', state: 'loading' });
    try {
      // Changing the view never changes a playing source. Only an explicit
      // visitor action selects the current location's recording.
      if (lifecycle.current.source !== src) {
        element.pause();
        element.src = src;
        lifecycle.current.source = src;
        setTrack({ src, transcript });
        setProgress({ elapsed: 0, duration: 0 });
      } else if (element.error) element.load();
      if (replay || element.ended) element.currentTime = 0;
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

  function updateProgress(element: HTMLAudioElement) {
    setProgress({
      elapsed: Number.isFinite(element.currentTime) ? element.currentTime : 0,
      duration: Number.isFinite(element.duration) ? element.duration : 0,
    });
  }

  return (
    <section className="narration" aria-label="World narration">
      <div className="narration-main">
        <div>
          <p className="eyebrow">{label}</p>
          <p className="muted">
            {src ? 'Listen or read the transcript' : 'Read the scene’s story'}
          </p>
        </div>
        <div className="narration-actions">
          <button
            className="primary-button"
            disabled={!src || (busy && !differentTrack)}
            onClick={() => void play()}
          >
            Play Narration
          </button>
          <button className="small-button" disabled={!busy} onClick={pause}>
            Pause Narration
          </button>
          {src && (
            <button
              className="small-button"
              disabled={!track.src}
              onClick={() => void play(true)}
            >
              Replay Narration
            </button>
          )}
        </div>
        <p className="audio-status" role="status">
          {track.src || src
            ? statusLabels[status]
            : transcript
              ? 'Transcript available. Recorded narration has not been added.'
              : 'No narration is available for this world.'}
        </p>
        {track.src && progress.duration > 0 && (
          <div className="narration-progress">
            <progress
              aria-label="Narration progress"
              max={progress.duration}
              value={Math.min(progress.elapsed, progress.duration)}
            />{' '}
            <span>
              {timestamp(progress.elapsed)} / {timestamp(progress.duration)}
            </span>
          </div>
        )}
      </div>
      {differentTrack && (
        <p className="audio-status">
          Earlier narration is retained.{' '}
          {src
            ? 'Play Narration switches to this location.'
            : 'This location has a transcript below.'}
        </p>
      )}
      {hasAudio && (
        <audio
          ref={audio}
          data-narration-audio
          preload="none"
          onPlaying={(event) => {
            if (lifecycle.current.mounted && !event.currentTarget.paused)
              dispatch({ type: 'audio', state: 'playing' });
          }}
          onPause={(event) => {
            const element = event.currentTarget;
            if (
              lifecycle.current.mounted &&
              element.paused &&
              !element.ended &&
              !element.error
            )
              dispatch({ type: 'audio', state: 'paused' });
          }}
          onEnded={() => {
            if (lifecycle.current.mounted)
              dispatch({ type: 'audio', state: 'ended' });
          }}
          onError={() => {
            if (lifecycle.current.mounted)
              dispatch({ type: 'audio', state: 'error' });
          }}
          onLoadedMetadata={(event) => updateProgress(event.currentTarget)}
          onTimeUpdate={(event) => updateProgress(event.currentTarget)}
        />
      )}
      {transcript && (
        <details className="transcript">
          <summary>Read narration transcript</summary>
          <p>{transcript}</p>
        </details>
      )}
      {differentTrack && track.transcript && (
        <details className="transcript">
          <summary>Read earlier narration transcript</summary>
          <p>{track.transcript}</p>
        </details>
      )}
    </section>
  );
}
