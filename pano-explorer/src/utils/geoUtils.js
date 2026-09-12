const toRad = (deg) => (deg * Math.PI) / 180;
const toDeg = (rad) => (rad * 180) / Math.PI;

/**
 * Initial compass bearing (degrees clockwise from true north) from point 1 to point 2,
 * using the forward-azimuth formula on a spherical Earth.
 */
export function calculateBearing(lat1, lon1, lat2, lon2) {
  const φ1 = toRad(lat1);
  const φ2 = toRad(lat2);
  const Δλ = toRad(lon2 - lon1);

  const y = Math.sin(Δλ) * Math.cos(φ2);
  const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);

  return (toDeg(Math.atan2(y, x)) + 360) % 360;
}

/**
 * Map a compass bearing to a point on the ground plane of the panorama sphere.
 * North is -Z (straight ahead when the camera yaw is 0), East is +X.
 */
export function bearingTo3DPosition(bearingDeg, radius = 12, height = -3.5) {
  const rad = toRad(bearingDeg);
  return {
    x: radius * Math.sin(rad),
    y: height,
    z: -radius * Math.cos(rad)
  };
}

/** Great-circle distance in meters via the Haversine formula. */
export function calculateDistanceMeters(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

/** Human-readable distance label: "85 m" or "1.2 km". */
export function formatDistance(meters) {
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${(meters / 1000).toFixed(1)} km`;
}

const CARDINALS = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];

/** Nearest 8-point compass label for a bearing in degrees. */
export function bearingToCardinal(bearingDeg) {
  const idx = Math.round((((bearingDeg % 360) + 360) % 360) / 45) % 8;
  return CARDINALS[idx];
}
