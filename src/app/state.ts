import type { AudioState, CameraMode, HistoricalWorld } from '../types/world';

/**
 * Which entry surface the user is on. `catalog` is the curated Pittsburgh
 * path; `globe` is the LLM-generated flow. The distinction stays local to
 * the app shell — downstream world rendering does not branch on it.
 */
export type EntryMode = 'catalog' | 'globe';

export interface AppState {
  mode: EntryMode;
  selectedLocationId: string | null;
  selectedEraId: string | null;
  activeWorld: HistoricalWorld | null;
  activePOIId: string | null;
  selectedObjectId: string | null;
  cameraMode: CameraMode;
  audioState: AudioState;
}

export const initialState: AppState = {
  mode: 'catalog',
  selectedLocationId: null,
  selectedEraId: null,
  activeWorld: null,
  activePOIId: null,
  selectedObjectId: null,
  cameraMode: 'OVERVIEW',
  audioState: 'idle',
};

export type AppAction =
  | { type: 'mode'; mode: EntryMode }
  | { type: 'location'; id: string | null }
  | { type: 'era'; id: string; world: HistoricalWorld | null }
  | { type: 'enterWorld'; world: HistoricalWorld }
  | { type: 'poi'; id: string }
  | { type: 'object'; id: string | null }
  | { type: 'overview' }
  | { type: 'audio'; state: AudioState };

export function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'mode':
      return { ...initialState, mode: action.mode };
    case 'location':
      return {
        ...initialState,
        mode: state.mode,
        selectedLocationId: action.id,
      };
    case 'enterWorld':
      return {
        ...initialState,
        mode: state.mode,
        selectedLocationId: action.world.locationId,
        selectedEraId: action.world.era.id,
        activeWorld: action.world,
      };
    case 'era': {
      const world =
        action.world?.locationId === state.selectedLocationId &&
        action.world.era.id === action.id
          ? action.world
          : null;
      return {
        ...initialState,
        mode: state.mode,
        selectedLocationId: state.selectedLocationId,
        selectedEraId: action.id,
        activeWorld: world,
      };
    }
    case 'poi':
      return state.activeWorld?.pois.some((poi) => poi.id === action.id)
        ? {
            ...state,
            activePOIId: action.id,
            selectedObjectId: null,
            cameraMode: 'POI',
          }
        : state;
    case 'object': {
      if (action.id === null) return { ...state, selectedObjectId: null };
      const object = state.activeWorld?.objects.find(
        (object) => object.id === action.id,
      );
      if (
        !object ||
        !state.activeWorld?.pois.some((poi) => poi.id === object.poiId)
      )
        return state;
      return {
        ...state,
        selectedObjectId: object.id,
        activePOIId: object.poiId,
        cameraMode: 'POI',
      };
    }
    case 'overview':
      return {
        ...state,
        activePOIId: null,
        selectedObjectId: null,
        cameraMode: 'OVERVIEW',
      };
    case 'audio':
      return { ...state, audioState: action.state };
  }
}
