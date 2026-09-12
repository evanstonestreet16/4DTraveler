# JIT-disabled memory diagnostic

This diagnostic used frozen production build `c87afe3`, Chromium 153.0.8010.12, Apple M3 Metal, High quality, a 1440 × 1000 desktop viewport, DPR 1 and a headed browser. It followed the existing profiler's complete path with five warmup cycles and five measured cycles. The only browser-launch alteration was `--js-flags=--jitless`. It is not a proposed production setting.

| Measured post-leave cycle | Normal browser, previous warmup control | Diagnostic with JIT disabled |
| ------------------------- | --------------------------------------: | ---------------------------: |
| 1                         |                               8,010,552 |                    5,012,212 |
| 2                         |                               8,107,500 |                    5,015,540 |
| 3                         |                               8,171,756 |                    5,015,356 |
| 4                         |                               8,545,876 |                    5,052,276 |
| 5                         |                               8,636,608 |                    5,056,108 |

The unchanged observation check passes for this diagnostic: cycles 2–5 grew **40,568 bytes**, with a 40,752-byte spread, below its existing 262,144-byte tolerance and without strictly increasing samples. The previous normal-browser control grew **529,108 bytes** and its failure remains valid and unchanged. This is a controlled diagnostic comparison, not proof that normal-browser total heap plateaus. Diagnostic snapshots were captured at measured cycles 2 and 5; the previous normal warmup control did not capture snapshots. Normal five-cycle snapshots independently established compilation-dominated growth.

The diagnostic snapshots contain **zero InstructionStream nodes at both checkpoints**, verifying that the requested JIT restriction took effect. Other compiler data still grew by 35,148 bytes, chiefly FeedbackVector (+28,064) and LoadHandler (+5,052). Ordinary-object self size grew by only **860 bytes**. Closures remain 9,527; all retained Three counts and self sizes remain exactly unchanged: Object3D 22, Mesh 8, BufferGeometry 8, Material 12, Texture 8, Camera 7, Scene 2 and WebGLRenderer 1. Array backing-storage bytes remain 1,167,200 at every measured checkpoint. Every leave returns GPU handles to baseline and entered GPU counts remain constant.

Together with the normal-run retainer inspection, this strongly supports compilation and browser/profiling metadata as the dominant cause of raw total-heap growth, rather than accumulating owned world graphs. It supports assessing retained application objects and graphics resources separately from compiler totals. It does not establish a zero-growth guarantee for every browser, device or session length, and makes no new production performance claim.

## Instrumentation review

No scene-retaining instrumentation reference was identified. WebGL records use WeakRef, handles use WeakSet, the lookup uses WeakMap, released records are pruned, and only a numeric last-release summary is retained. Recorded frame arrays are cleared after transfer to Node. The renderer diagnostic closure is removed from the canvas on unmount. Network journals and collected trace arrays live in the Node process rather than the measured page heap. Page listeners and model/material ownership were independently reviewed and have matching cleanup.

Small retained metadata is visible and should not be mislabeled as an app leak: `blink::NetworkResourcesData::ResourceData` grows by six entries / 1,728 self bytes because the profiler enables the Network domain; browser paint/layout/resource timing objects also accumulate during the measured navigations. These observations explain why an exact zero-byte total-heap delta is not an appropriate ownership claim. No profiler thresholds, app code, browser production configuration or budgets were changed for this diagnostic.

## Evidence and reproduction

- `desktop.json` preserves the full five warmup/five measured samples, frame traces, GC heaps, resource counters, request/cache journal, environment and checks.
- `heap-comparison.json` contains the compact snapshot type/name and Three-flag comparison.
- `finding.json` joins the normal and diagnostic raw heap checks and records local snapshot filenames, sizes, hashes and compiler-node counts. The two 14 MB snapshots stay local.
- `launch-arguments.json` records the actual executable and every browser argument; `script-provenance.json` records source and diagnostic script hashes.
- `profile-world-jitless.patch` changes a temporary profiler copy only, adding the browser flag and explicit diagnostic metadata. `build-assets.json` identifies the unchanged measured files by hash.

From the repository root with dependencies installed, serve the preserved `c87afe3` production directory on port 4182. Keep other browser/GPU workloads stopped. Then reproduce using a temporary copy; this does not edit the checked-in profiler or app:

```sh
task_repo=$(pwd)
task_tmp=$(mktemp -d /private/tmp/4dtraveler-jitless.XXXXXX)
cp scripts/profile-world.mjs scripts/asset-budgets.mjs "$task_tmp/"
ln -s "$task_repo/node_modules" "$task_tmp/node_modules"
patch -d "$task_tmp" -p1 < docs/evidence/performance/after/jitless-diagnostic/profile-world-jitless.patch
cd "$task_tmp"
DEBUG=pw:browser \
PROFILE_URL=http://127.0.0.1:4182 \
PROFILE_DIST=/private/tmp/4dtraveler-after-quality-dist \
PROFILE_OUTPUT="$task_tmp/results" \
PROFILE_BASELINE="$task_repo/docs/evidence/performance/before/apple-m3-high" \
PROFILE_REPO="$task_repo" \
PROFILE_REVISION=c87afe3 \
PROFILE_BACKEND=hardware \
PROFILE_HEADED=1 \
PROFILE_VIEWPORTS=desktop \
PROFILE_DPR=1 \
PROFILE_QUALITY=high \
PROFILE_WARMUP_CYCLES=5 \
PROFILE_HEAP_SNAPSHOTS=1 \
PROFILE_NOTE='Diagnostic only: frozen c87afe3 on Apple M3 Metal High with V8 --jitless; five warmup plus five measured cycles. Not production policy or performance certification.' \
node profile-world.mjs > run.log 2>&1
```

The patch is tied to the profiler hash in `script-provenance.json`; review any future context mismatch instead of applying it to unrelated changed code. A new reproduction should preserve its own exact build, process arguments and outputs. Exit 0 was observed in this run; normal-browser flags/checks remain unchanged elsewhere.
