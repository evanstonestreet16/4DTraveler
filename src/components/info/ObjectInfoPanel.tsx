import type { HistoricalObject } from '../../types/world';
import './ObjectInfoPanel.css';

export function ObjectInfoPanel({
  object,
  onClose,
}: {
  object: HistoricalObject;
  onClose: () => void;
}) {
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
      <p>{object.description}</p>
      <h3>Why it matters</h3>
      <p>{object.whyItMatters}</p>
      {object.confidence ? (
        <>
          <h3>Reconstruction confidence</h3>
          <p className="content-note">{object.confidence}</p>
        </>
      ) : (
        <p className="content-note">Illustrative demo content</p>
      )}
      {!!object.sources?.length && (
        <>
          <h3>Sources</h3>
          <ul className="object-sources">
            {object.sources.map((source) => (
              <li key={source.id}>
                <a href={source.url} target="_blank" rel="noopener noreferrer">
                  {source.title}
                  <span className="sr-only"> (opens in a new tab)</span>
                </a>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
