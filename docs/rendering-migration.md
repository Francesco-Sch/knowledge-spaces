# Rendering migration

> **Status:** Phase 4 HTML dataset-card migration is complete and its exit validation has been recorded.
> **Origin:** This roadmap originated from [Issue #19: Rework dataset rendering for performance](https://github.com/Francesco-Sch/knowledge-spaces/issues/19).
> **Scope:** This document records the rendering architecture, completed decisions, and follow-up migration work for the repository.

The migration is intentionally incremental. We should not replace Konva with a new renderer before measuring the current bottlenecks and validating the visual output.
The historical v1.0.1 implementation is documented in [Dataset rendering on canvas using Konva](1.0.1/dataset-rendering-on-canvas-using-konva.md).
The current Phase 1 and Phase 2 implementation is composed from `frontend/src/lib/plot/Plot.svelte`, `plot-data.ts`, `plot-behaviour.ts`, `point-spatial-index.ts`, and the components in `frontend/src/lib/plot/ui/`.

## Goals

- Preserve the current visuals exactly:
  - diagonal crosses;
  - point sizes and stroke widths;
  - colors and search-result highlighting;
  - dashed curved connections;
  - concave search blobs;
  - search labels;
  - stage pan and zoom behavior.
- Make laptop interaction responsive during panning, zooming, pointer movement, and selection.
- Select the nearest point under the pointer instead of maintaining one event target per point.
- Support future datasets that are significantly larger than the current 11,314 points.
- Keep the dataset-entry card attached to its selected canvas point.
- Keep card text selectable where practical.
- Support modern desktop browsers and mobile browsers. Old browsers are ignored for now.
- Keep any new dependency's runtime and bundle overhead reasonable.
- Explore worker-based rendering without committing to it before it demonstrates a measurable benefit.

## Non-goals

- Redesigning the visual language.
- Removing the current search blobs, connections, labels, or cross appearance.
- Introducing a different interaction metaphor such as lasso selection unless it is useful as an optional future feature.
- Optimizing the backend semantic-search algorithm as part of the first rendering migration.
- Making the canvas itself fully accessible through individually focusable DOM elements.

## Proposed architecture

The preferred target architecture is a small number of rendering surfaces rather than one Svelte/Konva component per point.

### Data model

Introduce a stable point model that carries identity explicitly:

```ts
type Point = {
  id: number;
  x: number;
  y: number;
};
```

Search state should refer to point IDs rather than relying on equality between floating-point mapped coordinates.

Each point should be able to derive:

- its original dataset coordinates;
- its current world/canvas coordinates;
- whether it belongs to one or more searches;
- its effective display color;
- its current interaction state.

### Rendering surfaces

The target should use separate visual responsibilities:

1. **Base point surface**

   - Draw all dataset crosses.
   - Recolor or highlight points that belong to searches.
   - Do not draw duplicate search-result crosses.

2. **Search overlay surface**

   - Draw each search blob once.
   - Draw each connection line once.
   - Draw search labels.
   - Disable interaction processing for purely visual elements.

3. **Interaction overlay**

   - Draw only the currently hovered or selected cross if a visual overlay is needed.
   - Maintain the exact current hover appearance without mutating thousands of point objects.

4. **HTML card overlay**
   - Render the dataset-entry card as selectable HTML text.
   - Position it from the selected point's transformed screen coordinates.
   - Update its position when pan or zoom changes so it remains attached to the canvas point.

The first implementation may use Canvas 2D directly or a consolidated custom Konva shape. The visual output, not the renderer brand, is the invariant.

## Migration phases

## Phase 0: Capture behavior and establish benchmarks

Before changing the rendering implementation:

1. Record the current behavior with the full 11,314-point dataset.
2. Test on representative laptops where the application feels unresponsive.
3. Capture:
   - frame rate during panning;
   - frame rate during wheel zoom;
   - pointer movement latency;
   - time spent in scripting and painting;
   - memory usage;
   - number of Konva nodes;
   - time spent generating search blobs;
   - behavior at minimum, normal, and maximum zoom.
4. Capture screenshots or image snapshots of:
   - the initial view;
   - a search result;
   - hovered points;
   - selected points;
   - the dataset-entry card;
   - the card near each viewport edge.
5. Add a small profiling/debug mode rather than relying only on subjective smoothness.

### Exit criteria

- A repeatable baseline exists on at least one representative laptop.
- The visual reference states are recorded.
- We can compare old and new renderers using the same data and interactions.

## Phase 1: Correctness and low-risk Konva improvements

Apply improvements that do not change the renderer or visual output:

1. Compute `generateBlobPointsForSearch(search)` once per search.
2. Render one blob per search, outside the neighbor loop.
3. Memoize the bowed connection points instead of calling `computeBow` repeatedly.
4. Set `listening: false` on lines, blobs, labels, and other visual-only nodes.
5. Replace `{#key mappedSearches}` with stable keyed updates.
6. Remove redundant reactive recalculation of mapped searches.
7. Carry point IDs explicitly rather than finding them through mapped-coordinate equality.
8. Remove or measure the large base-group cache before keeping it enabled.
9. Cull points that cannot be visible in the current world-space viewport where this does not change the visual result.
10. Replace hover shadows on individual points with one highlighted-point overlay if the appearance remains pixel-equivalent.

### Exit criteria

- Visual reference states remain unchanged.
- Search blob geometry is calculated once per search.
- The number of interactive Konva nodes is reduced or clearly measured.
- The benchmark shows whether these changes are sufficient by themselves.

### Phase 1 rendering decision

The automated comparison selected an adaptive culling strategy for the current Konva renderer. The authoritative values are defined in `frontend/src/lib/plot/plot-behaviour.ts`:

- Start in cached rendering at the initial scale of `1.0`.
- Enter vector viewport culling at scale `1.1` or higher.
- Leave culling for cached rendering at scale `1.0` or lower.
- Delay adaptive mode changes by `180 ms` after the last transform.
- Keep `plotHybrid=0` as the cache-only comparison baseline.
- Keep `plotHybrid=0&plotCache=0&plotCull=1` as the forced-culling diagnostic mode.
- Do not mount the full base group during the initial culling period; after the first cache build, retain it hidden and non-listening so repeated transitions reuse the cache.

The earlier Run 06 and Run 07 recordings used the then-current `0.8 / 0.7` thresholds. The later Phase 1 follow-up changed those values to `1.1 / 1.0` to switch to culling later. The visual screenshots and search overlays remained intact. Minimum-zoom transition cost and larger multi-search workloads remain follow-up measurements.

## Phase 2: Introduce nearest-point interaction

Replace per-point Konva event listeners with one pointer interaction controller.

### Spatial lookup

Build a spatial index suitable for the expected point count. A uniform grid is a good initial choice because:

- points are two-dimensional;
- the interaction radius is small;
- the view has a known transform;
- rebuilding it when a dataset changes is straightforward.

A more general spatial index can be introduced if future datasets require it.

The Phase 2 implementation uses `frontend/src/lib/plot/point-spatial-index.ts`. The index is rebuilt when mapped dataset coordinates change and is reused across stage pan and zoom operations.

### Pointer behavior

On pointer movement:

1. Convert the pointer from screen coordinates to world coordinates using the inverse stage transform.
2. Query nearby grid cells.
3. Find the nearest point within a screen-space tolerance.
4. Update the single hovered point.
5. Update the cursor and highlight overlay.

The interaction radius is defined in CSS pixels rather than world units so it remains usable at every zoom level. The current effective hit area is `16px`.

### Minimum interactive zoom

Introduce a configurable minimum interaction scale.

When the user attempts to select while the current scale is below the interaction threshold:

1. Keep the pointer's world position fixed.
2. Zoom the stage to the minimum interactive scale around that position.
3. Re-run nearest-point selection.
4. Allow the next click to select the nearest point.

The implementation uses `MIN_INTERACTION_SCALE = 0.8` and a `16px` CSS hit radius. The first click below the interaction threshold zooms around the pointer without selecting a point; the next click performs the selection. This avoids selecting an ambiguous nearby point at the minimum stage scale.

### Phase 2 implementation notes

- `Plot.svelte` owns stage-level mouse and touch interaction instead of individual point events.
- The uniform grid indexes all mapped dataset points, while viewport culling remains responsible only for drawing.
- Base and search-result crosses are visual-only with `listening: false`; duplicate search crosses remain temporarily for Phase 3.
- The single hover highlight is rendered in its own Konva layer.
- Search point colors are resolved by point ID using the topmost search overlay color.
- The existing Konva dataset card remains unchanged apart from touch event propagation; moving it to HTML remains Phase 4 work.

### Exit criteria

- The nearest visible point can be selected reliably.
- Point targeting remains usable when zoomed out.
- No per-point pointer listener is required.
- Pointer movement does not cause broad scene redraws.

The Phase 2 Playwright validation covers stage-level selection, non-listening point nodes, low-zoom two-step selection, cached rendering, adaptive culling, forced culling, resizing, search overlays, and hover performance. The focused spatial-index suite is available as `pnpm test:plot-index` from `frontend/`.

## Phase 3: Recolor search points instead of duplicating them

Search neighbors should refer to existing base point IDs.

For each point, derive a display state such as:

- base point;
- member of one search;
- member of multiple searches;
- hovered;
- selected.

The renderer should preserve the current colors and layering rules. If a point belongs to multiple searches, define a deterministic precedence or compositing rule before implementation.

Search connections and blobs should continue to be drawn exactly as they are now, but the duplicated search `Cross` nodes should be removed.

### Exit criteria

- Search results are visibly highlighted in place.
- No duplicate point glyphs are created for search neighbors.
- Search connections still terminate at the same point coordinates.
- Search labels and blobs remain visually unchanged.

### Phase 3 implementation notes

- `DatasetPoints.svelte` resolves each base point color by its stable point ID in both cached and culled rendering modes.
- `Search.svelte` retains blobs, connections, and labels but no longer creates duplicate neighbor crosses.
- When a point belongs to multiple searches, the latest rendered search determines its color.
- Base-group caches are invalidated when search display colors change so cached points do not remain stale.
- The focused Playwright rendering suite verifies recoloring and duplicate suppression in cached mode, as well as the existing overlay and culling behavior.

## Phase 4: Move the dataset-entry card into HTML

Keep the card logically attached to a world-space point, but render its text in an HTML overlay.

### Code standards

`Plot.svelte` separates data, behavior, and UI responsibilities. Keep the HTML card component well structured as it grows;
do not split it into additional components unless a later change makes that necessary.

### Positioning

1. Store the selected point ID and its world coordinates.
2. Convert the point to screen coordinates using the current pan and zoom transform.
3. Position the card relative to that screen coordinate.
4. Recalculate its position whenever the view changes.
5. Keep a small offset from the point, matching the current visual placement.
6. Use viewport-aware placement to choose the best side when the preferred position would leave the viewport.
7. Make the card responsive to stage zoom. Preserve its current dimensions and scale it with the stage between a
   minimum scale of `0.6` and a maximum scale of `1.7`. Apply a maximum width only as an edge-case safeguard for
   unusually large content.

The card remains anchored to the point even when the stage moves. It should not become a fixed viewport dialog.

### Content behavior

- Start loading immediately, but keep the card completely blank and white for `0.5 seconds` before displaying `Loading...`.
- Use an `AbortController` for stale requests.
- Cache dataset entries by dataset and point ID.
- Display a readable error state if the request fails.
- Keep text selectable.
- Preserve the existing card colors, typography, padding, and overall visual dimensions.

### Interaction behavior

1. When a card is open and a new cross is clicked, replace the old card with the new card.
2. When the selected dataset changes, close the card and abort any active request.
3. Include a typographic retry button in the error state.

### Motion behavior

Motion should feel snappy, natural, and responsive. Remove or reduce it if it makes the application feel slower.

1. Add a slight card entry animation that opens from the point at the card's top border.
2. Defer line-by-line text animation until a later phase.

### Phase 4 implementation notes

- `Card.svelte` is a single structured HTML component. Its data loading, visual states, and event behavior remain
  together.
- The card is positioned from the selected point's world coordinates and the current stage transform.
- Placement prefers the right side of the point, then tries the left, bottom, and top sides before clamping to the
  viewport.
- The card preserves its current `325px` base width and scales with the stage between `0.6` and `1.7`.
- Dataset entries are fetched immediately, but `Loading...` appears only after `500ms` if the request is still pending.
- Active requests are aborted when the selection or dataset changes. Successful entries are cached by dataset and
  point ID.
- Failed requests display a readable error and a typographic `Retry` button.
- The card uses a short top-border entry animation and a simple content reveal. Line-by-line text animation remains
  deferred.
- The focused Playwright suite covers HTML-card anchoring, zoom scaling, replacement selection, delayed loading,
  retry, and caching.

### Exit criteria

- The card follows the selected point during pan and zoom.
- The card shrinks and grows between the defined scale range.
- The card does not disappear off-screen unnecessarily.
- Text can be selected with the pointer.
- Repeated selection does not create stale or racing requests.

## Phase 5: Consolidate the renderer

If the optimized Konva implementation is still not responsive, replace the per-point scene graph.

The first replacement should be a custom Canvas 2D renderer because it can preserve the current visuals with the least conceptual change.

### Canvas 2D target

Implement:

- a base point draw loop;
- an overlay draw loop;
- the same cross path and stroke settings;
- the same line dash and curve calculations;
- the same blob geometry;
- the same label typography;
- the same pan and zoom transform;
- the nearest-point spatial lookup from Phase 2.

Use separate redraw scheduling for base and overlay content. Do not redraw static content in response to pointer movement when only the hover overlay changes.

### Visual verification

Compare the custom renderer against the Konva renderer at fixed viewport and transform states. Validate:

- point coordinates;
- cross dimensions;
- stroke widths;
- colors;
- hover and selected appearance;
- blob outlines;
- connection curves;
- label placement;
- card anchoring.

### Exit criteria

- The custom renderer passes visual comparison at all reference states.
- The renderer has materially better laptop interaction performance.
- The old renderer can remain behind a temporary feature flag during validation.

## Phase 6: Evaluate OffscreenCanvas workers

Only after the consolidated renderer exists should worker rendering be evaluated.

### Proposed experiment

1. Transfer the rendering canvas to an `OffscreenCanvas`.
2. Keep Svelte, DOM controls, pointer events, and the HTML card on the main thread.
3. Send the worker:
   - typed point buffers;
   - viewport dimensions;
   - pan and zoom state;
   - search display state;
   - redraw commands.
4. Keep nearest-point lookup on the main thread initially, because pointer events and card state already live there.
5. Measure whether moving drawing to the worker improves frame time and pointer responsiveness.

### Important constraints

- Workers cannot directly manipulate the DOM.
- Pointer events must be forwarded from the main thread.
- Data should use transferable typed arrays where possible.
- The worker must handle resize, cancellation, and renderer shutdown.
- A main-thread fallback should remain available even though modern desktop browsers are the primary target.

### Exit criteria

Adopt worker rendering only if it produces a meaningful improvement in the benchmark. Otherwise, keep the simpler main-thread renderer.

## Phase 7: Evaluate WebGL alternatives

If future dataset sizes make Canvas 2D insufficient, benchmark a GPU renderer behind the same rendering interface.

### `regl-scatterplot`

This is the first WebGL candidate to investigate because it provides point rendering, pan and zoom, hover, selection, filtering, point connections, and spatial-index support. It also documents optional worker-backed spatial indexing.

The main integration risk is exact visual fidelity: the current custom crosses, blobs, curved dashed connections, and labels would likely require separate custom overlays.

### PixiJS

PixiJS is a more general GPU-backed 2D scene graph. It may be useful if the visualization evolves into a richer graphics application, but it should not be adopted merely to replace one large scene graph with another.

### Exit criteria

- A WebGL renderer is selected only if it supports the exact visual requirements or can be supplemented without visual changes.
- It demonstrates a clear performance advantage on future-sized datasets.
- Bundle size, initialization time, and browser behavior remain acceptable.

## Data and backend follow-up work

These tasks are lower priority than the renderer but should be addressed during the migration:

1. Add a stable dataset-entry identifier to frontend point data.
2. Avoid converting the entire 2D dataset to a list for every filtered embeddings request.
3. Add dataset metadata, including point count and coordinate bounds.
4. Define a dataset loading strategy for the larger datasets listed in [Issue #4](https://github.com/Francesco-Sch/knowledge-spaces/issues/4):
   - Falcon RefinedWeb;
   - Wikitext;
   - OASST1;
   - C4;
   - OSCAR.
5. Determine whether these datasets should be fully downloaded to the browser or loaded in viewport/search-specific chunks.
6. Consider binary or typed-array transport for large 2D coordinate collections.

## Dependency and type-safety work

The current project uses older `svelte-konva` APIs and has 42 `pnpm check` errors. Before completing a renderer migration:

1. Decide whether to stay on the current Konva/Svelte wrapper versions or upgrade them.
2. Avoid combining a dependency upgrade with the first performance experiment unless required.
3. Type the point, search, stage, and card models.
4. Remove implicit `any` values from the rendering path.
5. Make the neighbor-count store consistently numeric.
6. Make `pnpm check` pass before removing the old renderer.

## Suggested implementation order

1. Add benchmark instrumentation and visual reference states.
2. Fix redundant search geometry and reactive remounting.
3. Introduce explicit point IDs.
4. Add nearest-point interaction with a spatial grid.
5. Remove duplicate search crosses and recolor base points.
6. Move the dataset-entry card to an attached HTML overlay.
7. Re-measure the optimized Konva renderer.
8. If needed, replace the point scene graph with a custom Canvas 2D renderer.
9. Test OffscreenCanvas rendering as an isolated experiment.
10. Benchmark `regl-scatterplot` and PixiJS only if future point counts justify WebGL.
11. Remove obsolete Konva nodes and temporary feature flags.
12. Finish type cleanup and document the renderer architecture.

## Acceptance criteria

The migration is complete when:

- The visual output matches the current implementation at the recorded reference states.
- Search-result points are highlighted without duplicate point glyphs.
- The nearest point under the pointer can be selected reliably.
- The minimum interactive zoom behavior is implemented and documented.
- Panning and wheel zooming feel responsive on representative laptops.
- The dataset-entry card remains attached while panning and zooming.
- Dataset-entry text is selectable.
- Search blobs are calculated once per search.
- Purely visual elements do not participate in pointer hit testing.
- The implementation has a clear path for larger future datasets.
- `pnpm build` succeeds without new warnings.
- `pnpm check` passes.
