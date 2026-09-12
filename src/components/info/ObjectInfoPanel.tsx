import { useEffect, useRef, useState } from 'react';
import type { HistoricalObject } from '../../types/world';
import {
  fetchMonumentSpeech,
  fetchMonumentSummary,
  type TicketLink,
} from '../../services/cityRetrieval';
import './ObjectInfoPanel.css';

type RagState =
  | { kind: 'idle' }
  | { kind: 'loading' }
  | { kind: 'ready'; answer: string; tickets: TicketLink[] }
  | { kind: 'missing' };

type SpeechState = 'idle' | 'loading' | 'playing' | 'paused' | 'error';

export function ObjectInfoPanel({
  object,
  cityName,
  year,
  onClose,
}: {
  object: HistoricalObject;
  cityName?: string;
  year?: number;
  onClose: () => void;
}) {
  const [rag, setRag] = useState<RagState>(() =>
    cityName ? { kind: 'loading' } : { kind: 'idle' },
  );
  const [speech, setSpeech] = useState<SpeechState>('idle');
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const speechUrlRef = useRef<string | null>(null);

  useEffect(() => {
    if (!cityName) {
      setRag({ kind: 'idle' });
      return;
    }
    let cancelled = false;
    setRag({ kind: 'loading' });
    setSpeech('idle');
    const previousUrl = speechUrlRef.current;
    speechUrlRef.current = null;
    if (previousUrl) URL.revokeObjectURL(previousUrl);
    audioRef.current?.pause();

    void fetchMonumentSummary({
      city: cityName,
      object: object.name,
      year,
      hint: object.description,
    }).then((summary) => {
      if (cancelled) return;
      if (!summary) {
        setRag({ kind: 'missing' });
        return;
      }
      setRag({
        kind: 'ready',
        answer: summary.answer,
        tickets: summary.tickets,
      });
    });

    return () => {
      cancelled = true;
    };
  }, [object.id, object.name, object.description, cityName, year]);

  useEffect(() => {
    if (rag.kind !== 'ready') return;
    let cancelled = false;
    setSpeech('loading');
    void fetchMonumentSpeech(rag.answer).then((url) => {
      if (cancelled) return;
      if (!url) {
        setSpeech('error');
        return;
      }
      speechUrlRef.current = url;
      const audio = new Audio(url);
      audioRef.current = audio;
      audio.addEventListener('ended', () => setSpeech('paused'));
      audio.addEventListener('error', () => setSpeech('error'));
      void audio
        .play()
        .then(() => {
          if (!cancelled) setSpeech('playing');
        })
        .catch(() => {
          if (!cancelled) setSpeech('paused');
        });
    });
    return () => {
      cancelled = true;
      audioRef.current?.pause();
    };
  }, [rag]);

  useEffect(() => {
    return () => {
      audioRef.current?.pause();
      if (speechUrlRef.current) URL.revokeObjectURL(speechUrlRef.current);
    };
  }, []);

  function toggleSpeech() {
    const audio = audioRef.current;
    if (!audio) return;
    if (speech === 'playing') {
      audio.pause();
      setSpeech('paused');
      return;
    }
    void audio
      .play()
      .then(() => setSpeech('playing'))
      .catch(() => setSpeech('error'));
  }

  const yearLabel = typeof year === 'number' ? String(year) : 'this era';

  return (
    <section
      className="object-info"
      aria-labelledby="object-name"
      aria-live="polite"
    >
      <div className="panel-heading">
        <p className="eyebrow">Object field notes</p>
        <button
          className="icon-button"
          aria-label="Close object information"
          onClick={onClose}
        >
          ×
        </button>
      </div>
      <h2 id="object-name">{object.name}</h2>

      {cityName ? (
        <>
          <h3>Grok tour · {yearLabel}</h3>
          {rag.kind === 'loading' && (
            <p className="muted" role="status">
              Drafting a period summary…
            </p>
          )}
          {rag.kind === 'missing' && (
            <p className="muted">
              Live summary is unavailable. The city-retrieval server may be
              offline, or this monument is not in the RAG store yet.
            </p>
          )}
          {rag.kind === 'ready' && <p className="rag-summary">{rag.answer}</p>}
          {rag.kind === 'ready' && (
            <div className="monument-narration">
              <button
                className="small-button"
                disabled={speech === 'loading' || speech === 'error'}
                onClick={toggleSpeech}
              >
                {speech === 'loading'
                  ? 'Preparing voice…'
                  : speech === 'playing'
                    ? 'Pause narration'
                    : 'Play narration'}
              </button>
              {speech === 'error' && (
                <p className="muted">Voice narration could not start.</p>
              )}
            </div>
          )}
          {rag.kind === 'ready' && (
            <>
              <h3>Visit / tickets</h3>
              {rag.tickets.length > 0 ? (
                <ul className="object-sources">
                  {rag.tickets.map((ticket) => (
                    <li key={ticket.url}>
                      <a
                        href={ticket.url}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {ticket.title}
                        <span className="sr-only"> (opens in a new tab)</span>
                      </a>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="muted">
                  No official ticket or visitor page found yet.
                </p>
              )}
            </>
          )}
        </>
      ) : (
        <p className="muted">A live field note needs a city context.</p>
      )}
    </section>
  );
}
