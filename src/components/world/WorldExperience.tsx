import type { HistoricalWorld } from '../../types/world';
import { CityExperience } from './CityExperience';

export default function WorldExperience({ world }: { world: HistoricalWorld }) {
  return <CityExperience world={world} />;
}
