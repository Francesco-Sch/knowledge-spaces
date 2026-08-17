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
		RENDER_MODE_SWITCH_DELAY,
		type PlotRenderMode
	} from './plot-behaviour';
	import {
		getMappedSearches,
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

	// Set to true to re-introduce the optional grid layer.
	const GRID_ENABLED = false;

	// ----- Data -----
	export let embeddings: Array<Array<number>>;

	let windowWidth: number;
	let windowHeight: number;
	let mappedEmbeddings: Point[] = [];
	let mappedSearches: MappedSearch[] = [];
	type SearchOverlay = MappedSearch & { blobPoints: number[] };
	let searchOverlays: SearchOverlay[] = [];

	$: mappedEmbeddings = mapEmbeddingsToPoints(embeddings, windowWidth, windowHeight);
	$: mappedSearches = $searches ? getMappedSearches(windowWidth, windowHeight) : [];
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

	type CrossTarget = {
		attrs: {
			pointId: number;
			x: number;
			y: number;
			stroke: string;
		};
	};

	type CrossEvent = CustomEvent<{
		detail: {
			target: CrossTarget;
			cancelBubble: boolean;
		};
	}>;

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

	function handlePointerMove() {
		plotProfiler?.recordPointerEvent();
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

		if (cullingEnabled) {
			visibleMappedEmbeddings = getVisiblePoints(
				mappedEmbeddings,
				viewport,
				windowWidth,
				windowHeight
			);
		}
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

	// ----- Event Handlers -----
	let hoveredPoint: HoveredPoint | undefined;

	function handleCrossHover(event: CrossEvent) {
		const target = event.detail.detail.target;
		hoveredPoint = {
			id: target.attrs.pointId,
			x: target.attrs.x,
			y: target.attrs.y,
			color: target.attrs.stroke
		};
		document.body.style.cursor = 'pointer';
	}

	function handleCrossUnhover(event: CrossEvent) {
		const target = event.detail.detail.target;
		if (
			hoveredPoint &&
			hoveredPoint.id === target.attrs.pointId &&
			hoveredPoint.color === target.attrs.stroke
		) {
			hoveredPoint = undefined;
			document.body.style.cursor = 'default';
		}
	}

	function handleCrossClick(event: CrossEvent) {
		// Prevent bubbling.
		event.detail.detail.cancelBubble = true;

		const cross = event.detail.detail;
		const mappedEntryIndex = cross.target.attrs.pointId;
		const embedding = embeddings[mappedEntryIndex];

		if (mappedEntryIndex == null || !embedding) return;

		// Get the coordinates of the cross.
		const crossX = cross.target.attrs.x + 20;
		const crossY = cross.target.attrs.y;
		const search = getSearchForPoint($searches as StoredSearch[] | null, mappedEntryIndex);

		if (!NodeCardConfig.display) {
			// Set the NodeCardConfig.
			NodeCardConfig.display = true;
			NodeCardConfig.x = crossX;
			NodeCardConfig.y = crossY;
			NodeCardConfig.color = cross.target.attrs.stroke;
			NodeCardConfig.embedding.id = mappedEntryIndex;
			NodeCardConfig.embedding.x = parseFloat(embedding[0].toFixed(6));
			NodeCardConfig.embedding.y = parseFloat(embedding[1].toFixed(6));
			NodeCardConfig.search = search;

			// Redraw the layer.
			cardLayer?.draw();
		}
	}

	function handleStageClick() {
		NodeCardConfig.display = false;
		cardLayer?.draw();
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
	on:dragmove={handleStageTransform}
	on:click={handleStageClick}
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
			on:cross-clicked={handleCrossClick}
			on:cross-hovered={handleCrossHover}
			on:cross-unhovered={handleCrossUnhover}
		/>

		{#if $searches}
			{#each searchOverlays as search (search.key)}
				<Search
					{search}
					blobPoints={search.blobPoints}
					{cullingEnabled}
					{hybridEnabled}
					on:cross-clicked={handleCrossClick}
					on:cross-hovered={handleCrossHover}
					on:cross-unhovered={handleCrossUnhover}
				/>
			{/each}
		{/if}

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
