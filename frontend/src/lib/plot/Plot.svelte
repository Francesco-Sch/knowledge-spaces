<script lang="ts">
	import { onDestroy, onMount, tick } from 'svelte';
	import type Konva from 'konva';
	import type { Group as KonvaGroup } from 'konva/lib/Group';
	import type { Layer as KonvaLayer } from 'konva/lib/Layer';
	import type { Stage as KonvaStage } from 'konva/lib/Stage';
	import { Layer, Stage } from 'svelte-konva';
	import { searches, stageConfig } from '../../stores/store';
	import type { Point } from '$lib/types';
	import {
		getCullingMode,
		getRenderMode as getPlotRenderMode,
		getZoomTransform,
		getZoomTransformForScale,
		MIN_INTERACTION_SCALE,
		RENDER_MODE_SWITCH_DELAY,
		type PlotRenderMode
	} from './plot-behaviour';
	import {
		getMappedSearches,
		getPointDisplayColors,
		getSearchForPoint,
		getVisiblePoints,
		mapEmbeddingsToPoints,
		type CardConfig,
		type HoveredPoint,
		type MappedSearch,
		type Search as StoredSearch,
		type Viewport
	} from './plot-data';
	import Card from './ui/Card.svelte';
	import DatasetPoints from './ui/DatasetPoints.svelte';
	import Grid from './Grid.svelte';
	import Hover from './ui/Hover.svelte';
	import Search from './ui/Search.svelte';
	import PlotProfiler from '../utils/PlotProfiler.svelte';
	import { generateBlobPointsForSearch, zoomToSearchPoint } from '../../utils';
	import { findNearestPoint } from './point-hit-tracking';
	import { PointSpatialIndex } from './point-spatial-index';

	// Set to true to re-introduce the optional grid layer.
	const GRID_ENABLED = false;

	// ----- Data -----
	export let embeddings: Array<Array<number>>;

	let windowWidth: number;
	let windowHeight: number;
	let mappedEmbeddings: Point[] = [];
	let mappedSearches: MappedSearch[] = [];
	let pointDisplayColors = new Map<number, string>();
	const pointSpatialIndex = new PointSpatialIndex();
	type SearchOverlay = MappedSearch & { blobPoints: number[] };
	let searchOverlays: SearchOverlay[] = [];

	$: mappedEmbeddings = mapEmbeddingsToPoints(embeddings, windowWidth, windowHeight);
	$: pointSpatialIndex.rebuild(mappedEmbeddings);
	$: mappedSearches = $searches ? getMappedSearches(windowWidth, windowHeight) : [];
	$: pointDisplayColors = getPointDisplayColors(mappedSearches);
	$: searchOverlays = mappedSearches.map((search) => ({
		...search,
		blobPoints: getBlobPoints(search)
	}));

	$: if ($searches && $searches.length > 0) {
		const lastSearch = mappedSearches[mappedSearches.length - 1];
		if (
			lastSearch?.searchPoint &&
			Number.isFinite(lastSearch.searchPoint[0]) &&
			Number.isFinite(lastSearch.searchPoint[1])
		) {
			const nextStage = zoomToSearchPoint(lastSearch.searchPoint, windowWidth, windowHeight);
			if (nextStage) updateViewportFromConfig(nextStage);
		}
	}

	$: $stageConfig.width = windowWidth;
	$: $stageConfig.height = windowHeight;
	$: if ($stageConfig) {
		updateViewportFromConfig($stageConfig);
	}

	// ----- Behaviour -----
	type PlotProfilerHandle = {
		recordPointerEvent: () => void;
		recordWheelEvent: () => void;
		measureBlobGeneration: <T>(callback: () => T) => T;
	};

	type StagePointerEvent = CustomEvent<
		Konva.KonvaEventObject<MouseEvent | PointerEvent | TouchEvent>
	>;

	type StageTransformEvent = CustomEvent<
		Konva.KonvaEventObject<MouseEvent | PointerEvent | TouchEvent>
	>;

	type KonvaWheelEvent = CustomEvent<Konva.KonvaEventObject<WheelEvent>>;

	type CardEvent = CustomEvent<{
		detail: {
			cancelBubble: boolean;
		};
	}>;

	let cullingEnabled = false;
	let forcedCulling = false;
	let hybridEnabled = false;
	let cacheRequested = true;
	let baseGroupCached = false;
	let baseGroupMounted = false;
	let renderModeTimer: number | undefined;
	let viewport: Viewport = { x: 0, y: 0, scale: 1 };
	let visibleMappedEmbeddings: Point[] = [];
	let hoveredPoint: HoveredPoint | undefined;
	let isDragging = false;
	let ignoreNextClick = false;

	function getHoveredPoint(stage: KonvaStage): HoveredPoint | undefined {
		const point = findNearestPoint(
			stage.getPointerPosition(),
			{
				x: stage.x(),
				y: stage.y(),
				scale: stage.scaleX()
			},
			pointSpatialIndex
		);
		if (!point) return;

		return {
			...point,
			color: pointDisplayColors.get(point.id) ?? 'black'
		};
	}

	function setHoveredPoint(point: HoveredPoint | undefined) {
		const unchanged =
			hoveredPoint?.id === point?.id &&
			hoveredPoint?.x === point?.x &&
			hoveredPoint?.y === point?.y &&
			hoveredPoint?.color === point?.color;
		if (unchanged) return;

		hoveredPoint = point;
		if (typeof document !== 'undefined') {
			document.body.style.cursor = point ? 'pointer' : 'default';
		}
	}

	function handlePointerMove(event: StagePointerEvent) {
		plotProfiler?.recordPointerEvent();
		if (isDragging) return;

		const stage = event.detail.target.getStage();
		if (stage) setHoveredPoint(getHoveredPoint(stage));
	}

	function handlePointerLeave() {
		setHoveredPoint(undefined);
	}

	function handlePointerDown() {
		// A new pointer sequence is eligible for selection. A drag will set this
		// again in handleStageDragStart before the click/tap can be dispatched.
		ignoreNextClick = false;
	}

	function handleStageDragStart() {
		isDragging = true;
		ignoreNextClick = true;
		setHoveredPoint(undefined);
	}

	function handleStageDragEnd(event: StageTransformEvent) {
		isDragging = false;
		const stage = event.detail.target.getStage();
		if (!stage) return;

		updateViewport(stage);
		setHoveredPoint(getHoveredPoint(stage));
	}

	function handleStageTransform(event: StageTransformEvent) {
		const stage = event.detail.target.getStage();
		if (stage) updateViewport(stage);
	}

	function updateViewport(stage: KonvaStage) {
		viewport = {
			x: stage.x(),
			y: stage.y(),
			scale: stage.scaleX()
		};
		updateRenderMode(viewport.scale);
	}

	function updateViewportFromConfig(config: { x: number; y: number; scaleX: number }) {
		viewport = {
			x: config.x,
			y: config.y,
			scale: config.scaleX
		};
		updateRenderMode(viewport.scale);

		if (stageHandle && !isDragging) setHoveredPoint(getHoveredPoint(stageHandle));
	}

	$: visibleMappedEmbeddings = cullingEnabled
		? getVisiblePoints(mappedEmbeddings, viewport, windowWidth, windowHeight)
		: mappedEmbeddings;

	function updateRenderMode(stageScale: number) {
		const nextCullingMode = getCullingMode(
			stageScale,
			cullingEnabled,
			forcedCulling,
			hybridEnabled
		);
		if (nextCullingMode === cullingEnabled) {
			if (renderModeTimer !== undefined) {
				window.clearTimeout(renderModeTimer);
				renderModeTimer = undefined;
			}
			return;
		}

		if (!hybridEnabled) {
			applyRenderMode(nextCullingMode);
			return;
		}

		if (renderModeTimer !== undefined) window.clearTimeout(renderModeTimer);
		renderModeTimer = window.setTimeout(() => {
			renderModeTimer = undefined;
			applyRenderMode(getCullingMode(stageScale, cullingEnabled, forcedCulling, hybridEnabled));
		}, RENDER_MODE_SWITCH_DELAY);
	}

	function applyRenderMode(nextCullingMode: boolean) {
		if (nextCullingMode === cullingEnabled) return;

		if (!nextCullingMode) baseGroupMounted = true;
		cullingEnabled = nextCullingMode;
		if (!cullingEnabled) cacheBaseGroup();
	}

	function getRenderMode(): PlotRenderMode {
		return getPlotRenderMode(cullingEnabled, forcedCulling, cacheRequested);
	}

	function scaleShape(event: KonvaWheelEvent) {
		plotProfiler?.recordWheelEvent();

		// Stop default scrolling.
		event.preventDefault();

		const stage = event.detail.target.getStage();
		if (!stage) return;

		const transform = getZoomTransform(
			stage.scaleX(),
			{ x: stage.x(), y: stage.y() },
			stage.getPointerPosition(),
			event.detail.evt.deltaY,
			event.detail.evt.ctrlKey
		);
		if (!transform) return;

		stage.scale({ x: transform.scale, y: transform.scale });
		stage.position({ x: transform.x, y: transform.y });
		stageConfig.update((config) => ({
			...config,
			x: transform.x,
			y: transform.y,
			scaleX: transform.scale,
			scaleY: transform.scale
		}));
		updateViewport(stage);
		setHoveredPoint(getHoveredPoint(stage));
	}

	// ----- Canvas Objects -----
	let crossGroup: KonvaGroup | undefined;
	let cardLayer: KonvaLayer | undefined;
	let plotProfiler: PlotProfilerHandle | undefined;

	function getBlobPoints(search: MappedSearch): number[] {
		return (
			plotProfiler?.measureBlobGeneration(() => generateBlobPointsForSearch(search)) ??
			generateBlobPointsForSearch(search)
		);
	}

	function clearBaseGroupCache() {
		if (!baseGroupCached || !crossGroup) return;
		crossGroup.clearCache();
		baseGroupCached = false;
	}

	function cacheBaseGroup() {
		if (baseGroupCached || !cacheRequested || cullingEnabled || !crossGroup) return;

		tick().then(() => {
			if (baseGroupCached || !cacheRequested || cullingEnabled || !crossGroup) return;

			const bbox = crossGroup.getClientRect();
			if (bbox.width > 0 && bbox.height > 0) {
				crossGroup.cache();
				baseGroupCached = true;
			} else {
				console.warn('Group has invalid size. Caching skipped.');
			}
		});
	}

	function handleWindowResize() {
		clearBaseGroupCache();
		if (!cullingEnabled) cacheBaseGroup();
	}

	// The full base group is mounted for cache-only rendering and on the first
	// culling-to-cache transition. It remains hidden and non-listening during
	// later culling periods so repeated zoom transitions reuse the same cache.
	$: if (!cullingEnabled && cacheRequested && crossGroup && !baseGroupCached) {
		cacheBaseGroup();
	}

	$: if (pointDisplayColors && crossGroup) {
		// Recolored points must be reflected in the cached base bitmap as well as
		// in the Konva nodes. Rebuild it after Svelte applies the new colors.
		clearBaseGroupCache();
		if (!cullingEnabled) cacheBaseGroup();
	}

	// ----- Event Handlers -----
	function hideCard() {
		if (!NodeCardConfig.display) return;
		NodeCardConfig.display = false;
		cardLayer?.draw();
	}

	function zoomToMinimumInteractionScale(stage: KonvaStage): boolean {
		const transform = getZoomTransformForScale(
			stage.scaleX(),
			{ x: stage.x(), y: stage.y() },
			stage.getPointerPosition(),
			MIN_INTERACTION_SCALE
		);
		if (!transform) return false;

		stage.scale({ x: transform.scale, y: transform.scale });
		stage.position({ x: transform.x, y: transform.y });
		stageConfig.update((config) => ({
			...config,
			x: transform.x,
			y: transform.y,
			scaleX: transform.scale,
			scaleY: transform.scale
		}));
		updateViewport(stage);
		setHoveredPoint(getHoveredPoint(stage));
		return true;
	}

	function selectPoint(point: HoveredPoint) {
		const mappedEntryIndex = point.id;
		const embedding = embeddings[mappedEntryIndex];
		if (!embedding) return;

		const search = getSearchForPoint($searches as StoredSearch[] | null, mappedEntryIndex);
		if (NodeCardConfig.display) return;

		NodeCardConfig.display = true;
		NodeCardConfig.x = point.x + 20;
		NodeCardConfig.y = point.y;
		NodeCardConfig.color = point.color;
		NodeCardConfig.embedding.id = mappedEntryIndex;
		NodeCardConfig.embedding.x = parseFloat(embedding[0].toFixed(6));
		NodeCardConfig.embedding.y = parseFloat(embedding[1].toFixed(6));
		NodeCardConfig.search = search;

		// Redraw the layer.
		cardLayer?.draw();
	}

	function handleStageClick(event: StagePointerEvent) {
		if (ignoreNextClick) {
			ignoreNextClick = false;
			return;
		}
		if (isDragging) return;

		const stage = event.detail.target.getStage();
		if (!stage) return;

		if (stage.scaleX() < MIN_INTERACTION_SCALE) {
			zoomToMinimumInteractionScale(stage);
			hideCard();
			return;
		}

		const point = getHoveredPoint(stage);
		if (point) {
			selectPoint(point);
		} else {
			hideCard();
		}
	}

	function stopPropagation(event: CardEvent) {
		// Prevent bubbling.
		event.detail.detail.cancelBubble = true;
	}

	let NodeCardConfig: CardConfig = {
		display: false,
		x: 0,
		y: 0,
		color: 'black',
		embedding: {
			id: 0,
			x: 0,
			y: 0
		},
		search: null
	};

	onMount(() => {
		const params = new URLSearchParams(window.location.search);
		forcedCulling = params.get('plotCull') === '1';
		hybridEnabled = !forcedCulling && params.get('plotHybrid') !== '0';
		cacheRequested = params.get('plotCache') !== '0';
		cullingEnabled = getCullingMode(
			stageHandle?.scaleX() ?? $stageConfig.scaleX,
			false,
			forcedCulling,
			hybridEnabled
		);

		if (stageHandle) updateViewport(stageHandle);
		if (!cullingEnabled) {
			baseGroupMounted = true;
			cacheBaseGroup();
		}
	});

	onDestroy(() => {
		if (renderModeTimer !== undefined) window.clearTimeout(renderModeTimer);
		if (typeof document !== 'undefined') document.body.style.cursor = 'default';
	});

	let stageHandle: KonvaStage | undefined;
