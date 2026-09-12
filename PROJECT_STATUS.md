# Project Status

This is the current product scope for 4DTraveler. Update it whenever the shipped experience changes.

## Project goal

4DTraveler is an interactive historical explorer built with React and strict TypeScript. It favors dependable hackathon-scale vertical slices over generalized infrastructure.

## Current scope

The active demo includes Rome / 125 CE and Kyoto / circa 1700. Both cities ship as full-viewport bird’s-eye views with separately composed desktop and portrait images, compressed fallbacks, and three selectable POIs.

POI selection is intentionally limited to highlighting and naming the destination. Ground-level visuals, object inspection, narration, ambient audio, and model loading are excluded from this release while replacement POI artwork is prepared.

The repository and runtime contain no inactive city data, assets, documentation, or tests.

## Recent updates

- 2026-09-12 — Shipped the overview-only Rome and Kyoto demo, retained clickable stable POIs, removed ground-level POI assets from the release, and removed the inactive city implementation and references.
