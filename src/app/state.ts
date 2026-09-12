import { findOpeningWorld } from '../data/locations';
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
  eraTransition: { requestId: number; world: HistoricalWorld } | null;
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
  eraTransition: null,
};

export type AppAction =
  | { type: 'mode'; mode: EntryMode }
  | { type: 'location'; id: string | null }
  | { type: 'era'; id: string; world: HistoricalWorld | null }
  | { type: 'enterWorld'; world: HistoricalWorld }
  | { type: 'era-request'; requestId: number; world: HistoricalWorld }
  | { type: 'era-commit'; requestId: number }
  | { type: 'era-cancel'; requestId: number }
  | { type: 'poi'; id: string }
  | { type: 'object'; id: string | null }
  | { type: 'overview' }
  | { type: 'audio'; state: AudioState };

export function appReducer(state: AppState, action: AppAction): AppState {
  if (
    state.eraTransition &&
    ['poi', 'object', 'overview', 'audio'].includes(action.type)
  )
    return state;
  switch (action.type) {
    case 'mode':
      return { ...initialState, mode: action.mode };
    case 'location': {
      if (!action.id) return { ...initialState, mode: state.mode };
      const world = findOpeningWorld(action.id);
      return world
        ? {
            ...initialState,
            mode: state.mode,
            selectedLocationId: world.locationId,
            selectedEraId: world.era.id,
            activeWorld: world,
          }
        : {
            ...initialState,
            mode: state.mode,
            selectedLocationId: action.id,
          };
    }
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
    case 'era-request': {
      const source = state.activeWorld;
      const target = action.world;
      if (
        state.eraTransition ||
        state.cameraMode !== 'OVERVIEW' ||
        !source?.scene.overviewImage ||
        !target.scene.overviewImage ||
        source.id === target.id ||
        target.locationId !== state.selectedLocationId ||
        !source.scene.overviewTransition ||
        source.scene.overviewTransition.group !==
          target.scene.overviewTransition?.group
      )
        return state;
      return {
        ...state,
        activePOIId: null,
        selectedObjectId: null,
        audioState: 'idle',
        eraTransition: { requestId: action.requestId, world: target },
      };
    }
    case 'era-commit': {
      if (state.eraTransition?.requestId !== action.requestId) return state;
      const world = state.eraTransition.world;
      return {
        ...initialState,
        mode: state.mode,
        selectedLocationId: world.locationId,
        selectedEraId: world.era.id,
        activeWorld: world,
      };
    }
    case 'era-cancel':
      return state.eraTransition?.requestId === action.requestId
        ? { ...state, eraTransition: null }
        : state;
    case 'poi':
      return state.activeWorld?.pois.some(
        (poi) =>
          poi.id === action.id &&
          !poi.preview &&
          (state.activeWorld?.scene.presentation !== 'immersive-city' ||
            !!poi.immersive),
      )
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
      const poi = state.activeWorld.pois.find((poi) => poi.id === object.poiId);
      if (
        state.activeWorld.scene.presentation === 'immersive-city' &&
        (!poi?.immersive ||
          poi.preview ||
          state.activePOIId !== poi.id ||
          !poi.objectIds.includes(object.id))
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
