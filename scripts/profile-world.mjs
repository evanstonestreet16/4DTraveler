/* global window, document, performance, requestAnimationFrame */
import { chromium } from '@playwright/test';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { execFileSync } from 'node:child_process';
import { platform, release, arch, cpus, totalmem } from 'node:os';
import { URL } from 'node:url';
import process from 'node:process';
import console from 'node:console';
import { assetKind, measureBuild } from './asset-budgets.mjs';

if (process.argv.includes('--help')) {
  console.log(`Profile a separately built/served production 4DTraveler site.
PROFILE_URL=http://127.0.0.1:4174 PROFILE_OUTPUT=docs/evidence/performance/after node scripts/profile-world.mjs
Options: PROFILE_DIST=dist, PROFILE_BACKEND=software|hardware, PROFILE_HEADED=1,
PROFILE_VIEWPORTS=desktop, PROFILE_DPR=1, PROFILE_QUALITY=auto|low|medium|high,
PROFILE_BASELINE=docs/evidence/performance/baseline, PROFILE_REPO=., PROFILE_ERA=1892,
PROFILE_REVISION=<exact build commit when serving a frozen snapshot>,
PROFILE_HEAP_SNAPSHOTS=1 (large local diagnostic files at post-leave cycles 2 and 5),
PROFILE_WARMUP_CYCLES=5 (same cycle path before the five measured cycles; default 0),
PROFILE_MODEL_EXPECTED=0 (only for primitive baseline), PROFILE_NOTE="measurement context".
Hardware requests the browser's default GPU; the report verifies the actual renderer.
Exit 0: checks pass; 1: failed check/run; 2: measurements need review.`);
  process.exit(0);
}

const target = new URL(process.env.PROFILE_URL || 'http://127.0.0.1:4174');
target.searchParams.set('profile', '1');
const output = resolve(
  process.env.PROFILE_OUTPUT || 'docs/evidence/performance/after',
);
const baselineDirectory = resolve(
  process.env.PROFILE_BASELINE || 'docs/evidence/performance/baseline',
);
const software = process.env.PROFILE_BACKEND !== 'hardware';
const quality = process.env.PROFILE_QUALITY || 'auto';
const era = process.env.PROFILE_ERA || '1892';
const expectModel = process.env.PROFILE_MODEL_EXPECTED !== '0';
const warmupCount = Number(process.env.PROFILE_WARMUP_CYCLES || 0);
if (!Number.isInteger(warmupCount) || warmupCount < 0 || warmupCount > 10)
  throw new Error('PROFILE_WARMUP_CYCLES must be an integer from 0 to 10');
const requestedViewports = (process.env.PROFILE_VIEWPORTS || 'desktop').split(
  ',',
);
const sizes = {
  desktop: { width: 1440, height: 1000 },
};
for (const name of requestedViewports)
  if (!sizes[name]) throw new Error(`Unknown viewport ${name}`);
if (!['auto', 'low', 'medium', 'high'].includes(quality))
  throw new Error('Invalid PROFILE_QUALITY');
const dpr = Number(process.env.PROFILE_DPR || 1);
if (!Number.isFinite(dpr) || dpr <= 0 || dpr > 4)
  throw new Error('PROFILE_DPR must be >0 and <=4');
await mkdir(output, { recursive: true });
const build = await measureBuild(process.env.PROFILE_DIST || 'dist');
await writeFile(
  resolve(output, 'build-assets.json'),
  JSON.stringify(build, null, 2) + '\n',
);
function git(...args) {
  try {
    return execFileSync('git', args, {
      cwd: process.env.PROFILE_REPO || process.cwd(),
      encoding: 'utf8',
    }).trim();
  } catch {
    return 'unavailable';
  }
}
const environment = {
  timestamp: new Date().toISOString(),
  target: target.href,
  sourceRevision: process.env.PROFILE_REVISION || git('rev-parse', 'HEAD'),
  inspectedCheckoutRevision: git('rev-parse', 'HEAD'),
  sourceStatus: git('status', '--porcelain'),
  note: process.env.PROFILE_NOTE || '',
  os: {
    platform: platform(),
    release: release(),
    arch: arch(),
    cpu: cpus()[0]?.model,
    logicalCores: cpus().length,
    totalMemoryBytes: totalmem(),
  },
  requestedBackend: software ? 'SwiftShader' : 'browser default GPU',
  headed: process.env.PROFILE_HEADED === '1',
  quality,
  warmupCycles: warmupCount,
  deviceScaleFactor: dpr,
};

