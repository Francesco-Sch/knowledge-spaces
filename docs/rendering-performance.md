# Rendering performance

> **Status:** Historical benchmark record and current profiling reference for the Konva renderer.
> **Origin:** The benchmark was created during [Issue #19: Rework dataset rendering for performance](https://github.com/Francesco-Sch/knowledge-spaces/issues/19).
> **Scope:** Keep measured results, profiling procedures, and current render-mode decisions available after the issue is closed.

This document records the Phase 0 profiling procedure, Phase 1 validation results, and the selected adaptive Konva rendering mode. The profiler UI is disabled by default so normal rendering is unchanged.

## Enable profiling

Start the frontend and open the plot with the `plotDebug` query parameter. The normal URL uses the selected adaptive mode: cached rendering at the initial scale, vector culling after the culling-entry threshold, and cached rendering again at the culling-exit threshold. Add `plotScenario` to label the exported session:

```text
http://localhost:8080/?plotDebug=1&plotScenario=panning
```

Use `plotHybrid=0` for the cache-only comparison baseline:

```text
http://localhost:8080/?plotDebug=1&plotHybrid=0&plotScenario=panning
```

The debug panel appears in the top-left corner. The **Save JSON** button downloads all 500 ms samples collected during the current session. Use a separate scenario value for each test, such as `initial`, `panning`, `wheel-zoom`, or `search-result`.

For repeatable recordings, use the Playwright suite instead of manually clicking **Save JSON**. It drives the same debug URLs, performs the reference interactions, and saves each download under a deterministic artifact path:

```bash
cd frontend
PLOT_TEST_WIDTH=2556 \
PLOT_TEST_HEIGHT=1296 \
PLOT_TEST_ARTIFACTS=/tmp/plot-profiles \
pnpm test:plot
```

The default automated matrix records `cache`, `hybrid`, and `cull` modes. Select a smaller matrix while investigating a change:

```bash
PLOT_TEST_PROFILE_MODES=hybrid \
PLOT_TEST_PROFILE_SCENARIOS=panning,wheel-zoom,hover-and-selection \
PLOT_TEST_ARTIFACTS=/tmp/plot-hybrid \
pnpm test:plot
```

The automated test remains agnostic about renderer behavior: the scenario action is shared by every mode, and the mode only changes the URL flags. See [Rendering test playbook](rendering-test-playbook.md) for the complete artifact layout and environment-variable reference.

## Compare the base-group cache

The selected default uses adaptive culling. Add `plotHybrid=0` to disable adaptive mode, then use `plotCache=0` to disable the cache for a vector-rendering comparison:

```text
http://localhost:8080/?plotDebug=1&plotHybrid=0&plotCache=0&plotScenario=panning
```

Run the same scenario with `plotHybrid=0` and with `plotHybrid=0&plotCache=0`. Keep the browser, viewport, dataset, interaction duration, and warm-up procedure the same. Compare frame time, input latency, heap usage, and visual correctness after resizing. The cache toggle remains available as a baseline while adaptive culling is evaluated.

## Compare viewport culling

Viewport culling is an experimental mode. Enable it with `plotCull=1` and disable the base-group cache for a valid comparison:

```text
http://localhost:8080/?plotDebug=1&plotHybrid=0&plotScenario=panning&plotCache=0&plotCull=1
```

Culling converts the screen viewport into world-space bounds and renders only base points that can be visible, with a small margin for the cross stroke. The full base group is not mounted in this mode, so its bitmap cannot become stale as points enter and leave the viewport. The cache-only baseline remains available with `plotHybrid=0`.

Profiler filenames include `cache-enabled|disabled|hybrid` and `cull-enabled|disabled|hybrid` so the exported runs can be compared safely.

## Test adaptive cache and culling

The adaptive mode is enabled by default and can be selected explicitly with `plotHybrid=1`:

```text
http://localhost:8080/?plotDebug=1&plotHybrid=1&plotScenario=wheel-zoom
```

Adaptive mode enters vector culling at scale `1.1` or higher and switches to cached rendering at scale `1.0` or lower. The gap prevents rapid mode switching around the threshold. Mode transitions are delayed until `180 ms` after the last zoom transform so continuous scrolling is not interrupted. Wheel zoom also synchronizes the Konva transform with `stageConfig` so the Svelte binding does not restore a stale scale during redraws. Use `plotHybrid=0` for a cache-only baseline. Forced culling remains available with `plotHybrid=0&plotCache=0&plotCull=1`.

At the initial scale of `1.0`, the renderer starts in cached mode. When adaptive mode first enters culling, the full base group is not mounted. This avoids retaining a hidden duplicate scene of all 11,314 points during normal interaction. After the first cache build, the base group is retained hidden and non-listening so later transitions reuse the existing cache instead of rebuilding the scene.

## Metrics

| Metric          | Meaning                                                                                         |
| --------------- | ----------------------------------------------------------------------------------------------- |
| FPS             | Number of animation frames observed during the latest 500 ms interval.                          |
| Frame avg / p95 | Average and 95th-percentile frame duration in milliseconds. Lower is better.                    |
| Input avg / p95 | Approximate time from a pointer or wheel event until the next animation frame. Lower is better. |
| Pointer / Wheel | Pointer-move and wheel events observed during the latest interval.                              |
| Blobs           | Number of blob-generation calls and their accumulated duration during the latest interval.      |
| Konva nodes     | Current number of nodes returned by the stage's Konva tree search.                              |
| Heap            | JavaScript heap usage when the browser exposes `performance.memory`.                            |

The profiler samples every 500 ms. Let each interaction run for several seconds and save the JSON after the interaction reaches a steady state. The JSON metadata includes the browser, URL, viewport, device-pixel ratio, scenario, and capture timestamps.

## Reference scenarios

Run the scenarios with the complete 20 Newsgroups dataset and record the browser, viewport size, device, and approximate dataset point count.

1. **Initial view**
   - Reload without an active search.
   - Record FPS, frame time, Konva node count, and heap usage after the initial render settles.
2. **Panning**
   - Drag the canvas continuously for 5–10 seconds.
   - Record the lowest sustained FPS and the highest representative frame p95.
3. **Wheel zoom**
   - Zoom in and out around the center and near a point.
   - Record input latency and frame time.
4. **Pointer movement**
   - Move the pointer continuously across the dataset at normal speed.
   - Record pointer-event volume, input latency, and frame time.
5. **Search result**
   - Run a search and allow the result to settle.
   - Record blob count/time, node count, and a screenshot of the result.
6. **Hover and selection**
   - Hover over several points, including search-result points.
   - Select a point and record the card state.
7. **Card near viewport edges**
   - Select points near the top, bottom, left, and right edges.
   - Capture screenshots to document the current card placement.
8. **Zoom limits**
   - Repeat panning, pointer movement, and selection at the minimum, normal, and maximum zoom levels.

## Baseline record

Complete this table for at least one representative laptop before changing the renderer.

| Environment                  | Value |
| ---------------------------- | ----- |
| Browser and version          |       |
| Operating system             |       |
| Device                       |       |
| Viewport                     |       |
| Dataset point count          |       |
| Active searches              |       |
| Initial-view FPS / frame p95 |       |
| Pan FPS / frame p95          |       |
| Wheel input p95              |       |
| Pointer input p95            |       |
| Search blob time             |       |
| Initial Konva node count     |       |
| Search Konva node count      |       |
| Heap usage                   |       |

Store downloaded JSON files and screenshots outside generated build directories. Name screenshots by scenario, for example `baseline-search-result.png` and `baseline-card-right-edge.png`. Keep the matching JSON filename with each screenshot when possible.

## Run 02 findings

The second test run is stored locally in:

```text
Documents/knowledge-spaces-test-runs/run-02
```

The run was captured after the profiler timing and Konva-node-count fixes in commit `97293b9`.

### Environment

- Browser: Chrome 151
- Viewport: `2556 × 1296`
- Device pixel ratio: `1`
- Dataset: 20 Newsgroups
- Dataset point count: `11,314`

Run 02 is not a strict performance comparison with Run 01 because Run 01 used Firefox 153 at a different viewport size.

### Rendering and interaction results

The values below use the median of the recorded 500 ms intervals after discarding the first three warm-up samples. The frame p95 and input p95 columns show the median interval value followed by the worst interval value.

| Scenario            | Median FPS |       Frame p95 |     Input p95 | Worst average frame |
| ------------------- | ---------: | --------------: | ------------: | ------------------: |
| Initial view        |       60.0 |  17.2 / 17.9 ms |  0.0 / 0.3 ms |             16.7 ms |
| Panning             |       60.0 |  17.3 / 18.7 ms | 0.0 / 13.9 ms |             19.2 ms |
| Pointer movement    |       60.0 |  17.4 / 18.6 ms |  0.0 / 0.4 ms |             17.3 ms |
| Wheel zoom          |       60.0 |  27.4 / 33.7 ms |  0.3 / 0.9 ms |             17.3 ms |
| Minimum zoom        |       60.0 |  17.4 / 31.4 ms | 0.2 / 14.5 ms |             17.3 ms |
| Maximum zoom        |       60.0 |  17.4 / 29.4 ms | 0.2 / 13.7 ms |             19.6 ms |
| Hover and selection |       60.0 | 17.4 / 347.2 ms | 0.1 / 16.1 ms |             82.3 ms |
| Search results      |       60.0 |  17.1 / 18.8 ms |  0.0 / 0.7 ms |            259.2 ms |

The median results are close to 60 FPS, but the long-frame outliers during hover/selection and search rendering remain relevant to perceived responsiveness.

### Konva node counts

The initial scene reports `11,318` Konva nodes. Search states report `11,336`, `11,354`, and `11,359` nodes. This confirms that searches add separate blobs, connection lines, labels, and duplicate result crosses to the existing base scene.

During hover and selection, one interval recorded:

- `11,359` Konva nodes;
- `10` blob-generation calls;
- `4.7 ms` accumulated blob-generation time;
- `347.2 ms` frame p95.

This supports moving blob generation outside the neighbor loop before investigating a different renderer.

### Memory caveat

Chrome reported approximately `152 MB` during the initial view and between `882 MB` and `1,050 MB` in later search, hover, and zoom sessions. These values should not be treated as an isolated memory baseline because searches are persisted in `localStorage` and the scenarios may have been run in the same browser session. Repeat memory measurements in a fresh browser context or after clearing persisted searches.

### Visual observations

The Run 02 screenshots show that:

- zoomed-out views are visually dense and difficult to target;
- zoomed-in crosses become large;
- search blobs and connections remain visually prominent;
- the dataset-entry card is readable when there is room;
- the card remains attached to the transformed Konva stage and can occupy a large part of the viewport at high zoom.

## Run 03 findings: base-group cache comparison

Run 03 compared the base-group cache with `plotCache=0` (disabled) and `plotCache=1` (enabled).

### Environment

- Browser: Chrome 151
- Viewport: `2556 × 1296` for all scenarios except disabled wheel zoom (`2001 × 1296`)
- Device pixel ratio: `1`
- Dataset: 20 Newsgroups
- Dataset point count: `11,314`

The values below use the median of the recorded 500 ms intervals after discarding the first three warm-up samples. The frame p95 column shows the median interval value followed by the worst interval value.

| Scenario            | Cache disabled FPS | Cache enabled FPS | Disabled frame p95 | Enabled frame p95 |
| ------------------- | -----------------: | ----------------: | -----------------: | ----------------: |
| Initial view        |               60.0 |              60.0 |     17.4 / 17.8 ms |    17.3 / 17.8 ms |
| Panning             |               24.6 |              60.0 |     52.2 / 98.2 ms |    17.4 / 18.5 ms |
| Pointer movement    |               29.7 |              60.0 |    83.8 / 110.8 ms |    17.5 / 17.8 ms |
| Wheel zoom          |               25.2 |              60.0 |  108.3 / 2240.7 ms |    27.6 / 33.5 ms |
| Search results      |               60.0 |              60.0 |     17.0 / 96.3 ms |    17.1 / 17.8 ms |
| Hover and selection |               45.3 |              60.0 |    78.3 / 109.6 ms |    17.4 / 17.8 ms |
| Minimum zoom        |               44.5 |              60.0 |    50.2 / 154.1 ms |    17.4 / 27.2 ms |
| Maximum zoom        |               42.0 |              60.0 |    74.6 / 153.6 ms |    17.6 / 34.6 ms |

The disabled wheel-zoom run used a narrower viewport, so that comparison is directional rather than strict. Search-result node counts also differed because the two sessions had different persisted search states.

### Findings

- The cache provides a major interaction benefit for this laptop and dataset. Panning, pointer movement, zooming, and hover/selection were substantially smoother with caching enabled.
- Initial rendering and search-result median FPS were similar, but the cache reduced long-frame outliers.
- The cache does not reduce the Konva node count; it primarily reduces the cost of drawing the base group.
- Cached crosses become visibly pixelated when zoomed in. The uncached vector crosses preserve the preferred visual quality.
- The cache should remain enabled by default for now because the interaction-performance improvement is decisive.
- The `plotCache=0` toggle should remain available while an adaptive or higher-quality caching strategy is investigated.

## Run 05 findings: adaptive cache and culling

Run 05 tested `plotHybrid=1` with the cache/culling thresholds at scale `2` and `1.25`.

### Environment

- Browser: Chrome 151
- Viewport: `2556 × 1296`
- Device pixel ratio: `1`
- Dataset: 20 Newsgroups
- Dataset point count: `11,314`

The values below use the median of the recorded 500 ms intervals after discarding the first three warm-up samples. The frame p95 column shows the median interval value followed by the worst interval value.

| Scenario            | Median FPS | Frame p95       | Input p95     | Median heap |
| ------------------- | ---------: | --------------- | ------------- | ----------: |
| Initial view        |       60.0 | 17.2 / 75.6 ms  | 0.0 / 0.2 ms  |    171.2 MB |
| Panning             |       57.4 | 27.7 / 204.6 ms | 0.1 / 36.3 ms |    492.8 MB |
| Pointer movement    |       40.1 | 71.5 / 95.4 ms  | 0.2 / 23.7 ms |    701.6 MB |
| Wheel zoom          |       58.4 | 27.8 / 240.7 ms | 0.3 / 45.7 ms |    587.1 MB |
| Search results      |       60.0 | 17.0 / 80.1 ms  | 0.0 / 7.2 ms  |    158.4 MB |
| Hover and selection |       45.4 | 73.3 / 145.8 ms | 0.2 / 46.2 ms |    184.5 MB |
| Window resizing     |       60.0 | 17.5 / 500.7 ms | 0.0 / 50.2 ms |    184.3 MB |
| Minimum zoom        |       48.2 | 47.4 / 134.0 ms | 0.1 / 34.7 ms |    186.4 MB |
| Maximum zoom        |       60.0 | 17.5 / 76.5 ms  | 0.2 / 17.2 ms |    259.2 MB |

### Findings

- Hybrid mode keeps panning and wheel zoom close to cached performance while retaining vector rendering at high zoom.
- The hidden cached base group remains part of the Konva scene. This avoids rebuilding 11,318 base nodes during transitions but increases memory and scene traversal costs.
- Pointer movement and hover/selection remain substantially slower than the cache-only Run 03 results.
- Heap usage rises sharply during pointer movement, wheel zoom, and panning, reaching `701.6 MB` median during pointer movement.
- Window resizing still contains a long-frame outlier, consistent with rebuilding the cache after dimensions change.
- The hybrid mode is promising for zoom quality and basic navigation, but it should not yet replace the cache-only default without addressing the duplicated scene memory and interaction overhead.

### Phase 1 handoff

The next agent should begin with the low-risk Konva optimizations from the migration plan:

1. Compute `generateBlobPointsForSearch(search)` once per search.
2. Render one blob outside the neighbor loop.
3. Compute each connection's bowed midpoint once rather than once per coordinate.
4. Set `listening: false` on visual-only lines, labels, tags, and other non-interactive nodes.
5. Replace the `{#key mappedSearches}` remount with stable keyed updates.
6. Rerun the Run 02 scenarios with the profiler after these changes.

The comparison should focus on:

- the worst average frame during search-result creation;
- the hover/selection frame p95 outlier;
- node counts before and after removing duplicate result crosses;
- blob-generation call count and accumulated time.

Do not move to nearest-point interaction or a custom Canvas 2D renderer until these changes have been measured. The existing profiler can be enabled with `?plotDebug=1&plotScenario=<name>`, and the **Save JSON** button exports the samples for comparison.

## Run 06 findings: automated rendering-mode comparison

Run 06 used the automated Playwright profiler matrix and replaced the manual JSON-download step. It recorded all nine reference scenarios in cache-only, adaptive hybrid, and forced-culling modes.

### Environment

- Browser: Headless Chrome 151
- Viewport: `2556 × 1296`
- Device pixel ratio: `1`
- Dataset: 20 Newsgroups
- Dataset point count: `11,314`
- Artifacts: `/tmp/plot-run-06`
- Recordings: `27`

The values below use the median of the recorded 500 ms intervals after discarding the first three warm-up samples. Each frame p95 value is the median interval value; the raw JSON files also contain the worst interval.

| Scenario            | Cache-only FPS / frame p95 | Adaptive hybrid FPS / frame p95 | Forced culling FPS / frame p95 |
| ------------------- | -------------------------: | ------------------------------: | -----------------------------: |
| Initial view        |             60.0 / 17.2 ms |                  60.0 / 17.1 ms |                 60.0 / 17.1 ms |
| Panning             |             40.5 / 47.8 ms |                  38.4 / 48.0 ms |                 44.8 / 43.6 ms |
| Wheel zoom          |             23.2 / 90.2 ms |                  36.7 / 78.2 ms |                 45.5 / 58.1 ms |
| Pointer movement    |             35.8 / 98.1 ms |                 34.4 / 103.2 ms |                 48.7 / 59.6 ms |
| Search results      |             60.0 / 17.0 ms |                  60.0 / 17.3 ms |                 60.0 / 17.0 ms |
| Hover and selection |             14.7 / 86.5 ms |                  14.6 / 89.4 ms |                 60.0 / 19.8 ms |
| Window resizing     |             55.6 / 18.6 ms |                  60.0 / 20.6 ms |                 59.9 / 17.3 ms |
| Minimum zoom        |             38.8 / 46.4 ms |                 27.7 / 124.2 ms |                 27.5 / 98.5 ms |
| Maximum zoom        |             31.7 / 87.5 ms |                  48.0 / 63.4 ms |                 56.6 / 33.7 ms |

### Findings

- Forced culling was the strongest interaction mode in this run. It led panning, wheel zoom, pointer movement, hover/selection, and maximum zoom.
- Adaptive hybrid improved maximum zoom over cache-only rendering, but did not consistently beat forced culling while the hidden base group remained mounted.
- Minimum zoom was the main culling regression. At the smallest scale, culling approached the full dataset and reached approximately `20,200` median nodes and `305 MB` median heap in the forced-culling recording.
- Initial rendering and search-result settling were close to 60 FPS in all modes.
- Search blob generation was recorded once per search at approximately `5–6 ms`. The automated search fixture is intentionally deterministic and contains one small search overlay, so its blob and overlay costs should not be treated as a multi-search production workload.
- The screenshot and correctness assertions retained the search blob, connections, label, highlighted crosses, hover behavior, and resize behavior.

The cache-only and adaptive recordings should primarily be compared within the same matrix run. Absolute FPS varied between Run 06 and subsequent runs because each complete headless matrix took several minutes and system/browser state affected the measurements.

## Run 07 findings: adaptive culling without the hidden base group

Run 07 applied the selected strategy and removed the full base group from the scene while culling was active. The Run 07 recording used the then-current thresholds:

- enter culling at scale `0.8` or higher;
- leave culling for cached rendering at scale `0.7` or lower;
- delay adaptive mode changes by `180 ms` after the last transform.

The current Phase 1 implementation supersedes those thresholds with `1.1` for culling entry and `1.0` for culling exit.

The same `2556 × 1296` automated matrix passed all `34` tests and generated `27` recordings. Visual screenshots continued to pass, including the forced-culling search overlay check.

### Hidden-group result

Before this change, initial forced-culling recordings reported approximately `13,927` Konva nodes and `198 MB` median heap because the hidden 11,314-point base group remained mounted alongside the visible culling group. After the change, initial culling reported approximately `2,612` nodes and `44 MB` median heap. The same reduction appeared during panning and pointer movement.

The full base group is initially mounted only for cached or uncached full-scene vector rendering. After the first adaptive transition into very-low zoom, it remains mounted but hidden and non-listening during later culling periods. This keeps normal culling lightweight before the first cache build while avoiding repeated scene reconstruction afterward.

### Decision

Adopt the adaptive strategy as the normal rendering mode:

1. The normal URL starts in cached rendering at scale `1.0`.
2. Vector culling begins at scale `1.1` and returns to cached rendering at scale `1.0` or lower.
3. `plotHybrid=0` remains the explicit cache-only baseline for performance comparisons.
4. `plotHybrid=0&plotCache=0&plotCull=1` remains the forced-culling diagnostic mode.
5. The hidden base group is not mounted during initial culling; after the first cache build it is retained hidden and non-listening to prevent repeated transition churn.
6. Minimum-zoom transition cost, cache reuse, and future multi-search workloads remain follow-up measurements.

## Adaptive wheel-zoom follow-up

The manual recording `plot-profile-wheel-zoom-cache-hybrid-cull-hybrid-2026-08-17T10-39-19-348Z.json` exposed repeated transition churn in adaptive mode at the representative `2556 × 1296` viewport.

- The session ended in `cached` mode after repeated adaptive zoom transitions.
- Heap usage grew from approximately `270 MB` to `930 MB`.
- The worst frame p95 reached `1,074 ms`.
- The worst input p95 reached `90.3 ms`.
- Konva node counts repeatedly moved between approximately `850` and `11,361`.
- Blob generation was not the cause; the initial three search overlays were generated once in approximately `6 ms`.

The node-count oscillation and heap growth indicate that repeatedly mounting, caching, and destroying the full base group creates substantial allocation and garbage-collection pressure. The renderer now creates the base group on the first low-zoom transition and retains it hidden and non-listening during later culling periods. This preserves the selected adaptive behavior while reusing the cache instead of reconstructing 11,319 point nodes on every threshold crossing.

The finishing Playwright run added direct mode assertions and passed all `26` tests at `2556 × 1296`. Its adaptive wheel-zoom recording had a median frame p95 of `37.2 ms`, a worst frame p95 of `51.8 ms`, and a maximum observed heap of approximately `116 MB`, without the repeated 11,319-node rebuild pattern.

## Phase 2 nearest-point interaction validation

The Phase 2 interaction matrix was run after replacing per-point Konva listeners with the uniform-grid stage controller.

### Environment

- Browser: Headless Chrome 151
- Viewport: `1280 × 800`
- Device pixel ratio: `1`
- Dataset: 20 Newsgroups
- Dataset point count: `11,314`
- Modes: cache-only, adaptive hybrid, and forced culling
- Scenarios: pointer movement, hover and selection, minimum zoom, and maximum zoom
- Artifacts: `/tmp/knowledge-spaces-phase2-profiles`

The values below are median samples after discarding the first three warm-up samples. This is a focused Phase 2 validation run at a different viewport from Runs 06 and 07, so it should not be treated as a direct absolute comparison with those runs.

| Scenario            | Cache-only FPS / frame p95 | Adaptive hybrid FPS / frame p95 | Forced culling FPS / frame p95 |
| ------------------- | -------------------------: | ------------------------------: | -----------------------------: |
| Pointer movement    |             60.0 / 18.0 ms |                  60.0 / 17.8 ms |                 60.0 / 18.1 ms |
| Hover and selection |             60.0 / 17.5 ms |                  60.0 / 17.2 ms |                 60.0 / 18.1 ms |
| Minimum zoom        |             60.0 / 17.6 ms |                  60.0 / 17.3 ms |                 57.9 / 54.1 ms |
| Maximum zoom        |             60.0 / 17.8 ms |                  60.0 / 17.6 ms |                 60.0 / 18.6 ms |

### Findings

- All 23 focused Playwright tests passed, including the existing visual and render-mode checks.
- Point nodes and dataset groups no longer participate in Konva hit testing.
- Stage-level selection opened the existing dataset card using the nearest indexed point.
- The historical low-zoom validation used a two-step interaction: the first click moved the stage to scale `1.0`, and
  the next click selected successfully. Current low-zoom selection no longer changes the zoom on click.
- Pointer movement and hover/selection remained at approximately 60 FPS in all three modes during this run.
- Forced culling still shows a minimum-zoom transition cost, which is a rendering-mode concern rather than a nearest-point lookup regression.
- The focused index suite passed all five cases with `pnpm test:plot-index`.

## Phase 3 duplicate-cross validation

Phase 3 now recolors the existing base point nodes by stable point ID instead of rendering a second cross for each search neighbor.

The focused rendering run passed all 11 tests with:

```bash
PLOT_TEST_PROFILES=0 pnpm test:plot
```

The run verifies that seeded search neighbors have exactly one point glyph with the search color in cached mode. Existing search overlay, adaptive-culling, forced-culling, hover, selection, and resize checks also remain passing.
