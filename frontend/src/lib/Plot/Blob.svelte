<script>
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
		dash: [10, 10],
		closed: true,
		tension: 0.5
	}}
/>
