import type { HistoricalObject } from '../../types/world';

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
      <p className="content-note">Illustrative demo content</p>
    </section>
  );
}
