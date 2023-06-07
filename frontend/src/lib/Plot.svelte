<script lang="ts">
	import type { Context } from 'konva/lib/Context';
	import type { ShapeConfig } from 'konva/lib/Shape';
	import { Stage, Layer, Rect, Shape } from 'svelte-konva';

	let windowWidth: number, windowHeight: number;
	export let embeddings: Array<Array<number>>;

	function map_range(value, low1, high1, low2, high2) {
		return low2 + ((high2 - low2) * (value - low1)) / (high1 - low1);
	}

	const mappedEmbeddings = (): Array<Array<number>> => {
		return embeddings.map(([x, y]) => [
			map_range(x, -0.1, 0.5, 0, windowWidth),
			map_range(y, -0.1, 0.5, 0, windowHeight)
		]);
	};

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

	// Zooming
	let scaleBy = 1.15;

	function scaleShape(e) {
		let stage = e.detail.target.getStage();

		// stop default scrolling
		e.preventDefault();

		var oldScale = stage.scaleX();
		var pointer = stage.getPointerPosition();

		var mousePointTo = {
			x: (pointer.x - stage.x()) / oldScale,
			y: (pointer.y - stage.y()) / oldScale
		};

		// how to scale? Zoom in? Or zoom out?
		let direction = e.detail.evt.deltaY > 0 ? 1 : -1;

		// when we zoom on trackpad, e.evt.ctrlKey is true
		// in that case lets revert direction
		if (e.detail.evt.ctrlKey) {
			direction = -direction;
		}

		var newScale = direction > 0 ? oldScale * scaleBy : oldScale / scaleBy;

		stage.scale({ x: newScale, y: newScale });

		var newPos = {
			x: pointer.x - mousePointTo.x * newScale,
			y: pointer.y - mousePointTo.y * newScale
		};
		stage.position(newPos);
	}
</script>

<svelte:window bind:innerWidth={windowWidth} bind:innerHeight={windowHeight} />

<Stage config={{ width: windowWidth, height: windowHeight }} on:wheel={scaleShape}>
	<Layer>
		{#each mappedEmbeddings() as cross}
			<Shape
				config={{
					sceneFunc: renderCross,
					x: cross[0],
					y: cross[1],
					width: 5,
					height: 5,
					stroke: 'black',
					strokeWidth: 2
				}}
			/>
		{/each}
	</Layer>
</Stage>

<style></style>
