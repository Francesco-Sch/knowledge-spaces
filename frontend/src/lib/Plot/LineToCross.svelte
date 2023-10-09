<script lang="ts">
	import { Line } from 'svelte-konva';

	export let searchPoint: Array<number>;
	export let cross: any;
	export let color: string;

	function computeBow(searchPoint, cross) {
		// Calculate the slope of the line
		const slope = (cross[1] - searchPoint[1]) / (cross[0] - searchPoint[0]);

		// Calculate the length of the line
		const lineLength = Math.sqrt(
			Math.pow(cross[0] - searchPoint[0], 2) + Math.pow(cross[1] - searchPoint[1], 2)
		);

		// Calculate the bow magnitude based on line length (adjust the multiplier as needed)
		const bowMagnitude = lineLength * 0.2;

		// Calculate the midpoint and adjust y for the bow effect
		const midX = (searchPoint[0] + cross[0]) / 2;
		let midY = (searchPoint[1] + cross[1]) / 2;

		// Adjust the bow based on slope and magnitude
		midY += slope > 0 ? -bowMagnitude : bowMagnitude;

		return { midX, midY };
	}
</script>

<Line
	config={{
		// @ts-ignore
		points: [
			searchPoint[0],
			searchPoint[1],
			computeBow(searchPoint, cross).midX,
			computeBow(searchPoint, cross).midY,
			cross[0],
			cross[1]
		],
		stroke: color,
		strokeWidth: 2,
		dash: [5, 5],
		tension: 0.5,
		bezier: true
	}}
/>