/** All handles are weakly held: measurement must not keep discarded worlds alive. */
function installInstrumentation() {
  const records = [];
  const contextLookup = new WeakMap();
  const kinds = [
    'Buffer',
    'Texture',
    'Program',
    'Framebuffer',
    'Renderbuffer',
    'VertexArray',
    'Shader',
  ];
  const emptyCounts = () => Object.fromEntries(kinds.map((kind) => [kind, 0]));
  const stats = {
    frames: [],
    recording: false,
    calls: 0,
    triangles: 0,
    phase: 'idle',
    maxTextureWidth: 0,
    maxTextureHeight: 0,
    contextsCreated: 0,
    contextLosses: 0,
    lastReleased: null,
  };
  function resources(context) {
    let record = contextLookup.get(context);
    if (record) return record;
    const debug = context.getExtension('WEBGL_debug_renderer_info');
    record = {
      id: ++stats.contextsCreated,
      ref: new WeakRef(context),
      state: 'active',
      generation: 0,
      losses: 0,
      renderer: debug
        ? context.getParameter(debug.UNMASKED_RENDERER_WEBGL)
        : context.getParameter(context.RENDERER),
      vendor: debug
        ? context.getParameter(debug.UNMASKED_VENDOR_WEBGL)
        : context.getParameter(context.VENDOR),
      version: context.getParameter(context.VERSION),
      counts: emptyCounts(),
      handles: Object.fromEntries(kinds.map((kind) => [kind, new WeakSet()])),
    };
    contextLookup.set(context, record);
    records.push(record);
    function markLost() {
      if (record.state === 'lost') return;
      record.state = 'lost';
      record.losses++;
      stats.contextLosses++;
      // Context loss releases its generation's GPU objects, even without delete calls.
      record.counts = emptyCounts();
      record.handles = Object.fromEntries(
        kinds.map((kind) => [kind, new WeakSet()]),
      );
    }
    record.markLost = markLost;
    context.canvas.addEventListener('webglcontextlost', markLost);
    context.canvas.addEventListener('webglcontextrestored', () => {
      record.state = 'active';
      record.generation++;
      if (!records.includes(record)) records.push(record);
    });
    return record;
  }
  const prototypes = [
    window.WebGLRenderingContext?.prototype,
    window.WebGL2RenderingContext?.prototype,
  ].filter(Boolean);
  for (const prototype of prototypes) {
    for (const kind of kinds) {
      const create = prototype[`create${kind}`],
        remove = prototype[`delete${kind}`];
      if (!create || !remove) continue;
      prototype[`create${kind}`] = function (...args) {
        const handle = create.apply(this, args),
          record = resources(this);
        if (
          handle &&
          !this.isContextLost() &&
          !record.handles[kind].has(handle)
        ) {
          record.handles[kind].add(handle);
          record.counts[kind]++;
        }
        return handle;
      };
      prototype[`delete${kind}`] = function (handle) {
        const record = resources(this);
        if (handle && record.handles[kind].delete(handle))
          record.counts[kind]--;
        return remove.call(this, handle);
      };
    }
    for (const method of [
      'drawElements',
      'drawArrays',
      'drawElementsInstanced',
      'drawArraysInstanced',
    ]) {
      const draw = prototype[method];
      if (!draw) continue;
      prototype[method] = function (...args) {
        resources(this);
        if (!this.isContextLost()) {
          stats.calls++;
          const count = method.includes('Elements') ? args[1] : args[2];
          const instances = method.endsWith('Instanced') ? args.at(-1) : 1;
          if (args[0] === 4)
            stats.triangles += Math.floor(count / 3) * instances;
          if (args[0] === 5 || args[0] === 6)
            stats.triangles += Math.max(0, count - 2) * instances;
        }
        return draw.apply(this, args);
      };
    }
    for (const method of [
      'texImage2D',
      'texStorage2D',
      'texImage3D',
      'texStorage3D',
    ]) {
      const allocate = prototype[method];
      if (!allocate) continue;
      prototype[method] = function (...args) {
        const width =
          method === 'texImage2D' && args.length === 6
            ? args[5]?.width
            : args[3];
        const height =
          method === 'texImage2D' && args.length === 6
            ? args[5]?.height
            : args[4];
        if (typeof width === 'number')
          stats.maxTextureWidth = Math.max(stats.maxTextureWidth, width);
        if (typeof height === 'number')
          stats.maxTextureHeight = Math.max(stats.maxTextureHeight, height);
        return allocate.apply(this, args);
      };
    }
  }
  function snapshot() {
    const alive = emptyCounts();
    const contexts = records.map((record) => {
      const context = record.ref.deref();
      if (context?.isContextLost()) record.markLost();
      if (!context) {
        record.state = 'collected';
        record.counts = emptyCounts();
      }
      for (const kind of kinds) alive[kind] += record.counts[kind];
      const summary = {
        id: record.id,
        state: record.state,
        generation: record.generation,
        losses: record.losses,
        renderer: record.renderer,
        vendor: record.vendor,
        version: record.version,
        alive: { ...record.counts },
      };
      if (record.state !== 'active') stats.lastReleased = summary;
      return summary;
    });
    // Keep only live weak records and one numeric release summary. An ever-growing
    // instrumentation history would itself bias the five-cycle heap measurement.
    for (let index = records.length - 1; index >= 0; index--) {
      if (records[index].state !== 'active') records.splice(index, 1);
    }
    if (
      stats.lastReleased &&
      !contexts.some((context) => context.id === stats.lastReleased.id)
    )
      contexts.push(stats.lastReleased);
    const canvas = document.querySelector('.world-canvas canvas');
    return {
      alive,
      contexts,
      contextsCreated: stats.contextsCreated,
      contextLosses: stats.contextLosses,
      rendererInfo: canvas?.__worldRendererInfo?.() ?? null,
      canvas: canvas
        ? {
            cssWidth: canvas.clientWidth,
            cssHeight: canvas.clientHeight,
            bufferWidth: canvas.width,
            bufferHeight: canvas.height,
          }
        : null,
      maxTextureWidth: stats.maxTextureWidth,
      maxTextureHeight: stats.maxTextureHeight,
      visibility: document.visibilityState,
    };
  }
  let previous;
  function frame(time) {
    if (stats.recording && previous !== undefined)
      stats.frames.push({
        atMs: time,
        phase: stats.phase,
        ms: time - previous,
        calls: stats.calls,
        triangles: stats.triangles,
      });
    stats.calls = 0;
    stats.triangles = 0;
    previous = time;
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
  window.__worldProfile = {
    snapshot,
    start(phase) {
      stats.frames = [];
      stats.phase = phase;
      stats.recording = true;
    },
    phase(name) {
      stats.phase = name;
    },
    stop() {
      stats.recording = false;
      const frames = stats.frames;
      stats.frames = [];
      return frames;
    },
  };
}

function frameSummary(trace) {
  const active = trace.filter((frame) => frame.calls > 0);
  const quantile = (values, p) => {
    const sorted = [...values].sort((a, b) => a - b);
    return sorted.length
      ? sorted[Math.min(sorted.length - 1, Math.floor((sorted.length - 1) * p))]
      : null;
  };
  const p95 = quantile(
    active.map((frame) => frame.ms),
    0.95,
  );
  return {
    activeFrames: active.length,
    idleFrames: trace.length - active.length,
    p50Ms: quantile(
      active.map((frame) => frame.ms),
      0.5,
    ),
    p95Ms: p95,
    p95ReciprocalFps: p95 ? 1000 / p95 : null,
    p50DrawCalls: quantile(
      active.map((frame) => frame.calls),
      0.5,
    ),
    p95DrawCalls: quantile(
      active.map((frame) => frame.calls),
      0.95,
    ),
    peakDrawCalls: active.length
      ? Math.max(...active.map((frame) => frame.calls))
      : null,
    peakTriangles: active.length
      ? Math.max(...active.map((frame) => frame.triangles))
      : null,
    interpretation:
      'Active requestAnimationFrame intervals with submitted GPU draws, not GPU timer-query duration or certified presented FPS. Counts include shadow/effect passes.',
  };
}

function resourceTotals(entries) {
  const totals = {};
  for (const entry of entries) {
    const bucket = (totals[assetKind(entry.name)] ??= {
      requests: 0,
      encodedBytes: 0,
      decodedBytes: 0,
      transferBytes: 0,
    });
    bucket.requests++;
    bucket.encodedBytes += entry.encodedBodySize;
    bucket.decodedBytes += entry.decodedBodySize;
    bucket.transferBytes += entry.transferSize;
  }
  return totals;
}

async function resourceEntries(page) {
  return page.evaluate(() =>
    performance.getEntriesByType('resource').map((entry) => ({
      name: new URL(entry.name).pathname,
      startTime: entry.startTime,
      duration: entry.duration,
      initiatorType: entry.initiatorType,
      encodedBodySize: entry.encodedBodySize,
      decodedBodySize: entry.decodedBodySize,
      transferSize: entry.transferSize,
    })),
  );
}

async function chooseWorld(page) {
  const locationChoice = page.getByRole('button', {
    name: /Pennsylvania, United States Pittsburgh/,
  });
  if (await locationChoice.count()) await locationChoice.click();
  const started = Date.now();
  await page.getByRole('button', { name: new RegExp(`^${era} `) }).click();
  await page
    .getByRole('button', { name: 'Visit Steel Mill', exact: true })
    .waitFor();
  const primitiveVisibleMs = Date.now() - started;
  if (expectModel)
    await page
      .locator('[data-model-status="ready"], [data-model-status="fallback"]')
      .waitFor({ state: 'attached', timeout: 30000 });
  const state = await page
    .locator('[data-model-status]')
    .getAttribute('data-model-status')
    .catch(() => null);
  if (expectModel && state !== 'ready')
    throw new Error(
      `Hero failed to load; measuring fallback is invalid (state ${state}).`,
    );
  await page.evaluate(
    () =>
      new Promise((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(resolve)),
      ),
  );
  const heroReadyMs = Date.now() - started;
  const select = page.getByRole('combobox', {
    name: 'Scene quality',
    exact: true,
  });
  if (await select.count()) await select.selectOption(quality);
  else if (quality !== 'auto')
    throw new Error('Requested quality control is unavailable');
  return { primitiveVisibleMs, heroReadyMs, modelState: state };
}

async function collectHeap(cdp) {
  await cdp.send('HeapProfiler.collectGarbage');
  const heap = await cdp.send('Runtime.getHeapUsage');
  return {
    usedBytes: heap.usedSize,
    totalBytes: heap.totalSize,
    embedderHeapUsedBytes: heap.embedderHeapUsedSize ?? null,
    backingStorageBytes: heap.backingStorageSize ?? null,
  };
}

async function captureHeapSnapshot(cdp, path) {
  const chunks = [];
  const collect = (event) => chunks.push(event.chunk);
  cdp.on('HeapProfiler.addHeapSnapshotChunk', collect);
  try {
    await cdp.send('HeapProfiler.takeHeapSnapshot', {
      reportProgress: false,
      captureNumericValue: false,
      exposeInternals: false,
    });
    await writeFile(path, chunks.join(''));
  } finally {
    cdp.off('HeapProfiler.addHeapSnapshotChunk', collect);
  }
}

function assess(result) {
  const checks = [];
  const check = (name, status, details) =>
    checks.push({ name, status, details });
  check(
    'No uncaught page errors',
    result.errors.length ? 'fail' : 'pass',
    result.errors,
  );
  check(
    'Heavy model stays out of landing',
    result.landingResources.some((entry) => assetKind(entry.name) === 'models')
      ? 'fail'
      : 'pass',
    result.landingTotals,
  );
  check(
    'Actual renderer diagnostics available',
    result.initial.rendererInfo ? 'pass' : 'review',
    result.initial.rendererInfo ??
      'Mount SceneDiagnostics under Canvas and use ?profile=1.',
  );
  check(
    'Active interaction frames captured',
    result.frameSummary.activeFrames >= 30 ? 'pass' : 'fail',
    `${result.frameSummary.activeFrames} active frames; three POI transitions and a settled scene.`,
  );
  const left = result.cycles.filter((cycle) =>
    Object.entries(cycle.left.alive).some(
      ([kind, count]) => count > result.beforeWorld.alive[kind],
    ),
  );
  check(
    'World GPU handles released after each leave',
    left.length ? 'fail' : 'pass',
    left.length
      ? left.map((c) => ({
          cycle: c.cycle,
          alive: c.left.alive,
          contexts: c.left.contexts,
        }))
      : 'Every cycle returned to the pre-world live-handle counts after context disposal. These are API handles, not measured GPU-resident bytes.',
  );
  const steady = result.cycles.slice(1);
  const countSpread = Object.fromEntries(
    Object.keys(steady[0].entered.alive).map((kind) => [
      kind,
      Math.max(...steady.map((c) => c.entered.alive[kind])) -
        Math.min(...steady.map((c) => c.entered.alive[kind])),
    ]),
  );
  check(
    'Entered GPU handles plateau after warmup',
    Object.values(countSpread).some((value) => value !== 0) ? 'fail' : 'pass',
    { cycles: '2–5', countSpread, tolerance: 0 },
  );
  const heaps = steady.map((c) => c.leftHeap.usedBytes);
  const increases = heaps
    .slice(1)
    .every((value, index) => value > heaps[index]);
  const growth = heaps.at(-1) - heaps[0],
    spread = Math.max(...heaps) - Math.min(...heaps);
  const tolerance = Math.max(256 * 1024, Math.round(heaps[0] * 0.02));
  const heapStatus =
    increases && growth > tolerance
      ? 'fail'
      : increases || spread > tolerance
        ? 'review'
        : 'pass';
  check('Post-GC heap after leave is stable', heapStatus, {
    cycles: '2–5',
    heaps,
    growthBytes: growth,
    spreadBytes: spread,
    strictlyIncreasing: increases,
    observationToleranceBytes: tolerance,
    note: '256 KiB or 2% allows snapshot/scheduler noise. Any monotonic growth requires review even below tolerance; exceeding it while monotonic fails. This is JS heap, not total browser or GPU memory.',
  });
  const duplicates = result.networkPhases.filter((phase) =>
    expectModel
      ? phase.completedModelRequests !== 1
      : phase.completedModelRequests > 1,
  );
  check(
    'One completed GLB request per model entry',
    duplicates.length ? 'fail' : 'pass',
    duplicates.length ? duplicates : result.networkPhases,
  );
  const repeatedModels = result.networkPhases
    .slice(1)
    .flatMap((phase) => phase.models);
  check(
    'Re-entry/reload cache behavior observed',
    repeatedModels.length && repeatedModels.every((model) => !model.cache)
      ? 'review'
      : 'pass',
    {
      requests: repeatedModels,
      note: 'Disk/memory-cache hits or HTTP 304 revalidation count as cache reuse. Full 200 transfers on every repeat require review of actual server headers. No cache hit is inferred from a repeated URL alone.',
    },
  );
  const memoryBefore = result.initial.rendererInfo?.memory;
  const memoryReloaded = result.reload.snapshot.rendererInfo?.memory;
  check(
    'Reload returns the same renderer allocation counts',
    memoryBefore && memoryReloaded
      ? JSON.stringify(memoryBefore) === JSON.stringify(memoryReloaded)
        ? 'pass'
        : 'review'
      : 'not-measured',
    { before: memoryBefore, reloaded: memoryReloaded },
  );
  const failedRequests = result.network.filter(
    (request) => request.failure && !request.cancelled,
  );
  check(
    'No unexpected failed network requests',
    failedRequests.length ? 'fail' : 'pass',
    failedRequests,
  );
  const allRenderers = result.initial.contexts
    .map((c) => c.renderer)
    .join(' | ');
  const softwareObserved = /swiftshader|llvmpipe|software/i.test(allRenderers);
  check(
    'Requested GPU backend matches observed renderer',
    !software && softwareObserved ? 'review' : 'pass',
    allRenderers,
  );
  check('not-measured');
  check(
    'Agreed laptop 45+ FPS target',
    !softwareObserved && result.name === 'desktop'
      ? result.frameSummary.p95Ms <= 1000 / 45
        ? 'pass'
        : 'fail'
      : 'not-measured',
    !softwareObserved && result.name === 'desktop'
      ? `Active-frame p95 ${result.frameSummary.p95Ms.toFixed(2)}ms on the reported GPU; browser scheduling proxy, not a GPU timer.`
      : 'SwiftShader measurements cannot certify the laptop target.',
  );
  return checks;
}

const browser = await chromium.launch({
  headless: !environment.headed,
  args: software
    ? ['--use-angle=swiftshader', '--enable-unsafe-swiftshader']
    : [],
});
try {
  const browserCdp = await browser.newBrowserCDPSession();
  const gpu = await browserCdp
    .send('SystemInfo.getInfo')
    .catch((error) => ({ unavailable: error.message }));
  environment.browser = browser.version();
  environment.gpu = gpu.gpu ?? gpu;
  const reports = [];
  for (const name of requestedViewports) {
    const context = await browser.newContext({
      viewport: sizes[name],
      deviceScaleFactor: dpr,
    });
    const page = await context.newPage();
    page.setDefaultTimeout(30000);
    await page.addInitScript(installInstrumentation);
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    const cdp = await context.newCDPSession(page);
    await cdp.send('Network.enable');
    await cdp.send('HeapProfiler.enable');
    const network = [],
      requests = new Map();
    let phase = 'landing';
    cdp.on('Network.requestWillBeSent', (event) => {
      const request = {
        id: event.requestId,
        phase,
        url: event.request.url,
        method: event.request.method,
      };
      network.push(request);
      requests.set(event.requestId, request);
    });
    cdp.on('Network.responseReceived', (event) => {
      const request = requests.get(event.requestId);
      if (!request) return;
      Object.assign(request, {
        status: event.response.status,
        mimeType: event.response.mimeType,
        fromDiskCache: !!event.response.fromDiskCache,
        fromServiceWorker: !!event.response.fromServiceWorker,
        headers: {
          contentEncoding:
            event.response.headers['content-encoding'] ??
            event.response.headers['Content-Encoding'] ??
            null,
          contentType:
            event.response.headers['content-type'] ??
            event.response.headers['Content-Type'] ??
            null,
          etag:
            event.response.headers.etag ?? event.response.headers.ETag ?? null,
          cacheControl:
            event.response.headers['cache-control'] ??
            event.response.headers['Cache-Control'] ??
            null,
        },
      });
    });
    cdp.on('Network.requestServedFromCache', (event) => {
      const request = requests.get(event.requestId);
      if (request) request.servedFromCache = true;
    });
    cdp.on('Network.responseReceivedExtraInfo', (event) => {
      const request = requests.get(event.requestId);
      if (request) request.networkStatus = event.statusCode;
    });
    cdp.on('Network.loadingFinished', (event) => {
      const request = requests.get(event.requestId);
      if (request)
        Object.assign(request, {
          completed: true,
          encodedTransferBytes: event.encodedDataLength,
        });
    });
    cdp.on('Network.loadingFailed', (event) => {
      const request = requests.get(event.requestId);
      if (request)
        Object.assign(request, {
          failure: event.errorText,
          cancelled: !!event.canceled,
        });
    });
    await page.goto(target.href, { waitUntil: 'networkidle' });
    const landingResources = await resourceEntries(page);
    const beforeWorld = await page.evaluate(() =>
      window.__worldProfile.snapshot(),
    );
    phase = 'first-world';
    const readiness = await chooseWorld(page);
    await page.waitForTimeout(1800);
    const initial = await page.evaluate(() => window.__worldProfile.snapshot());
    const firstWorldResources = await resourceEntries(page);
    await page.screenshot({
      path: resolve(output, `${name}-overview.png`),
      fullPage: true,
    });
    await page.evaluate(() => window.__worldProfile.start('settled-overview'));
    await page.waitForTimeout(800);
    for (const poi of ['Steel Mill', 'Downtown', 'River / Bridge']) {
      await page.evaluate((poi) => window.__worldProfile.phase(poi), poi);
      await page
        .getByRole('navigation', { name: 'Points of interest' })
        .getByRole('button', { name: new RegExp(poi) })
        .click();
      await page.waitForTimeout(1800);
    }
    const trace = await page.evaluate(() => window.__worldProfile.stop());
    await page
      .getByRole('navigation', { name: 'Points of interest' })
      .getByRole('button', { name: /Steel Mill/ })
      .click();
    await page
      .getByRole('button', { name: 'Blast Furnace', exact: true })
      .click();
    await page.waitForTimeout(1600);
    await page.screenshot({
      path: resolve(output, `${name}-selected.png`),
      fullPage: true,
    });
    const cycles = [],
      warmupCycles = [];
    for (let iteration = 1; iteration <= warmupCount + 5; iteration++) {
      const warming = iteration <= warmupCount;
      const cycle = warming ? iteration : iteration - warmupCount;
      await page.getByRole('button', { name: 'Choose era' }).click();
      await page.waitForTimeout(1200);
      await page
        .waitForFunction(
          (before) =>
            Object.entries(window.__worldProfile.snapshot().alive).every(
              ([kind, count]) => count <= before[kind],
            ),
          beforeWorld.alive,
          { timeout: 5000 },
        )
        .catch(() => undefined);
      const left = await page.evaluate(() => window.__worldProfile.snapshot());
      const leftHeap = await collectHeap(cdp);
      if (
        process.env.PROFILE_HEAP_SNAPSHOTS === '1' &&
        !warming &&
        [2, 5].includes(cycle)
      ) {
        await captureHeapSnapshot(
          cdp,
          resolve(output, `${name}-left-cycle-${cycle}.heapsnapshot`),
        );
      }
      phase = `${warming ? 'warmup' : 'reentry'}-${cycle}`;
      const enteredReadiness = await chooseWorld(page);
      await page.waitForTimeout(1600);
      await page.evaluate((phase) => window.__worldProfile.start(phase), phase);
      await page
        .getByRole('navigation', { name: 'Points of interest' })
        .getByRole('button', { name: /Steel Mill/ })
        .click();
      await page.waitForTimeout(1200);
      const cycleTrace = await page.evaluate(() =>
        window.__worldProfile.stop(),
      );
      const entered = await page.evaluate(() =>
        window.__worldProfile.snapshot(),
      );
      const enteredHeap = await collectHeap(cdp);
      (warming ? warmupCycles : cycles).push({
        cycle,
        iteration,
        left,
        leftHeap,
        entered,
        enteredHeap,
        readiness: enteredReadiness,
        frames: frameSummary(cycleTrace),
        trace: cycleTrace,
      });
    }
    const resources = await resourceEntries(page);
    phase = 'reload-landing';
    await page.reload({ waitUntil: 'networkidle' });
    const reloadLandingResources = await resourceEntries(page);
    phase = 'reload-world';
    const reloadReadiness = await chooseWorld(page);
    await page.waitForTimeout(1600);
    const reload = await page.evaluate(() => window.__worldProfile.snapshot());
    const reloadResources = await resourceEntries(page);
    const networkPhases = [
      'first-world',
      ...warmupCycles.map((c) => `warmup-${c.cycle}`),
      ...cycles.map((c) => `reentry-${c.cycle}`),
      'reload-world',
    ].map((phase) => {
      const models = network.filter(
        (request) =>
          request.phase === phase &&
          assetKind(new URL(request.url).pathname) === 'models',
      );
      return {
        phase,
        completedModelRequests: models.filter(
          (r) => r.completed && r.status >= 200 && r.status < 400,
        ).length,
        models: models.map((r) => ({
          url: r.url,
          status: r.status,
          networkStatus: r.networkStatus,
          cache:
            r.servedFromCache || r.fromDiskCache || r.networkStatus === 304,
          transferBytes: r.encodedTransferBytes,
          cancelled: r.cancelled ?? false,
        })),
      };
    });
    const result = {
      schemaVersion: 2,
      name,
      environment,
      viewport: sizes[name],
      beforeWorld,
      initial,
      readiness,
      firstUsefulMs: readiness.heroReadyMs,
      landingResources,
      landingTotals: resourceTotals(landingResources),
      firstWorldResources,
      firstWorldTotals: resourceTotals(firstWorldResources),
      resources,
      frameSummary: frameSummary(trace),
      trace,
      cycles,
      warmupCycles,
      reload: {
        readiness: reloadReadiness,
        snapshot: reload,
        landingResources: reloadLandingResources,
        resources: reloadResources,
      },
      network,
      networkPhases,
      errors,
    };
    result.checks = assess(result);
    await writeFile(
      resolve(output, `${name}.json`),
      JSON.stringify(result, null, 2) + '\n',
    );
    reports.push(result);
    console.log(
      name,
      JSON.stringify({
        readiness,
        frameSummary: result.frameSummary,
        checks: result.checks.map(({ name, status }) => ({ name, status })),
      }),
    );
    await context.close();
  }
  const rows = [];
  for (const report of reports) {
    let baseline;
    try {
      baseline = JSON.parse(
        await readFile(
          resolve(baselineDirectory, `${report.name}.json`),
          'utf8',
        ),
      );
    } catch {
      baseline = null;
    }
    const baselineRenderer =
      baseline?.initial?.contexts?.map((c) => c.renderer).join(' / ') ||
      baseline?.backend ||
      'unavailable';
    rows.push(
      `| ${report.name} | Baseline, ${baselineRenderer.replaceAll('|', '/')} | ${baseline?.firstUsefulMs ?? '—'} | ${baseline?.frameSummary?.p50Ms?.toFixed(2) ?? '—'} | ${baseline?.frameSummary?.p95Ms?.toFixed(2) ?? '—'} | ${baseline?.frameSummary?.peakDrawCalls ?? '—'} | ${baseline?.frameSummary?.peakTriangles ?? '—'} |`,
    );
    rows.push(
      `| ${report.name} | Current, ${report.initial.contexts
        .map((c) => c.renderer)
        .join(' / ')
        .replaceAll(
          '|',
          '/',
        )} | ${report.firstUsefulMs} | ${report.frameSummary.p50Ms?.toFixed(2) ?? '—'} | ${report.frameSummary.p95Ms?.toFixed(2) ?? '—'} | ${report.frameSummary.peakDrawCalls} | ${report.frameSummary.peakTriangles} |`,
    );
  }
  const checks = reports.flatMap((report) =>
    report.checks.map((check) => ({ ...check, viewport: report.name })),
  );
  const markdown = `# Performance measurement\n\nRecorded ${environment.timestamp}. Source ${environment.sourceRevision}; see each JSON for source status and exact environment. Production file hashes are in build-assets.json.\n\n| Viewport | Run / observed renderer | Hero readiness ms | Active frame p50 ms | Active frame p95 ms | Peak submitted draws | Peak submitted triangles |\n|---|---|---:|---:|---:|---:|---:|\n${rows.join('\n')}\n\nBaseline directory: ${baselineDirectory}. The checked-in default is historical Dummy v0 on SwiftShader. Confirm comparable scene, GPU, viewport, DPR and quality before interpreting any difference; hardware and software results are not an equivalent-device speedup comparison. Active RAF intervals are a scheduling proxy, not GPU timer-query duration.\n\n${checks.map((c) => `- **${c.status}** (${c.viewport}) ${c.name}`).join('\n')}\n\nRaw frame traces, per-cycle forced-GC heaps, resource/context generations, actual Three renderer.info, and HTTP/cache events are in the viewport JSON files.\n`;
  await writeFile(resolve(output, 'SUMMARY.md'), markdown);
  process.exitCode = checks.some((c) => c.status === 'fail')
    ? 1
    : checks.some((c) => c.status === 'review')
      ? 2
      : 0;
} finally {
  await browser.close();
}
