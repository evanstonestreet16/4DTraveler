import type { Vec3 } from '../../types/world';

/**
 * Convert (lat, lon) in degrees to a cartesian point on a sphere of the
 * given radius. Uses the equirectangular convention (lat=0/lon=0 sits on
 * the +X axis) — we don't render an Earth texture, so the convention just
 * needs to be self-consistent across every marker.
 */
export function latLonToVec3(
  latDeg: number,
  lonDeg: number,
  radius: number,
): Vec3 {
  const phi = ((90 - latDeg) * Math.PI) / 180;
  const theta = ((lonDeg + 180) * Math.PI) / 180;
  return [
    -radius * Math.sin(phi) * Math.cos(theta),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.sin(theta),
  ];
}
