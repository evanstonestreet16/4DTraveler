# Runtime models

`pittsburgh-1892.glb` is the original modular hero, with `pittsburgh-1892.glb.gz` providing its native gzip transport. The plain file is retained as a browser/transport fallback. `pittsburgh-1892.metrics.json` records exported geometry/material/byte budgets. `pipeline-fixture.glb` is the small deterministic selection/loading contract fixture; it is not loaded by the hero path.

The five selectable group names are `furnace`, `stack`, `rail-car`, `warehouse` and `bridge`. No historical object IDs are renamed. The complete primitive geometry remains in world data for loading/error fallback. The 1850 blockout shares the data-defined geography and needs no duplicate GLB.

Regenerate with `npm run assets:fixture` and `npm run assets:hero`; check with `npm run assets:validate`. After modifying the hero, update both URLs' SHA-256 version prefix in scene data. Sources, export conventions, provenance and budgets are in [asset pipeline](../../docs/ASSET_PIPELINE.md), [hero notes](../../docs/visual/HERO_ASSET.md), and [performance measurements](../../docs/PERFORMANCE.md). The offline kit under `scripts/` is not served in the runtime build. No third-party models or textures are bundled.
