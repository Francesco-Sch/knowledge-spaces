<script lang="ts">
	import { onMount, tick } from 'svelte';
	import { Stage, Layer, Group, Label, Tag, Text } from 'svelte-konva';
	import type { Group as KonvaGroup } from 'konva/lib/Group';
	import type { Layer as KonvaLayer } from 'konva/lib/Layer';
	import type { Stage as KonvaStage } from 'konva/lib/Stage';
	import type { Point } from '$lib/types';
	import Grid from './Grid.svelte';
	import Cross from './Cross.svelte';
	import LineToCross from './LineToCross.svelte';
	import Blob from './Blob.svelte';
	import NodeCard from './NodeCard.svelte';
	import PlotProfiler from '../utils/PlotProfiler.svelte';
	import type { PlotRenderMode } from '../utils/plotProfiler';

	import { searches, stageConfig } from '../../stores/store';
	import {
		generateBlobPointsForSearch,
		getSearchesWithMappedEmbeddings,
		mapEmbeddingsToWindowSize,
		zoomToSearchPoint
	} from '../../utils';

	type Viewport = {
		x: number;
		y: number;
		scale: number;
	};

	// Keep vector culling active at normal and high zoom. Only use the cached
	// base group at very low zoom, where most of the dataset is visible anyway.
	const CULLING_ENTER_SCALE = 0.8;
	const CULLING_EXIT_SCALE = 0.7;
	const RENDER_MODE_SWITCH_DELAY = 180;

	let windowWidth: number, windowHeight: number;
	let cullingEnabled = false;
	let forcedCulling = false;
	let hybridEnabled = false;
	let cacheRequested = true;
	let baseGroupCached = false;
	let baseGroupMounted = false;
	let renderModeTimer: number | undefined;
	let viewport: Viewport = { x: 0, y: 0, scale: 1 };

	export let embeddings: Array<Array<number>>;

	$: mappedEmbeddings = mapEmbeddingsToWindowSize(embeddings, windowWidth, windowHeight).map(
		([x, y], id): Point => ({ id, x, y })
	);
	$: mappedSearches = $searches ? getSearchesWithMappedEmbeddings(windowWidth, windowHeight) : [];
	$: visibleMappedEmbeddings = cullingEnabled
		? getVisiblePoints(mappedEmbeddings, viewport, windowWidth, windowHeight)
		: mappedEmbeddings;
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

	type PlotProfilerHandle = {
		recordPointerEvent: () => void;
		recordWheelEvent: () => void;
		measureBlobGeneration: <T>(callback: () => T) => T;
	};

	type MappedSearch = {
		neighbors: Point[];
		searchPoint?: Array<number>;
	};

	type SearchKeySource = {
		dataset?: string;
		query?: string;
	};

	type HoveredPoint = {
		id: number;
		x: number;
		y: number;
		color: string;
	};

	let hoveredPoint: HoveredPoint | undefined;

	// Cross group
	let crossGroup: KonvaGroup | undefined;
	let stageHandle: KonvaStage | undefined;
	let plotProfiler: PlotProfilerHandle | undefined;

	onMount(() => {
		const params = new URLSearchParams(window.location.search);
		forcedCulling = params.get('plotCull') === '1';
		hybridEnabled = !forcedCulling && params.get('plotHybrid') !== '0';
		cacheRequested = params.get('plotCache') !== '0';
		cullingEnabled = getCullingMode(stageHandle?.scaleX() ?? $stageConfig.scaleX);

		if (stageHandle) updateViewport(stageHandle);
		if (!cullingEnabled) {
			baseGroupMounted = true;
			cacheBaseGroup();
		}
	});

	function handlePointerMove() {
		plotProfiler?.recordPointerEvent();
	}

	const handleCrossHover = (event: { detail: { detail: { target: any } } }) => {
		const target = event.detail.detail.target;
		hoveredPoint = {
			id: target.attrs.pointId,
			x: target.attrs.x,
			y: target.attrs.y,
			color: target.attrs.stroke
		};
		document.body.style.cursor = 'pointer';
	};

	const handleCrossUnhover = (event: { detail: { detail: { target: any } } }) => {
		const target = event.detail.detail.target;
		const currentHoveredPoint = hoveredPoint;
		if (
			currentHoveredPoint &&
			currentHoveredPoint.id === target.attrs.pointId &&
			currentHoveredPoint.color === target.attrs.stroke
		) {
			hoveredPoint = undefined;
			document.body.style.cursor = 'default';
		}
	};

	function getBlobPoints(search: MappedSearch) {
		return (
			plotProfiler?.measureBlobGeneration(() => generateBlobPointsForSearch(search)) ??
			generateBlobPointsForSearch(search)
		);
	}

	function getSearchKey(search: SearchKeySource) {
		return JSON.stringify([search.dataset ?? '', search.query ?? '']);
	}

	function getVisiblePoints(
		points: Point[],
		currentViewport: Viewport,
		width: number,
		height: number
	) {
		const margin = 6;
		const left = -currentViewport.x / currentViewport.scale - margin;
		const top = -currentViewport.y / currentViewport.scale - margin;
		const right = (width - currentViewport.x) / currentViewport.scale + margin;
		const bottom = (height - currentViewport.y) / currentViewport.scale + margin;

		return points.filter(
			(point) => point.x >= left && point.x <= right && point.y >= top && point.y <= bottom
		);
	}

	function getCullingMode(stageScale: number) {
		if (forcedCulling) return true;
		if (!hybridEnabled) return false;
		return cullingEnabled ? stageScale > CULLING_EXIT_SCALE : stageScale >= CULLING_ENTER_SCALE;
	}

	function getRenderMode(): PlotRenderMode {
		if (forcedCulling) return 'forced-culling';
		if (cullingEnabled) return 'adaptive-culling';
		return cacheRequested ? 'cached' : 'vector';
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

	function applyRenderMode(nextCullingMode: boolean) {
		if (nextCullingMode === cullingEnabled) return;

		if (!nextCullingMode) baseGroupMounted = true;
		cullingEnabled = nextCullingMode;
		if (!cullingEnabled) cacheBaseGroup();
	}

	function updateRenderMode(stageScale: number) {
		const nextCullingMode = getCullingMode(stageScale);
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
			applyRenderMode(getCullingMode(stageScale));
		}, RENDER_MODE_SWITCH_DELAY);
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

	function handleStageTransform(e: any) {
		updateViewport(e.detail.target.getStage());
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

	// Zooming
	let scale = 1;
	let scaleBy = 1.15;
	let maxScale = 5;
	let minScale = 0.2;

	function scaleShape(e: {
		detail: { target: { getStage: () => any }; evt: { deltaY: number; ctrlKey: any } };
		preventDefault: () => void;
	}) {
		plotProfiler?.recordWheelEvent();
		let stage = e.detail.target.getStage();

		// stop default scrolling
		e.preventDefault();

		var oldScale = stage.scaleX();
		var pointer = stage.getPointerPosition();

		var mousePointTo = {
			x: (pointer.x - stage.x()) / oldScale,
			y: (pointer.y - stage.y()) / oldScale
		};

		// how to scale? Zoom in? Or zoom out?
		let direction = e.detail.evt.deltaY > 0 ? -1 : 1;

		// when we zoom on trackpad, e.evt.ctrlKey is true
		// in that case lets revert direction
		if (e.detail.evt.ctrlKey) {
			direction = -direction;
		}

		var newScale = direction > 0 ? oldScale * scaleBy : oldScale / scaleBy;
		scale = newScale;

		// limit the scale to maxScale and minScale
		if (newScale > maxScale) {
			newScale = maxScale;
		} else if (newScale < minScale) {
			newScale = minScale;
		}

		stage.scale({ x: newScale, y: newScale });

		var newPos = {
			x: pointer.x - mousePointTo.x * newScale,
			y: pointer.y - mousePointTo.y * newScale
		};
		stage.position(newPos);
		stageConfig.update((config) => ({
			...config,
			x: newPos.x,
			y: newPos.y,
			scaleX: newScale,
			scaleY: newScale
		}));
		updateViewport(stage);
	}

	function handleStageClick() {
		NodeCardConfig.display = false;
		CardLayer?.draw();
	}

	let NodeCardConfig = {
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
	let CardLayer: KonvaLayer | undefined;

	function handleCrossClick(e) {
		// Prevent bubbling
		e.detail.detail.cancelBubble = true;

		const cross = e.detail.detail;

		// Get x and y coordinates of the cross
		const crossX = cross.target.attrs.x + 20;
		const crossY = cross.target.attrs.y;

		const mappedEntryIndex = cross.target.attrs.pointId;
		const embedding = embeddings[mappedEntryIndex];

		if (mappedEntryIndex == null || !embedding) return;

		// Check if cross is part of a search
		let search = null;

		if ($searches) {
			search = $searches.find((search) =>
				search.neighbors.some((neighbor) => neighbor.corpus_id === mappedEntryIndex)
			);
		}

		if (!NodeCardConfig.display) {
			// Set the NodeCardConfig
			NodeCardConfig.display = true;
			NodeCardConfig.x = crossX;
			NodeCardConfig.y = crossY;
			NodeCardConfig.color = cross.target.attrs.stroke;
			NodeCardConfig.embedding.id = mappedEntryIndex;
			NodeCardConfig.embedding.x = parseFloat(embedding[0].toFixed(6));
			NodeCardConfig.embedding.y = parseFloat(embedding[1].toFixed(6));
			NodeCardConfig.search = search != undefined ? search : null;

			// Redraw the layer
			CardLayer?.draw();
		}
	}

	function stopPropagation(e) {
		// Prevent bubbling
		e.detail.detail.cancelBubble = true;
	}
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
	<!-- Grid -->
	<!-- <Grid {scale} strokes={20} {windowWidth} {windowHeight} /> -->

	<Layer>
		<!-- Embeddings -->
		{#if !cullingEnabled || baseGroupMounted}
			<Group
				config={{
					visible: !cullingEnabled,
					listening: !cullingEnabled
				}}
				bind:handle={crossGroup}
			>
				{#each mappedEmbeddings as cross (cross.id)}
					<Cross
						x={cross.x}
						y={cross.y}
						pointId={cross.id}
						color={'black'}
						on:cross-clicked={handleCrossClick}
						on:cross-hovered={handleCrossHover}
						on:cross-unhovered={handleCrossUnhover}
					/>
				{/each}
			</Group>
		{/if}

		{#if cullingEnabled}
			<Group>
				{#each visibleMappedEmbeddings as cross (cross.id)}
					<Cross
						x={cross.x}
						y={cross.y}
						pointId={cross.id}
						color={'black'}
						on:cross-clicked={handleCrossClick}
						on:cross-hovered={handleCrossHover}
						on:cross-unhovered={handleCrossUnhover}
					/>
				{/each}
			</Group>
		{/if}

		<!-- Searches -->
		{#if $searches}
			{#each mappedSearches as search (getSearchKey(search))}
				<!-- Draw one blob around all neighbors in the search -->
				<Blob points={getBlobPoints(search)} color={search.color} />

				{#each search.neighbors as cross}
					<!-- Draw line from searchPoint to neighbor -->
					<LineToCross searchPoint={search.searchPoint} {cross} color={search.color} />

					<Cross
						x={cross.x}
						y={cross.y}
						pointId={cross.id}
						color={search.color}
						on:cross-clicked={handleCrossClick}
						on:cross-hovered={handleCrossHover}
						on:cross-unhovered={handleCrossUnhover}
					/>
				{/each}

				{#if search.searchPoint}
					<Label
						config={{
							x: search.searchPoint[0],
							y: search.searchPoint[1],
							listening: false
						}}
					>
						<Tag
							config={{
								fill: search.color,
								listening: false
							}}
						/>
						<Text
							config={{
								text: search.query,
								fontSize: 12,
								padding: 2,
								fontFamily: 'Times New Roman',
								listening: false,
								x: cullingEnabled || hybridEnabled ? 0 : search.searchPoint[0],
								y: cullingEnabled || hybridEnabled ? 0 : search.searchPoint[1]
							}}
						/>
					</Label>
				{/if}
			{/each}
		{/if}

		<Cross
			x={hoveredPoint?.x ?? 0}
			y={hoveredPoint?.y ?? 0}
			pointId={hoveredPoint?.id ?? -1}
			color={hoveredPoint?.color ?? 'black'}
			hovered={hoveredPoint !== undefined}
			interactive={false}
			visible={hoveredPoint !== undefined}
		/>
	</Layer>

	<Layer bind:handle={CardLayer}>
		<NodeCard
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
