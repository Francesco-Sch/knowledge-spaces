<script lang="ts">
	import { Rect, Text } from 'svelte-konva';
	import { createEventDispatcher } from 'svelte';

	// ----- Data -----
	export let display: boolean = false;
	export let x: number = 0;
	export let y: number = 0;
	export let color: string = 'black';

	const dispatch = createEventDispatcher();

	// ----- Configs -----
	const padding = 15;

	let rectConfig;
	let coloredRectConfig;
	let textConfig;

	$: {
		rectConfig = {
			x: x,
			y: y,
			width: 300,
			height: 0,
			fill: 'white'
		};

		coloredRectConfig = {
			x: x + padding,
			y: y + padding,
			width: 10,
			height: 10,
			fill: color
		};

		textConfig = {
			x: x,
			y: y + 20,
			text: "COMPLEX TEXT\n\nAll the world's a stage, and all the men and women merely players. They have their exits and their entrances.",
			fontSize: 14,
			fontFamily: 'Arial',
			width: 300,
			padding: padding,
			align: 'left'
		};
	}

	// ----- Canvas Objects -----
	let backgroundRect;
	let coloredRect;
	let text;

	$: if (text && x && y) {
		rectConfig.width = text.width() + 2 * padding;
		rectConfig.height = text.height() + 2 * padding;
	}

	function handleClick(event) {
		dispatch('card-click', event);
	}
</script>

{#if display}
	<Rect bind:config={rectConfig} bind:handle={backgroundRect} on:click={handleClick} />
	<Rect bind:config={coloredRectConfig} bind:handle={coloredRect} on:click={handleClick} />
	<Text bind:config={textConfig} bind:handle={text} on:click={handleClick} />
{/if}
