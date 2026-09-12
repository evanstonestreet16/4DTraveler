import type { HistoricalWorld } from '../types/world';

export interface AppState {
  selectedLocationId: string | null;
  selectedEraId: string | null;
  activeWorld: HistoricalWorld | null;
}

export const initialState: AppState = {
  selectedLocationId: null,
  selectedEraId: null,
  activeWorld: null,
};

export type AppAction =
  | { type: 'location'; id: string | null }
  | { type: 'era'; id: string; world: HistoricalWorld | null };

export function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'location':
      return { ...initialState, selectedLocationId: action.id };
    case 'era': {
      const world =
        action.world?.locationId === state.selectedLocationId &&
        action.world.era.id === action.id
          ? action.world
          : null;
      return {
        selectedLocationId: state.selectedLocationId,
        selectedEraId: action.id,
        activeWorld: world,
      };
    }
  }
}
