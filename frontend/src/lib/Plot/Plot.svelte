<script lang="ts">
	import { Stage, Layer } from 'svelte-konva';
	import Grid from './Grid.svelte';
	import CrossWrapper from './CrossWrapper.svelte';
	import Cross from './Cross.svelte';

	import { searches } from '../../stores/store';
	import { getSearchesWithMappedEmbeddings } from '../../utils/getSearchesWithMappedEmbedding';
	import { mapEmbeddingsToWindowSize } from '../../utils/mapEmbeddingsToWindowSize';
	import { onMount } from 'svelte';

	let windowWidth: number, windowHeight: number;
	export let embeddings: Array<Array<number>>;

	$: mappedEmbeddings = mapEmbeddingsToWindowSize(embeddings, windowWidth, windowHeight);
	$: mappedSearches = getSearchesWithMappedEmbeddings(windowWidth, windowHeight);
	$: if ($searches) {
		console.log('Searches changed');
		console.log(mappedSearches);
		mappedSearches = getSearchesWithMappedEmbeddings(windowWidth, windowHeight);

		console.log(mappedSearches);
	}

	onMount(() => {
		console.log(mappedSearches);
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
</script>

<svelte:window bind:innerWidth={windowWidth} bind:innerHeight={windowHeight} />

<Stage config={{ width: windowWidth, height: windowHeight, draggable: true }} on:wheel={scaleShape}>
	<!-- Grid -->
	<Grid {scale} strokes={20} {windowWidth} />

	<Layer>
		<!-- Embeddings -->
		<!-- {#each mappedEmbeddings as cross}
			<Cross x={cross[0]} y={cross[1]} color={'black'} />
		{/each} -->

		<!-- Searches -->
		{#key mappedSearches}
			{#if $searches}
				{#each mappedSearches as search}
					{#if search.searchPoint}
						<Cross x={search.searchPoint.x} y={search.searchPoint.y} color={'blue'} />
					{/if}
					{#each search.neighbors as cross}
						<div>
							<Cross x={cross[0]} y={cross[1]} color={search.color} />
						</div>
					{/each}
				{/each}
			{/if}
		{/key}
	</Layer>
</Stage>

<style></style>
