/** Placeholder mark for the intro; swap the <svg> contents for the final logo art when it's ready. */
export function GlobeLogo() {
  return (
    <svg
      className="globe-logo"
      viewBox="0 0 120 120"
      role="img"
      aria-label="4DTraveler"
    >
      <circle cx="60" cy="60" r="52" fill="#1d4e6b" />
      <ellipse
        cx="60"
        cy="60"
        rx="52"
        ry="20"
        fill="none"
        stroke="#3a7d44"
        strokeWidth="2.5"
      />
      <ellipse
        cx="60"
        cy="60"
        rx="24"
        ry="52"
        fill="none"
        stroke="#3a7d44"
        strokeWidth="2.5"
      />
      <circle
        cx="60"
        cy="60"
        r="52"
        fill="none"
        stroke="#e6e9df"
        strokeWidth="2"
      />
    </svg>
  );
}
