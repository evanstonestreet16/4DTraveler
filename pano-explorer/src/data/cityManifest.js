/**
 * Registry of panorama nodes per city.
 *
 * Each node maps to a landmark-prefixed image on disk.
 */
export const COORD_PRECISION = 7;

export const CITY_MANIFEST = {
  rome: [
    {
      lat: 41.8899144,
      lon: 12.4905981,
      title: 'Colosseum Exterior - South-West (Historical 1520s)',
      landmark: 'colosseum',
      description:
        'The Flavian Amphitheatre seen from the south-west, as it stood in the early 16th century before the later stone quarrying.'
    },
    {
      lat: 41.8899982,
      lon: 12.492235,
      title: 'Colosseum North Approach',
      landmark: 'colosseum',
      description: 'Looking toward the northern arcades from the approach along Via del Colosseo.'
    },
    {
      lat: 41.8909304,
      lon: 12.4908728,
      title: 'Via dei Fori Imperiali Junction',
      landmark: 'colosseum',
      description: 'The junction where Via dei Fori Imperiali meets Piazza del Colosseo, with the Roman Forum behind.'
    }
  ]
};

export const CITY_LABELS = {
  rome: 'Rome, Italy'
};

/** Format a coordinate exactly as it appears in the image file name. */
export function formatCoord(value) {
  return Number(value).toFixed(COORD_PRECISION);
}

function formatImageCoord(value) {
  return formatCoord(value).replace(/0+$/, '').replace(/\.$/, '');
}

function getCoordinateImageUrl(city, lat, lon) {
  return `/images/citystreetviews/${city}/${formatCoord(lat)},${formatCoord(lon)}.jpg`;
}

export function getImageCandidates(city, node) {
  const landmark = node.landmark || node.imagePrefix;
  if (landmark) {
    const filename = `${landmark}_${formatImageCoord(node.lat)},${formatImageCoord(node.lon)}.jpg`;
    return [`/images/citystreetviews/${city}/${landmark}/${filename}`];
  }
  return [getCoordinateImageUrl(city, node.lat, node.lon)];
}

export function getImageUrl(city, lat, lon) {
  return getCoordinateImageUrl(city, lat, lon);
}

export function getCityNodes(city) {
  return CITY_MANIFEST[city] || [];
}

export function findNode(city, lat, lon) {
  return getCityNodes(city).find(
    (node) => formatCoord(node.lat) === formatCoord(lat) && formatCoord(node.lon) === formatCoord(lon)
  );
}
