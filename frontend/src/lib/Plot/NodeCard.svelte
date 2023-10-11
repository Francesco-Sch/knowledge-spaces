<script lang="ts">
	import { Rect, Text } from 'svelte-konva';
	import { createEventDispatcher } from 'svelte';
	import { selectedDataset } from '../../stores/store';

	// ----- Data -----
	export let display: boolean = false;
	export let x: number = 0;
	export let y: number = 0;
	export let color: string = 'black';
	export let id: number = 0;

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
			text: '',
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

	$: if (text) {
		rectConfig.width = text.width() + 2 * padding;
		rectConfig.height = text.height() + 2 * padding;
	}

	function handleClick(event) {
		dispatch('card-click', event);
	}

	async function fetchDatasetEntry() {
		const res = await fetch(`http://localhost:7100/dataset-entry/${$selectedDataset}/${id}`);

		const text = await res.json();

		textConfig.text = text;
	}

	$: if (display || id || x || y) {
		fetchDatasetEntry();
	}
</script>

{#if display}
	<Rect bind:config={rectConfig} bind:handle={backgroundRect} on:click={handleClick} />
	<Rect bind:config={coloredRectConfig} bind:handle={coloredRect} on:click={handleClick} />
	<Text bind:config={textConfig} bind:handle={text} on:click={handleClick} />
{/if}
