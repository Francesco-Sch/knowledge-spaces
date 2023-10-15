<script lang="ts">
	import type { Context } from 'konva/lib/Context';
	import type { ShapeConfig } from 'konva/lib/Shape';
	import { Shape } from 'svelte-konva';
	import { createEventDispatcher } from 'svelte';

	// ----- Data -----
	export let x: number;
	export let y: number;
	export let color: string;

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

	function handleClick(ctx: { detail: any }) {
		dispatch('cross-clicked', ctx);
	}

	function handleMouseEnter(ctx: { detail: { target: any } }) {
		document.body.style.cursor = 'pointer';
		let cross = ctx.detail.target;

		// Add backdrop shadow to cross
		cross.shadowColor(color);
		cross.shadowBlur(2);
		cross.shadowOffset({ x: 0, y: 0 });
		cross.shadowOpacity(1);

		// Redraw parent layer
		cross.draw();
	}

	function handleMouseLeave(ctx: { detail: { target: any } }) {
		document.body.style.cursor = 'default';
		let cross = ctx.detail.target;

		// Remove backdrop shadow from cross
		cross.shadowColor(undefined);
		cross.shadowBlur(0);
		cross.shadowOffset({ x: 0, y: 0 });
		cross.shadowOpacity(0);

		// Redraw parent layer
		cross.draw();
	}
</script>

<Shape
	on:mouseenter={handleMouseEnter}
	on:mouseleave={handleMouseLeave}
	on:click={handleClick}
	config={{
		sceneFunc: renderCross,
		hitFunc: hitRegion,
		x: x,
		y: y,
		width: 5,
		height: 5,
		stroke: color,
		strokeWidth: 1.5
	}}
/>
