<script lang="ts">
	import { onMount, tick } from 'svelte';
	import { Stage, Layer, Group, Label, Tag, Text } from 'svelte-konva';
	import Grid from './Grid.svelte';
	import Cross from './Cross.svelte';
	import LineToCross from './LineToCross.svelte';
	import Blob from './Blob.svelte';
	import NodeCard from './NodeCard.svelte';

	import { searches, stageConfig } from '../../stores/store';
	import {
		generateBlobPointsForSearch,
		getSearchesWithMappedEmbeddings,
		mapEmbeddingsToWindowSize,
		zoomToSearchPoint
	} from '../../utils';

	let windowWidth: number, windowHeight: number;
	export let embeddings: Array<Array<number>>;

	$: mappedEmbeddings = mapEmbeddingsToWindowSize(embeddings, windowWidth, windowHeight);
	$: mappedSearches = getSearchesWithMappedEmbeddings(windowWidth, windowHeight);
	$: if ($searches) {
		mappedSearches = getSearchesWithMappedEmbeddings(windowWidth, windowHeight);
	}
	$: if ($searches && $searches.length > 0) {
		const lastSearch = mappedSearches[mappedSearches.length - 1];
		zoomToSearchPoint(lastSearch.searchPoint, windowWidth, windowHeight);
	}

	$: $stageConfig.width = windowWidth;
	$: $stageConfig.height = windowHeight;

	// Cross group
	let crossGroup;

	onMount(() => {
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

	// Zooming
	let scale = 1;
	let scaleBy = 1.15;
	let maxScale = 5;
	let minScale = 0.2;

	function scaleShape(e: {
		detail: { target: { getStage: () => any }; evt: { deltaY: number; ctrlKey: any } };
		preventDefault: () => void;
	}) {
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
	}

	function handleStageClick() {
		NodeCardConfig.display = false;
		CardLayer.draw();
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
		search: {}
	};
	let CardLayer;

	function handleCrossClick(e) {
		// Prevent bubbling
		e.detail.detail.cancelBubble = true;

		const cross = e.detail.detail;

		// Get x and y coordinates of the cross
		const crossX = cross.target.attrs.x + 20;
		const crossY = cross.target.attrs.y;

		const mappedEntryIndex = mappedEmbeddings.findIndex(
			(embedding) => embedding[0] === cross.target.attrs.x && embedding[1] === cross.target.attrs.y
		);
		const embedding = embeddings[mappedEntryIndex];

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
			CardLayer.draw();
		}
	}

	function navigateToNextSearchEntry(ctx) {
		// Prevent bubbling
		ctx.detail.event.detail.cancelBubble = true;

		const currentEmbedding = ctx.detail.embedding;

		// Get the search
		const search = ctx.detail.search;

		// Get the index of the current embedding
		const currentEmbeddingIndex = embeddings.findIndex((embedding) => {
			return (
				embedding[0].toFixed(6) === currentEmbedding.x &&
				embedding[1].toFixed(6) === currentEmbedding.y
			);
		});

		console.log(currentEmbeddingIndex);

		// Get the index of the current embedding in the search
		const currentEmbeddingIndexInSearch = search.neighbors.findIndex(
			(neighbor) => neighbor.corpus_id === currentEmbeddingIndex
		);

		// Get the next embedding in the search
		const nextEmbeddingIndexInSearch = currentEmbeddingIndexInSearch + 1;

		// Get the next embedding
		const nextEmbeddingIndex = search.neighbors[nextEmbeddingIndexInSearch].corpus_id;

		// Get the next embedding coordinates
		const nextEmbedding = mappedEmbeddings[nextEmbeddingIndex];

		// Set the NodeCardConfig
		NodeCardConfig.embedding.id = nextEmbeddingIndex;
		NodeCardConfig.embedding.x = parseFloat(nextEmbedding[0].toFixed(6));
		NodeCardConfig.embedding.y = parseFloat(nextEmbedding[1].toFixed(6));

		// Redraw the layer
		CardLayer.draw();
	}

	function stopPropagation(e) {
		// Prevent bubbling
		e.detail.detail.cancelBubble = true;
	}
</script>

<svelte:window bind:innerWidth={windowWidth} bind:innerHeight={windowHeight} />

<Stage bind:config={$stageConfig} on:wheel={scaleShape} on:click={handleStageClick}>
	<!-- Grid -->
	<!-- <Grid {scale} strokes={20} {windowWidth} {windowHeight} /> -->

	<Layer>
		<!-- Embeddings -->
		<Group bind:handle={crossGroup}>
			{#each mappedEmbeddings as cross}
				<Cross x={cross[0]} y={cross[1]} color={'black'} on:cross-clicked={handleCrossClick} />
			{/each}
		</Group>

		<!-- Searches -->
		{#key mappedSearches}
			{#if $searches}
				{#each mappedSearches as search}
					{#each search.neighbors as cross}
						<!-- Draw the blob around the cross -->
						<Blob points={generateBlobPointsForSearch(search)} color={search.color} />

						<!-- Draw line from searchPoint to neighbor -->
						<LineToCross searchPoint={search.searchPoint} {cross} color={search.color} />

						<Cross
							x={cross[0]}
							y={cross[1]}
							color={search.color}
							on:cross-clicked={handleCrossClick}
						/>
					{/each}

					{#if search.searchPoint}
						<Label
							config={{
								x: search.searchPoint[0],
								y: search.searchPoint[1]
							}}
						>
							<Tag
								config={{
									fill: search.color
								}}
							/>
							<Text
								config={{
									text: search.query,
									fontSize: 12,
									padding: 2,
									fontFamily: 'Times New Roman',
									x: search.searchPoint[0],
									y: search.searchPoint[1]
								}}
							/>
						</Label>
					{/if}
				{/each}
			{/if}
		{/key}
	</Layer>

	<Layer bind:handle={CardLayer}>
		<NodeCard
			display={NodeCardConfig.display}
			x={NodeCardConfig.x}
			y={NodeCardConfig.y}
			color={NodeCardConfig.color}
			embedding={NodeCardConfig.embedding}
			search={NodeCardConfig.search}
			on:card-click={stopPropagation}
			on:next-entry={navigateToNextSearchEntry}
		/>
	</Layer>
</Stage>

<style></style>
