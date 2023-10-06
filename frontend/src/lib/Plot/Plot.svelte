<script lang="ts">
	import { Stage, Layer } from 'svelte-konva';
	import { searchResults } from '../../stores/store';
	import Grid from './Grid.svelte';
	import Cross from './Cross.svelte';

	let windowWidth: number, windowHeight: number;
	export let embeddings: Array<Array<number>>;

	// Map embeddings to the window size
	function map_range(value: number, low1: number, high1: number, low2: number, high2: number) {
		return low2 + ((high2 - low2) * (value - low1)) / (high1 - low1);
	}

	const mappedEmbeddings = (): Array<Array<number>> => {
		return embeddings.map(([x, y]) => [
			map_range(x, -0.1, 0.5, -1000, windowWidth + 1000),
			map_range(y, -0.1, 0.5, -1000, windowHeight + 1000)
		]);
	};

	const mappedNeighbors = (): Array<{ x: number; y: number; color: string }> => {
		if ($searchResults === null) return [];

		const mappedResults = $searchResults.map((search, index: number) => {
			// Add x,y and color to each neighbor per result
			return search.neighbors.map((neighbor: any) => {
				return {
					x: map_range(neighbor.x, -0.1, 0.5, -1000, windowWidth + 1000),
					y: map_range(neighbor.y, -0.1, 0.5, -1000, windowHeight + 1000),
					color: `green`
				};
			});
		});

		return mappedResults;
	};

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
		<!-- Neighbors -->

		{#each mappedNeighbors() as cross}
			<p>{cross.color}</p>
			<Cross x={cross.x} y={cross.y} color={cross.color} />
		{/each}

		<!-- Embeddings -->
		<!-- {#each mappedEmbeddings() as cross}
			<Cross x={cross[0]} y={cross[1]} color={'red'} />
		{/each} -->
	</Layer>
</Stage>

<style></style>
