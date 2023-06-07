<script lang="ts">
	import type { Context } from 'konva/lib/Context';
	import type { ShapeConfig } from 'konva/lib/Shape';
	import { onMount } from 'svelte';
	import { Stage, Layer, Rect, Shape } from 'svelte-konva';

	let windowWidth: number, windowHeight: number;
	export let data: Array<Array<number>>;

	// Function to draw a cross
	function cross(context: Context, shape: Shape<ShapeConfig>): void {
		let width = shape.getAttr('width');
		let height = shape.getAttr('height');

		// Begin drawing the cross
		context.beginPath();

		// Move to the top-left corner of the cross
		context.moveTo(-width, -height);

		// Draw the horizontal line
		context.lineTo(width, height);

		// Move to the center of the cross
		context.moveTo(width, -height);

		// Draw the vertical line
		context.lineTo(-width, height);

		// Close the path
		context.closePath();

		// Stroke the path to render the cross
		context.stroke();

		context.fillStrokeShape(shape);
	}

	onMount(() => {});
</script>

<svelte:window bind:innerWidth={windowWidth} bind:innerHeight={windowHeight} />

<Stage config={{ width: windowWidth, height: windowHeight }}>
	<Layer>
		<Shape
			config={{
				sceneFunc: cross,
				x: 100,
				y: 100,
				width: 5,
				height: 5,
				stroke: 'black',
				strokeWidth: 2
			}}
		/>
	</Layer>
</Stage>

<style></style>
