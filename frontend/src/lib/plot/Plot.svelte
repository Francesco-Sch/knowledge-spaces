<script lang="ts">
	import { onDestroy, onMount, tick } from 'svelte';
	import type Konva from 'konva';
	import type { Group as KonvaGroup } from 'konva/lib/Group';
	import type { Stage as KonvaStage } from 'konva/lib/Stage';
	import { Layer, Stage } from 'svelte-konva';
	import { searches, selectedDataset, stageConfig } from '../../stores/store';
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
		getPointDisplayColors,
		getSearchForPoint,
		getVisiblePoints,
		mapEmbeddingsToPoints,
		type CardEmbedding,
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
	import {
		CARD_DEFAULT_HEIGHT,
		CARD_DEFAULT_WIDTH,
		canFitCardBelow,
		getCardAnchor,
		getCardPositionForAnchor,
		getCardScreenPoint,
		type CardAnchor
	} from './card-position';

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
	type SelectedCard = {
		pointId: number;
		worldPoint: Point;
		color: string;
		embedding: CardEmbedding;
		search: StoredSearch | null;
	};
	let selectedCard: SelectedCard | undefined;
	let cardSelectionKey = 0;
	let cardSize = { width: CARD_DEFAULT_WIDTH, height: CARD_DEFAULT_HEIGHT };
	let cardPosition = { x: 0, y: 0, scale: 1 };
	let cardAnchor: CardAnchor | undefined;
	let cardSelectionViewport = { x: 0, y: 0, scale: 1, width: 0, height: 0 };
	let previousDataset: string | undefined;

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

	$: if (selectedCard && cardAnchor) {
		const selectedPoint = mappedEmbeddings[selectedCard.pointId] ?? selectedCard.worldPoint;
		if (selectedPoint) {
			const screenPoint = getCardScreenPoint(selectedPoint, viewport);
			const cardViewport = { width: windowWidth, height: windowHeight };
			const stageScale = getStageScale();

			// A card that initially opened upward may switch to its permanent
			// downward anchor once the viewport gives it enough room. Top-anchored
			// cards never switch back, so later movement can carry them off-screen.
			if (
				cardAnchor.vertical === 'bottom' &&
				hasCardViewportChanged() &&
				canFitCardBelow(screenPoint, cardSize, cardViewport, stageScale)
			) {
				cardAnchor = { ...cardAnchor, vertical: 'top' };
			}

			cardPosition = getCardPositionForAnchor(screenPoint, cardSize, stageScale, cardAnchor);
		}
	}

	$: if (previousDataset === undefined) {
		previousDataset = $selectedDataset;
	} else if (previousDataset !== $selectedDataset) {
		previousDataset = $selectedDataset;
		hideCard();
	}

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
		selectedCard = undefined;
		cardAnchor = undefined;
	}

	function getStageScale(): number {
		return Number.isFinite(viewport.scale) && viewport.scale > 0 ? viewport.scale : 1;
	}

	function hasCardViewportChanged(): boolean {
		return (
			viewport.x !== cardSelectionViewport.x ||
			viewport.y !== cardSelectionViewport.y ||
			viewport.scale !== cardSelectionViewport.scale ||
			windowWidth !== cardSelectionViewport.width ||
			windowHeight !== cardSelectionViewport.height
		);
	}

	function setCardAnchorPlacement(point: Point, size = cardSize) {
		const screenPoint = getCardScreenPoint(point, viewport);
		cardAnchor = getCardAnchor(
			screenPoint,
			size,
			{ width: windowWidth, height: windowHeight },
			getStageScale()
		);
	}

	function handleCardResize(event: CustomEvent<{ width: number; height: number }>) {
		cardSize = event.detail;
		const selectedPoint = selectedCard
			? mappedEmbeddings[selectedCard.pointId] ?? selectedCard.worldPoint
			: undefined;
		if (selectedPoint && !hasCardViewportChanged()) {
			setCardAnchorPlacement(selectedPoint, cardSize);
		}
	}

	function selectPoint(point: HoveredPoint) {
		const pointId = point.id;
		const embedding = embeddings[pointId];
		if (!embedding) return;

		const search = getSearchForPoint($searches as StoredSearch[] | null, pointId);
		cardSize = { width: CARD_DEFAULT_WIDTH, height: CARD_DEFAULT_HEIGHT };
		cardSelectionViewport = {
			...viewport,
			width: windowWidth,
			height: windowHeight
		};
		setCardAnchorPlacement(point);
		selectedCard = {
			pointId,
			worldPoint: { id: point.id, x: point.x, y: point.y },
			color: point.color,
			embedding: {
				id: pointId,
				x: parseFloat(embedding[0].toFixed(6)),
				y: parseFloat(embedding[1].toFixed(6))
			},
			search
		};
		cardSelectionKey += 1;
	}

	function handleStageClick(event: StagePointerEvent) {
		if (ignoreNextClick) {
			ignoreNextClick = false;
			return;
		}
		if (isDragging) return;

		const stage = event.detail.target.getStage();
		if (!stage) return;

		const point = getHoveredPoint(stage);
		if (point) {
			selectPoint(point);
		} else {
			hideCard();
		}
	}

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

<div class="plot-shell">
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
	</Stage>

	{#if selectedCard}
		{#key cardSelectionKey}
			<Card
				x={cardPosition.x}
				y={cardPosition.y}
				scale={cardPosition.scale}
				color={selectedCard.color}
				embedding={selectedCard.embedding}
				on:resize={handleCardResize}
			/>
		{/key}
	{/if}
</div>

<PlotProfiler bind:this={plotProfiler} {stageHandle} {getRenderMode} />

<style>
	.plot-shell {
		position: relative;
		width: 100vw;
		height: 100vh;
	}
</style>
