<script lang="ts">
	import { Layer, Rect } from 'svelte-konva';

	export let width: number;
	export let height: number;
	export let strokes: number;
</script>

<Layer>
	{#each Array.from({ length: strokes }, (_, i) => i) as i}
		{#each Array.from({ length: strokes }, (_, j) => j) as j}
			<Rect
				config={{
					x: (i * width) / strokes,
					y: (j * height) / strokes,
					width: width / strokes,
					height: height / strokes,
					fill: 'transparent',
					stroke: 'white',
					strokeWidth: 1
				}}
			/>
		{/each}
	{/each}
</Layer>
