# Issue #19 rendering benchmark

This document records the Phase 0 profiling procedure for the current Konva renderer. The profiler is disabled by default so normal rendering is unchanged.

## Enable profiling

Start the frontend and open the plot with the `plotDebug` query parameter. Add `plotScenario` to label the exported session:

```text
http://localhost:8080/?plotDebug=1&plotScenario=panning
```

The debug panel appears in the top-left corner. The **Save JSON** button downloads all 500 ms samples collected during the current session. Use a separate scenario value for each test, such as `initial`, `panning`, `wheel-zoom`, or `search-result`.

## Compare the base-group cache

The base point group cache is enabled by default. Add `plotCache=0` to disable it for a comparison run:

```text
http://localhost:8080/?plotDebug=1&plotScenario=panning&plotCache=0
```

Run the same scenario once with the default URL and once with `plotCache=0`. Keep the browser, viewport, dataset, interaction duration, and warm-up procedure the same. Compare frame time, input latency, heap usage, and visual correctness after resizing. The cache toggle is temporary and should remain available until the comparison is complete.

## Compare viewport culling

Viewport culling is an experimental mode. Enable it with `plotCull=1` and disable the base-group cache for a valid comparison:

```text
http://localhost:8080/?plotDebug=1&plotScenario=panning&plotCache=0&plotCull=1
```

Culling converts the screen viewport into world-space bounds and renders only base points that can be visible, with a small margin for the cross stroke. The current one-time base-group cache is bypassed in this mode because its bitmap would otherwise become stale as points enter and leave the viewport.

Profiler filenames include both `cache-enabled|disabled` and `cull-enabled|disabled` so the exported runs can be compared safely.

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
