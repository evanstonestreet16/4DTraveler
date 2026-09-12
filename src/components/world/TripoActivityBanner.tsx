import type { TripoStatus } from './IconicUpgrade';

/**
 * Top-right badge that summarizes any in-flight Tripo (text-to-3D)
 * requests for iconic landmarks in the current world. Text-to-3D takes
 * 60–120 s per landmark, so without an ambient loading indicator the
 * scene looks frozen. This banner makes the pipeline visible.
 *
 * Layout & styling live in globals.css under `.tripo-activity`.
 */
export function TripoActivityBanner({
  statuses,
}: {
  statuses: Record<string, TripoStatus>;
}) {
  const entries = Object.values(statuses);
  if (entries.length === 0) return null;

  const running = entries.filter(
    (s) => s.phase === 'queued' || s.phase === 'running',
  );
  const done = entries.filter((s) => s.phase === 'success').length;
  const failed = entries.filter((s) => s.phase === 'failed').length;
  const total = entries.length;

  // Once every landmark is either successful or failed, hide the banner.
  if (running.length === 0) return null;

  // Average progress across the still-running items, weighted equally.
  const avg =
    running.reduce(
      (acc, s) => acc + Math.max(0, Math.min(100, s.progress)),
      0,
    ) / running.length;

  const firstRunning = running[0];
  const detail =
    running.length === 1
      ? `${firstRunning.name} · ${firstRunning.phase} ${firstRunning.progress}%`
      : `${running.length} landmarks in flight · ${Math.round(avg)}% avg`;

  return (
    <div
      className="tripo-activity"
      role="status"
      aria-live="polite"
      aria-label="Generating iconic 3D landmark meshes"
      data-tripo-active="true"
    >
      <span className="tripo-activity-spinner" aria-hidden="true" />
      <div className="tripo-activity-body">
        <div className="tripo-activity-title">
          Generating iconic 3D landmarks
        </div>
        <div className="tripo-activity-detail">{detail}</div>
        <div
          className="tripo-activity-bar"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(avg)}
        >
          <span
            className="tripo-activity-bar-fill"
            style={{ width: `${Math.max(2, Math.min(100, avg))}%` }}
          />
        </div>
        {(done > 0 || failed > 0) && (
          <div className="tripo-activity-summary">
            {done > 0 && <span>{done} ready</span>}
            {done > 0 && failed > 0 && <span> · </span>}
            {failed > 0 && (
              <span className="tripo-activity-failed">
                {failed} failed (using silhouette)
              </span>
            )}
            <span> · {total} total</span>
          </div>
        )}
      </div>
    </div>
  );
}
