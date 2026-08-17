<script lang="ts">
	import type { Context } from 'konva/lib/Context';
	import type { ShapeConfig } from 'konva/lib/Shape';
	import { Shape } from 'svelte-konva';
	import { createEventDispatcher } from 'svelte';

	// ----- Data -----
	export let x: number;
	export let y: number;
	export let pointId: number;
	export let color: string;
	export let interactive: boolean = true;
	export let hovered: boolean = false;
	export let visible: boolean = true;

	const dispatch = createEventDispatcher();

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

	// Define hit function
	const padding = 1;
	function hitRegion(context: Context, shape: Shape<ShapeConfig>): void {
		let width = shape.getAttr('width');
		let height = shape.getAttr('height');
		context.beginPath();
		context.rect(
			-width - padding,
			-height - padding,
			2 * width + 2 * padding,
			2 * height + 2 * padding
		);
		context.closePath();
		context.fillStrokeShape(shape);
	}

	const handleClick = (ctx: { detail: any }) => {
		dispatch('cross-clicked', ctx);
	};

	const handleMouseEnter = (ctx: { detail: { target: any } }) => {
		dispatch('cross-hovered', ctx);
	};

	const handleMouseLeave = (ctx: { detail: { target: any } }) => {
		dispatch('cross-unhovered', ctx);
	};
</script>

<Shape
	on:mouseenter={interactive ? handleMouseEnter : undefined}
	on:mouseleave={interactive ? handleMouseLeave : undefined}
	on:click={interactive ? handleClick : undefined}
	config={{
		sceneFunc: renderCross,
		hitFunc: hitRegion,
		x: x,
		y: y,
		pointId: pointId,
		width: 5,
		height: 5,
		stroke: color,
		strokeWidth: 1.5,
		listening: interactive,
		visible: visible,
		shadowColor: hovered ? color : undefined,
		shadowBlur: hovered ? 2 : 0,
		shadowOffset: { x: 0, y: 0 },
		shadowOpacity: hovered ? 1 : 0
	}}
/>
