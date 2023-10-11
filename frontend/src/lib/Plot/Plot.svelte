<script lang="ts">
	import { Stage, Layer, Label, Tag, Text } from 'svelte-konva';
	import Grid from './Grid.svelte';
	import Cross from './Cross.svelte';
	import LineToCross from './LineToCross.svelte';
	import Blob from './Blob.svelte';
	import NodeCard from './NodeCard.svelte';

	import { searches } from '../../stores/store';
	import {
		generateBlobPointsForSearch,
		getSearchesWithMappedEmbeddings,
		mapEmbeddingsToWindowSize
	} from '../../utils';

	let windowWidth: number, windowHeight: number;
	export let embeddings: Array<Array<number>>;

	$: console.log(embeddings);

	$: mappedEmbeddings = mapEmbeddingsToWindowSize(embeddings, windowWidth, windowHeight);
	$: mappedSearches = getSearchesWithMappedEmbeddings(windowWidth, windowHeight);
	$: if ($searches) {
		mappedSearches = getSearchesWithMappedEmbeddings(windowWidth, windowHeight);
	}
	$: if ($searches && $searches.length > 0) {
		const lastSearch = mappedSearches[mappedSearches.length - 1];
		zoomToSearchPoint(lastSearch.searchPoint);
	}

	let stageConfig = {
		width: 0,
		height: 0,
		draggable: true,
		x: 0,
		y: 0,
		scaleX: 1,
		scaleY: 1
	};
	$: stageConfig.width = windowWidth;
	$: stageConfig.height = windowHeight;

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

	function zoomToSearchPoint(searchPoint) {
		if (!stageConfig) return; // Exit the function if stage is not yet defined

		const stageScale = 1; // Define the zoom level you want here
		const stageX = windowWidth / 2 - searchPoint[0] * stageScale;
		const stageY = windowHeight / 2 - searchPoint[1] * stageScale;

		stageConfig.x = stageX;
		stageConfig.y = stageY;
		stageConfig.scaleX = stageScale;
		stageConfig.scaleY = stageScale;
	}

	function handleStageClick() {
		NodeCardConfig.display = false;
		CardLayer.draw();
	}

	let NodeCardConfig = {
		display: false,
		x: 0,
		y: 0,
		color: 'black'
	};
	let CardLayer;

	function handleCrossClick(e) {
		// Prevent bubbling
		e.detail.detail.cancelBubble = true;

		const cross = e.detail.detail;

		console.log('Cross clicked', cross);

		// Get x and y coordinates of the cross
		const crossX = cross.target.attrs.x + 20;
		const crossY = cross.target.attrs.y;

		// Set the NodeCardConfig
		NodeCardConfig.display = true;
		NodeCardConfig.x = crossX;
		NodeCardConfig.y = crossY;
		NodeCardConfig.color = cross.target.attrs.stroke;

		// Redraw the layer
		CardLayer.draw();
	}

	function stopPropagation(e) {
		// Prevent bubbling
		e.detail.detail.cancelBubble = true;
	}
</script>

<svelte:window bind:innerWidth={windowWidth} bind:innerHeight={windowHeight} />

<Stage bind:config={stageConfig} on:wheel={scaleShape} on:click={handleStageClick}>
	<!-- Grid -->
	<!-- <Grid {scale} strokes={20} {windowWidth} {windowHeight} /> -->

	<Layer>
		<!-- Embeddings -->
		{#each mappedEmbeddings as cross, i}
			<Cross x={cross[0]} y={cross[1]} color={'black'} on:cross-clicked={handleCrossClick} />
		{/each}

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
									fontFamily: 'Editorial New',
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
			on:card-click={stopPropagation}
		/>
	</Layer>
</Stage>

<style></style>
