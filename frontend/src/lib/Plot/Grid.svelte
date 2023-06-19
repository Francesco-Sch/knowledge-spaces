<script lang="ts">
	import { Layer, Line } from 'svelte-konva';

	export let width: number;
	export let height: number;
	export let strokes: number;

	let color: string = '#dbdbdb';
	let dash: Array<number> = [5, 5];

	let grid: Layer;

	function handleLayerCreate(event) {
		grid = event.target as Layer;

		// Set z-index
		grid.zIndex(0);
	}
</script>

<Layer on:created={handleLayerCreate}>
	<!-- Vertical lines -->
	{#each Array.from({ length: strokes + 1 }, (_, i) => i) as i}
		<Line
			config={{
				points: [i * (width / strokes), 0, i * (width / strokes), height],
				stroke: color,
				strokeWidth: 1,
				dash: dash
			}}
		/>
	{/each}

	<!-- Horizontal lines -->
	{#each Array.from({ length: strokes + 1 }, (_, i) => i) as i}
		<Line
			config={{
				points: [0, i * (height / strokes), width, i * (height / strokes)],
				stroke: color,
				strokeWidth: 1,
				dash: dash
			}}
		/>
	{/each}
</Layer>
