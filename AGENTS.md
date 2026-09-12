# Contributor and Agent Rules

Rules for anyone contributing to 4DTraveler. Update [PROJECT_STATUS.md](PROJECT_STATUS.md) whenever the product scope changes.

## Active scope

- The active demo contains Rome / 125 CE and Kyoto / circa 1700.
- Both cities are overview-only: responsive bird’s-eye images with selectable POI markers and a matching POI list.
- Ground-level POI visuals are intentionally excluded until replacement artwork is ready.
- Prefer a convincing, reliable demo over broad abstractions or speculative features.

## Architecture

- Keep historical content and layout in `src/data/`, separate from rendering.
- Centralize shared contracts in `src/types/world.ts` and update consumers together.
- Keep world IDs, POI IDs, image paths, and marker coordinates stable.
- Runtime visuals belong in `public/images/<world-id>/`; source tools must not become browser dependencies.
- Keep generic UI city-agnostic and components focused.

## Development

- Keep TypeScript strict and avoid `any`.
- Do not commit secrets or add external services for local development.
- Run the focused overview tests and `npm run typecheck` for ordinary changes.
- Run `npm run build` and the overview browser smoke test after runtime integration changes.
