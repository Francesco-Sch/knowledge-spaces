<script lang="ts">
	import { Layer, Line } from 'svelte-konva';

	export let scale: number;
	export let strokes: number;
	export let windowWidth: number;

	let color: string = '#dbdbdb';
	let dash: Array<number> = [5, 5];
	let grid: Layer;

	$: size = scale * windowWidth;

	function handleLayerCreate(event: CustomEvent<Layer>) {
		grid = event.detail;

		// Set z-index
		grid.zIndex(0);
	}
</script>

<Layer on:created={handleLayerCreate}>
	<!-- Vertical lines -->
	{#each Array.from({ length: strokes + 1 }, (_, i) => i) as i}
		<Line
			config={{
				points: [i * (size / strokes), 0, i * (size / strokes), size],
				stroke: color,
				strokeWidth: 1,
				dash: dash,
				width: size / strokes,
				height: size / strokes
			}}
		/>
	{/each}

	<!-- Horizontal lines -->
	{#each Array.from({ length: strokes + 1 }, (_, i) => i) as i}
		<Line
			config={{
				points: [0, i * (size / strokes), size, i * (size / strokes)],
				stroke: color,
				strokeWidth: 1,
				dash: dash,
				width: size / strokes,
				height: size / strokes
			}}
		/>
	{/each}
</Layer>
