<script lang="ts">
	import type { Context } from 'konva/lib/Context';
	import type { Shape as KonvaShape } from 'konva/lib/Shape';
	import { Shape } from 'svelte-konva';

	// ----- Data -----
	export let x: number;
	export let y: number;
	export let pointId: number;
	export let color: string;
	export let hovered = false;
	export let visible = true;

	// Function to draw a cross
	function renderCross(context: Context, shape: KonvaShape): void {
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
</script>

<Shape
	config={{
		sceneFunc: renderCross,
		x: x,
		y: y,
		pointId: pointId,
		width: 5,
		height: 5,
		stroke: color,
		strokeWidth: 1.5,
		listening: false,
		visible: visible,
		shadowColor: hovered ? color : undefined,
		shadowBlur: hovered ? 2 : 0,
		shadowOffset: { x: 0, y: 0 },
		shadowOpacity: hovered ? 1 : 0
	}}
/>
