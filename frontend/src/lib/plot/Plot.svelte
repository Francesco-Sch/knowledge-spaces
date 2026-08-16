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

	let windowWidth: number, windowHeight: number;
	export let embeddings: Array<Array<number>>;
	let cullingEnabled = false;
	let viewport: Viewport = { x: 0, y: 0, scale: 1 };

	$: mappedEmbeddings = mapEmbeddingsToWindowSize(embeddings, windowWidth, windowHeight).map(
		([x, y], id): Point => ({ id, x, y })
	);
	$: mappedSearches = $searches ? getSearchesWithMappedEmbeddings(windowWidth, windowHeight) : [];
	$: visibleMappedEmbeddings = cullingEnabled
		? getVisiblePoints(mappedEmbeddings, viewport, windowWidth, windowHeight)
		: mappedEmbeddings;
	$: if ($searches && $searches.length > 0) {
		const lastSearch = mappedSearches[mappedSearches.length - 1];
		zoomToSearchPoint(lastSearch.searchPoint, windowWidth, windowHeight);
	}

	$: $stageConfig.width = windowWidth;
	$: $stageConfig.height = windowHeight;
	$: if ($stageConfig) {
		viewport = {
			x: $stageConfig.x,
			y: $stageConfig.y,
			scale: $stageConfig.scaleX
		};
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

	// Cross group
	let crossGroup: KonvaGroup | undefined;
	let stageHandle: KonvaStage | undefined;
	let plotProfiler: PlotProfilerHandle | undefined;

	onMount(() => {
		const params = new URLSearchParams(window.location.search);
		cullingEnabled = params.get('plotCull') === '1';
		if (stageHandle) updateViewport(stageHandle);

		const cacheEnabled = params.get('plotCache') !== '0' && !cullingEnabled;
		if (!cacheEnabled) return;

		tick().then(() => {
			if (crossGroup != null) {
				// Check if the group has valid size
				const bbox = crossGroup.getClientRect();
				if (bbox.width > 0 && bbox.height > 0) {
					console.log('Caching crossGroup');
					crossGroup.cache();
				} else {
					console.warn('Group has invalid size. Caching skipped.');
				}
			}
		});
	});

	function handlePointerMove() {
		plotProfiler?.recordPointerEvent();
	}

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

	function updateViewport(stage: KonvaStage) {
		viewport = {
			x: stage.x(),
			y: stage.y(),
			scale: stage.scaleX()
		};
	}

	function handleStageTransform(e: any) {
		updateViewport(e.detail.target.getStage());
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

<svelte:window bind:innerWidth={windowWidth} bind:innerHeight={windowHeight} />

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
		<Group bind:handle={crossGroup}>
			{#each visibleMappedEmbeddings as cross (cross.id)}
				<Cross
					x={cross.x}
					y={cross.y}
					pointId={cross.id}
					color={'black'}
					on:cross-clicked={handleCrossClick}
				/>
			{/each}
		</Group>

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
								x: cullingEnabled ? 0 : search.searchPoint[0],
								y: cullingEnabled ? 0 : search.searchPoint[1]
							}}
						/>
					</Label>
				{/if}
			{/each}
		{/if}
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

<PlotProfiler bind:this={plotProfiler} {stageHandle} />

<style></style>
