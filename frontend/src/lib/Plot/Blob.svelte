<script lang="ts">
	import { Line } from 'svelte-konva';

	export let points = [];
	export let color = 'black';
</script>

<Line
	config={{
		points: points,
		stroke: color,
		strokeWidth: 1,
		dash: [5, 5],
		closed: true,
		tension: 0.5,
		listening: false,
		cached: true
	}}
/>
