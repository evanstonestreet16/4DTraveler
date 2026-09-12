type GlobeLogoProps = {
  compact?: boolean;
};

/** Lockup: the globe mark stands in for "4D", with Traveler beside it. */
export function GlobeLogo({ compact = false }: GlobeLogoProps) {
  const lockup = (
    <>
      <img
        className="globe-logo"
        src="/images/4d-logo.png"
        alt=""
        width={721}
        height={721}
      />
      <span className="globe-logo-word" aria-hidden="true">
        Traveler
      </span>
    </>
  );

  if (compact) {
    return <span className="globe-logo-lockup is-compact">{lockup}</span>;
  }

  return (
    <div className="globe-logo-lockup" role="img" aria-label="4D Traveler">
      {lockup}
    </div>
  );
}