</script>

<svelte:window
	bind:innerWidth={windowWidth}
	bind:innerHeight={windowHeight}
	on:resize={handleWindowResize}
/>

<Stage
	bind:config={$stageConfig}
	bind:handle={stageHandle}
	on:wheel={scaleShape}
	on:mousemove={handlePointerMove}
	on:touchmove={handlePointerMove}
	on:mouseleave={handlePointerLeave}
	on:mousedown={handlePointerDown}
	on:touchstart={handlePointerDown}
	on:dragstart={handleStageDragStart}
	on:dragmove={handleStageTransform}
	on:dragend={handleStageDragEnd}
	on:click={handleStageClick}
	on:tap={handleStageClick}
>
	<!-- Optional grid layer. It is disabled to preserve the current rendering. -->
	{#if GRID_ENABLED}
		<Grid scale={viewport.scale} strokes={20} {windowWidth} {windowHeight} />
	{/if}

	<Layer>
		<DatasetPoints
			bind:crossGroup
			{mappedEmbeddings}
			{visibleMappedEmbeddings}
			{cullingEnabled}
			{baseGroupMounted}
			{pointDisplayColors}
		/>

		{#if $searches}
			{#each searchOverlays as search (search.key)}
				<Search {search} blobPoints={search.blobPoints} {cullingEnabled} {hybridEnabled} />
			{/each}
		{/if}
	</Layer>

	<!-- Pointer movement updates only this single highlight layer. -->
	<Layer>
		<Hover point={hoveredPoint} />
	</Layer>

	<Layer bind:handle={cardLayer}>
		<Card
			display={NodeCardConfig.display}
			x={NodeCardConfig.x}
			y={NodeCardConfig.y}
			color={NodeCardConfig.color}
			embedding={NodeCardConfig.embedding}
			on:card-click={stopPropagation}
		/>
	</Layer>
</Stage>

<PlotProfiler bind:this={plotProfiler} {stageHandle} {getRenderMode} />

<style></style>
