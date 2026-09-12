# City model prefetch

`useCityModelPrefetch(world, overviewInteractive)` prepares the first two available POI models in world-data order: the hero and the next ready viewpoint. Preview POIs, duplicate URLs, and the overview model are excluded. This is shared behavior; there are no city or POI IDs in the loader.

The caller enables prefetch only while the city overview is visible, its detailed model is ready, and graphics are available. A 500 ms quiet period lets the overview paint before an idle callback starts sequential background requests. Leaving the overview, hiding the scene, losing graphics, changing cities, or unmounting cancels the delay and any active fetch. Each run also has a 15-second timeout.

Prefetch requests use the exact authored URL, including its asset hash, with the same `force-cache` HTTP-cache policy as the foreground loader. The response is streamed and discarded. Prefetch never parses a GLB, retains a JavaScript model buffer, or creates a GPU scene. The browser owns ordinary HTTP-cache storage and eviction; no service worker, persistent application cache, or backend is involved.

Each mounted city session has a 20,000,000-byte transfer budget. Completed and partial response chunks count toward that budget across repeated overview visits. A response is declined before consuming its body when its length is missing, invalid, larger than the remaining budget, or describes a content-encoded body whose decoded length cannot be known. A stream that exceeds the remaining allowance is cancelled immediately; the browser may already have buffered its final network chunk. This conservative policy means some servers will skip prefetch while foreground loading still works normally.

Completed URLs and optional failures are attempted once per session. A navigation-cancelled URL may resume through a fresh request on a later overview visit using the remaining budget. Failed background work never installs a failed promise or scene into the foreground loader: selecting the POI still performs its ordinary cancellable load and keeps its fallback geometry usable. Exiting the city discards bookkeeping; parsed scenes continue to be owned and disposed by `ModelScene` on every visit.

Unit tests cover candidate ordering, cache policy, no GLB parsing, cancellation/resumption, budget rejection, and foreground loading after a failed prefetch. Browser coverage verifies that the overview becomes ready before Pantheon preparation starts and that entering the prepared view preserves the normal selection and fallback paths.
