# Dataset rendering on canvas using Konva in v1.0.1

This document describes how dataset rendering works in the frontend in version 1.0.1. Documents old canvas rendering implementation in regard of the new implementation discussed in [Issue #19: Rework dataset rendering for performance](https://github.com/Francesco-Sch/knowledge-spaces/issues/19).

## Technology and scope

The v1.0.1 renderer uses:

- Svelte 4;
- `svelte-konva@0.3.1`;
- `konva@9.2.1`;
- Konva's Canvas 2D renderer;
- browser `localStorage` for persisted searches.

The dataset used in v1.0.1 is the 2D representation of 20 Newsgroups. It contains 11,314 points.

The frontend rendering implementation is primarily contained in:

- `frontend/src/lib/plot/Plot.svelte`;
- `frontend/src/lib/plot/Cross.svelte`;
- `frontend/src/lib/plot/Blob.svelte`;
- `frontend/src/lib/plot/LineToCross.svelte`;
- `frontend/src/lib/plot/NodeCard.svelte`;
- `frontend/src/utils/mapEmbeddingsToWindowSize.ts`;
- `frontend/src/utils/getSearchesWithMappedEmbedding.ts`;
- `frontend/src/utils/generateBlobPointsFromSearch.ts`.

## Page and dataset loading

`frontend/src/routes/+page.server.ts` requests the complete two-dimensional embedding collection from:

```text
/embeddings/20newsgroups
```

The response is returned as page data. `frontend/src/routes/+page.svelte` converts the response object to an array and passes it to the plot:

```ts
let embeddings: Array<Array<number>> = Object.values(data.embeddings);
```

```svelte
<Plot {embeddings} />
```

The complete dataset is therefore available to the plot when the page is rendered. The v1.0.1 implementation does not request points by viewport or load them incrementally.

## Coordinate system

The stored 2D embeddings use normalized dataset coordinates. `frontend/src/utils/mapEmbeddingsToWindowSize.ts` maps those coordinates to the current window dimensions.

The mapping uses the following ranges:

```ts
map_range(x, -0.1, 0.5, -1000, windowWidth + 1000)
map_range(y, -0.1, 0.5, -1000, windowHeight + 1000)
```

The resulting coordinates are used as Konva scene coordinates. The Konva stage applies translation and scale on top of those coordinates for panning and zooming.

The extra 1,000 units on each side mean that mapped points can exist outside the visible window. They remain part of the plot's point collection.

## Search state

`frontend/src/stores/store.ts` defines the search-related stores:

- `selectedDataset`;
- `amountOfNeighbors`;
- `searches`;
- `getActiveSearches`;
- `getEmbeddingsFromSearches`.

The `searches` store is initialized from `localStorage` and persisted there whenever it changes.

Each stored search contains:

- `dataset`;
- `query`;
- `searchPoint`;
- `neighbors`;
- `color`.

`getActiveSearches` filters the stored searches by the selected dataset. `frontend/src/utils/getSearchesWithMappedEmbedding.ts` maps the search point and each neighbor to the current window dimensions.

## Konva stage and layers

`frontend/src/lib/plot/Plot.svelte` creates the stage using `svelte-konva`:

```svelte
<Stage bind:config={$stageConfig} on:wheel={scaleShape} on:click={handleStageClick}>
	...
</Stage>
```

The stage configuration is stored in `stageConfig`:

```ts
{
	width: 0,
	height: 0,
	draggable: true,
	x: 0,
	y: 0,
	scaleX: 1,
	scaleY: 1
}
```

`Plot.svelte` renders two Konva layers:

1. The main layer contains the dataset points and search visualizations.
2. The card layer contains the selected dataset-entry card.

The main layer currently contains the following visual groups:

- the base dataset crosses;
- search blobs;
- search-to-neighbor lines;
- search-result crosses;
- search labels.

## Base dataset rendering

The base dataset is rendered as one `Cross` component for every mapped embedding:

```svelte
<Group bind:handle={crossGroup}>
	{#each mappedEmbeddings as cross}
		<Cross x={cross[0]} y={cross[1]} color={'black'} on:cross-clicked={handleCrossClick} />
	{/each}
</Group>
```

For the 20Newsgroups dataset, this creates approximately:

- 11,314 Svelte `Cross` components;
- 11,314 Konva `Shape` nodes;
- one custom scene function per point;
- one custom hit function per point;
- pointer event handlers for every point.

The base cross group is stored in `crossGroup`. After mounting, `Plot.svelte` waits for a Svelte tick, checks the group's client rectangle, and caches the group when its dimensions are valid:

```ts
const bbox = crossGroup.getClientRect();

if (bbox.width > 0 && bbox.height > 0) {
	crossGroup.cache();
}
```

The cache is created once during mounting. It is not explicitly rebuilt when the mapped embeddings change.

## Cross drawing and hit detection

`frontend/src/lib/plot/Cross.svelte` uses a custom Konva `Shape`.

The scene function draws two diagonal strokes centered on the shape origin:

```ts
context.beginPath();
context.moveTo(-width, -height);
context.lineTo(width, height);
context.moveTo(width, -height);
context.lineTo(-width, height);
context.closePath();
context.stroke();
context.fillStrokeShape(shape);
```

The configured shape dimensions are:

```ts
width: 5,
height: 5,
stroke: color,
strokeWidth: 1.5
```

The hit function draws a rectangular hit region around the cross. It uses one unit of padding:

```ts
const padding = 1;
```

The hit region is transformed together with the stage. Consequently, its screen-space size changes as the stage zoom changes.

## Cross hover behavior

Each `Cross` listens for `mouseenter` and `mouseleave` events.

On mouse enter, the component:

1. Sets `document.body.style.cursor` to `pointer`.
2. Sets the cross shadow color to the cross color.
3. Sets a shadow blur of `2`.
4. Sets the shadow offset to zero.
5. Sets the shadow opacity to `1`.
6. Calls `cross.draw()`.

On mouse leave, it resets the cursor to `default`, clears the shadow properties, and calls `cross.draw()` again.

## Pan and zoom behavior

The stage is draggable. Konva handles the drag interaction and changes the stage position.

Wheel events are handled by `scaleShape` in `Plot.svelte`. The handler:

1. Prevents the browser's default wheel behavior.
2. Gets the Konva stage from the event target.
3. Reads the current stage scale.
4. Reads the current pointer position.
5. Converts the pointer position into scene coordinates.
6. Chooses zoom direction from `deltaY`.
7. Reverses the direction for trackpad-style `ctrlKey` wheel events.
8. Multiplies or divides the scale by `1.15`.
9. Clamps the scale to the range `0.2` through `5`.
10. Updates the stage scale.
11. Updates the stage position so the scene point beneath the pointer remains fixed.

The handler stores the calculated scale in a local `scale` variable and directly mutates the Konva stage. The stage configuration store is not updated with every wheel operation.

## Search visualization

Search visualizations are generated in the main layer. The relevant template structure is:

```svelte
{#key mappedSearches}
	{#if $searches}
		{#each mappedSearches as search}
			{#each search.neighbors as cross}
				<Blob points={generateBlobPointsForSearch(search)} color={search.color} />
				<LineToCross searchPoint={search.searchPoint} {cross} color={search.color} />
				<Cross
					x={cross[0]}
					y={cross[1]}
					color={search.color}
					on:cross-clicked={handleCrossClick}
				/>
			{/each}

			{#if search.searchPoint}
				<Label>...</Label>
			{/if}
		{/each}
	{/if}
{/key}
```

For each active search and each neighbor, the template creates:

- a `Blob` line;
- a `LineToCross` line;
- a second `Cross` shape.

The search result cross is a separate Konva shape from the corresponding base dataset cross. A point that is both part of the base dataset and a search result can therefore be drawn twice.

The `{#key mappedSearches}` block causes the complete search subtree to be destroyed and recreated when `mappedSearches` changes.

Search labels consist of a Konva `Label`, a colored `Tag`, and a Konva `Text` node. The label text is the stored search query.

## Search blobs

`frontend/src/utils/generateBlobPointsFromSearch.ts` generates the blob surrounding a search. It:

1. Combines the search neighbors with the search point.
2. Computes a concave hull using `concaveman`.
3. Expands the hull using `polygon-offset`.
4. Converts the result into `{ x, y }` objects.
5. Simplifies the points using `simplify-js`.
6. Converts the simplified points back into a flat Konva line-point array.

`Plot.svelte` calls this function inside the neighbor loop. The same search blob is therefore recalculated once for each neighbor, even though the resulting blob is rendered with the same search color and geometry.

## Search connections

`frontend/src/lib/plot/LineToCross.svelte` renders each search-to-neighbor connection as a Konva `Line`.

The connection uses:

- the search point as the first point;
- a calculated midpoint as the control point;
- the neighbor point as the final point;
- the search color;
- a stroke width of `2`;
- a dash pattern of `[5, 5]`;
- `tension: 0.5`;
- Bezier rendering.

`computeBow` calculates the slope, line length, bow magnitude, midpoint, and adjusted midpoint Y coordinate. The template currently invokes `computeBow` separately for the midpoint X and midpoint Y values.

## Point selection flow

`Plot.svelte` handles `cross-clicked` events from both base and search-result crosses.

The handler first cancels event bubbling:

```ts
e.detail.detail.cancelBubble = true;
```

It then reads the clicked Konva target and extracts:

- `x`;
- `y`;
- `stroke`.

The point is identified by searching `mappedEmbeddings` for an entry whose mapped X and Y values exactly equal the clicked target's attributes:

```ts
const mappedEntryIndex = mappedEmbeddings.findIndex(
	(embedding) => embedding[0] === cross.target.attrs.x && embedding[1] === cross.target.attrs.y
);
```

The resulting array index is used to access the original embedding and as the dataset-entry ID.

The handler then searches the stored searches for a neighbor whose `corpus_id` equals that index. This associates the selected point with the search that produced it.

If the card is not already visible, the handler fills `NodeCardConfig` with:

- display state;
- X and Y position;
- point color;
- point ID;
- rounded original embedding coordinates;
- matching search data.

The card layer is then explicitly redrawn with `CardLayer.draw()`.

If a card is already displayed, the handler does not replace it with a newly clicked point. A stage click closes the card first.

## Stage click and card closing

A click on the stage calls `handleStageClick`:

```ts
NodeCardConfig.display = false;
CardLayer.draw();
```

The card is therefore closed by clicking the stage background or another stage target that allows the event to reach the stage.

## Dataset-entry card

`frontend/src/lib/plot/NodeCard.svelte` renders the card inside the second Konva layer.

The card contains:

- a white background rectangle;
- a small colored rectangle;
- a coordinate text node;
- a dataset-entry text node.

The card uses a padding value of `15`.

Its initial background configuration is:

```ts
{
	x,
	y,
	width: 325,
	height: 100,
	fill: 'white'
}
```

The coordinate text displays the selected embedding values rounded to six decimal places. The dataset-entry text uses Helvetica at font size `14`.

After the text node updates, `afterUpdate` changes the background width and height to fit the measured text dimensions:

```ts
rectConfig.width = text.width() + 2 * padding;
rectConfig.height = text.height() + 2 * padding;
```

The card's position is calculated from the selected cross:

```ts
const crossX = cross.target.attrs.x + 20;
const crossY = cross.target.attrs.y;
```

Those values are stage coordinates. The card is consequently transformed together with the stage during panning and zooming. No separate viewport-boundary calculation is performed.

## Dataset-entry request flow

When `display` is true, `NodeCard.svelte` calls `fetchDatasetEntry`.

The request is sent to:

```text
/api/dataset-entry?dataset=<selected-dataset>&embedding=<point-index>
```

The component briefly sets the text to `Loading...` and replaces it with the JSON response from the API.

The v1.0.1 request flow does not define cancellation, request deduplication, error rendering, or a local dataset-entry cache.

## Backend endpoints used by the plot

The plot-related backend and frontend API files are:

- `backend/src/routes/embeddings.py`;
- `backend/src/crud/embeddings.py`;
- `backend/src/routes/dataset_entry.py`;
- `backend/src/crud/dataset_entry.py`;
- `frontend/src/routes/api/embeddings/+server.ts`;
- `frontend/src/routes/api/dataset-entry/+server.ts`.

`backend/src/crud/embeddings.py` loads the two-dimensional dataset, converts it to a dictionary, zips the two coordinate columns into pairs, and optionally filters the resulting list by IDs.

`backend/src/crud/dataset_entry.py` accesses the loaded 20 Newsgroups data by integer index and returns the corresponding document.

## Current rendering characteristics

The v1.0.1 Konva implementation has the following observable characteristics:

- The entire base dataset is present in the scene at once.
- Each base point is an individual Svelte and Konva object.
- Each base point participates in Konva pointer hit detection.
- Search-result points are additional point objects rather than recolorings of base points.
- Search blobs are generated in the neighbor loop.
- Visual search lines and labels are represented as Konva nodes.
- The selected dataset-entry card is part of the transformed canvas scene.
- The point hit region scales with the stage.
- The base group is cached once after mounting.
- Stage panning is provided by Konva dragging.
- Stage zooming is implemented by the `scaleShape` wheel handler.
- Point identity is derived from the index of the mapped embedding array.

## Validation status

The production frontend build succeeds in v1.0.1 with one existing accessibility warning in `frontend/src/routes/+layout.svelte`.

The `pnpm check` command reports 42 existing type errors and one warning. The diagnostics include implicit `any` values, outdated `svelte-konva` typings, and numeric operations on the string-typed neighbor-count store.

This document describes the implementation as it exists on the Issue #19 working branch; it does not represent a completed performance migration.
