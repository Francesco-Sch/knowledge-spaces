<script lang="ts">
	import { Stage, Layer, Rect } from 'svelte-konva';
	import Cross from './Cross.svelte';

	let windowWidth: number, windowHeight: number;
	export let embeddings: Array<Array<number>>;

	// Map embeddings to the window size
	function map_range(value, low1, high1, low2, high2) {
		return low2 + ((high2 - low2) * (value - low1)) / (high1 - low1);
	}

	const mappedEmbeddings = (): Array<Array<number>> => {
		return embeddings.map(([x, y]) => [
			map_range(x, -0.1, 0.5, -1000, windowWidth + 1000),
			map_range(y, -0.1, 0.5, -1000, windowHeight + 1000)
		]);
	};

	// Zooming
	let scaleBy = 1.15;

	function scaleShape(e) {
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
		let direction = e.detail.evt.deltaY > 0 ? 1 : -1;

		// when we zoom on trackpad, e.evt.ctrlKey is true
		// in that case lets revert direction
		if (e.detail.evt.ctrlKey) {
			direction = -direction;
		}

		var newScale = direction > 0 ? oldScale * scaleBy : oldScale / scaleBy;

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
	<!-- Embeddings -->
	<Layer>
		{#each mappedEmbeddings() as cross}
			<Cross x={cross[0]} y={cross[1]} />
		{/each}
	</Layer>
</Stage>

<style></style>
