import type { PanoramaHotspot, Vec3 } from '../types/world';

/** Project authored north/west/up angles onto a sphere around the fixed eye. */
export function hotspotPosition(
  hotspot: Pick<PanoramaHotspot, 'yaw' | 'pitch'>,
  eye: Vec3,
  radius = 10,
): Vec3 {
  const horizontal = radius * Math.cos(hotspot.pitch);
  return [
    eye[0] - Math.sin(hotspot.yaw) * horizontal,
    eye[1] + Math.sin(hotspot.pitch) * radius,
    eye[2] - Math.cos(hotspot.yaw) * horizontal,
  ];
}
