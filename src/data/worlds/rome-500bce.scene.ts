import images from '../../../public/images/rome-500bce/manifest.json' with { type: 'json' };
import type { HistoricalWorld, PointOfInterest } from '../../types/world';
import { rome125Scene } from './rome-125.scene';

export const rome500bceScene: HistoricalWorld['scene'] = {
  presentation: 'immersive-city',
  overviewTransition: rome125Scene.overviewTransition,
  overviewCamera: rome125Scene.overviewCamera,
  background: '#a79b77',
  primitives: [],
  overviewImage: {
    ...images.overview,
    description:
      'Circa 500 BCE · Interpretive reconstruction · Places shown as previews',
    // Reviewed on the separately authored images; registration is approximate.
    markers: {
      '500bce-capitoline-temple': {
        desktop: [0.511, 0.507],
        mobile: [0.445, 0.433],
      },
      '500bce-forum-valley': {
        desktop: [0.485, 0.403],
        mobile: [0.603, 0.367],
      },
      '500bce-circus-valley': {
        desktop: [0.904, 0.711],
        mobile: [0.253, 0.677],
      },
    },
  },
};

/** Approximate Rome coordinates, in metres. Preview POIs retain the overview camera. */
export const rome500bcePOILayout: PointOfInterest[] = [
  {
    id: '500bce-capitoline-temple',
    name: 'Capitoline Temple',
    markerPosition: [-280, 65, 320],
    camera: rome500bceScene.overviewCamera,
    objectIds: [],
    preview: true,
  },
  {
    id: '500bce-forum-valley',
    name: 'Roman Forum',
    markerPosition: [120, 20, 360],
    camera: rome500bceScene.overviewCamera,
    objectIds: [],
    preview: true,
  },
  {
    id: '500bce-circus-valley',
    name: 'Circus Valley',
    markerPosition: [230, 8, 1070],
    camera: rome500bceScene.overviewCamera,
    objectIds: [],
    preview: true,
  },
];
