# Issue #19 rendering benchmark

This document records the Phase 0 profiling procedure for the current Konva renderer. The profiler is disabled by default so normal rendering is unchanged.

## Enable profiling

Start the frontend and open the plot with the `plotDebug` query parameter:

```text
http://localhost:5173/?plotDebug=1
```

The debug panel appears in the top-left corner. It is non-interactive and does not intercept pointer events.

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

The profiler samples every 500 ms. Let each interaction run for several seconds and record a representative steady-state interval rather than a single panel update.

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

Store screenshots outside generated build directories and name them by scenario, for example `baseline-search-result.png` and `baseline-card-right-edge.png`.
