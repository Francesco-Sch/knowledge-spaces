<script lang="ts">
	import { Line } from 'svelte-konva';
	import type { Point } from '$lib/types';

	export let searchPoint: Array<number>;
	export let cross: Point;
	export let color: string;

	function computeBow(searchPoint: Array<number>, cross: Point) {
		// Calculate the slope of the line
		const slope = (cross.y - searchPoint[1]) / (cross.x - searchPoint[0]);

		// Calculate the length of the line
		const lineLength = Math.sqrt(
			Math.pow(cross.x - searchPoint[0], 2) + Math.pow(cross.y - searchPoint[1], 2)
		);

		// Calculate the bow magnitude based on line length (adjust the multiplier as needed)
		const bowMagnitude = lineLength * 0.2;

		// Calculate the midpoint and adjust y for the bow effect
		const midX = (searchPoint[0] + cross.x) / 2;
		let midY = (searchPoint[1] + cross.y) / 2;

		// Adjust the bow based on slope and magnitude
		midY += slope > 0 ? -bowMagnitude : bowMagnitude;

		return { midX, midY };
	}

	$: bowedPoint = computeBow(searchPoint, cross);
</script>

<Line
	config={{
		// @ts-ignore
		points: [searchPoint[0], searchPoint[1], bowedPoint.midX, bowedPoint.midY, cross.x, cross.y],
		stroke: color,
		strokeWidth: 2,
		dash: [5, 5],
		tension: 0.5,
		listening: false,
		bezier: true
	}}
/>
