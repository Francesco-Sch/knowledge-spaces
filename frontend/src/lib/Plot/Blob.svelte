<script lang="ts">
	import { Line } from 'svelte-konva';

	export let points = [];
	export let color = 'black';
</script>

<Line
	config={{
		points: points,
		fill: 'transparent',
		stroke: color,
		strokeWidth: 1,
		opacity: 0.5,
		dash: [5, 5],
		closed: true,
		tension: 0.5,
		listening: false,
		cached: true
	}}
/>
