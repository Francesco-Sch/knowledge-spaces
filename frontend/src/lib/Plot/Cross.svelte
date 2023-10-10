<script lang="ts">
	import type { Context } from 'konva/lib/Context';
	import type { ShapeConfig } from 'konva/lib/Shape';
	import { Shape } from 'svelte-konva';

	import { openModal } from 'svelte-modals';
	import ContentModal from '$lib/modals/ContentModal.svelte';

	// ----- Data -----
	export let x: number;
	export let y: number;
	export let color: string;

	// Function to draw a cross
	function renderCross(context: Context, shape: Shape<ShapeConfig>): void {
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

	function handleClick(e) {
		openModal(ContentModal, { x: e.detail.target, y });
	}
</script>

<Shape
	on:click={handleClick}
	config={{
		sceneFunc: renderCross,
		x: x,
		y: y,
		width: 5,
		height: 5,
		stroke: color,
		strokeWidth: 1.5
	}}
/>
