<script lang="ts">
	import { BASE_URL } from '../../data/config';
	import { Rect, Text } from 'svelte-konva';
	import { createEventDispatcher, afterUpdate } from 'svelte';
	import { selectedDataset } from '../../stores/store';

	const dispatch = createEventDispatcher();

	// ----- Data -----
	export let display: boolean = false;
	export let x: number = 0;
	export let y: number = 0;
	export let color: string = 'black';
	export let embedding = {
		id: 0,
		x: 0,
		y: 0
	};

	// ----- Configs -----
	const padding = 15;

	let rectConfig;
	let coloredRectConfig;
	let coordinatesConfig;
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

		coordinatesConfig = {
			x: x + 30,
			y: y,
			text: `x: ${embedding.x}, y: ${embedding.y}`,
			fontSize: 8,
			fontFamily: 'Helvetica',
			width: 300,
			padding: padding,
			align: 'right'
		};

		textConfig = {
			x: x,
			y: y + 30,
			text: '',
			fontSize: 14,
			fontFamily: 'Helvetica',
			width: 300,
			padding: padding,
			align: 'left'
		};
	}

	// ----- Canvas Objects -----
	let backgroundRect;
	let coloredRect;
	let text;

	afterUpdate(() => {
		if (text) {
			rectConfig.width = text.width() + 2 * padding;
			rectConfig.height = text.height() + 2 * padding;
		}
	});

	// ----- Event Handlers -----
	function handleClick(event) {
		dispatch('card-click', event);
	}

	async function fetchDatasetEntry() {
		const res = await fetch(`${BASE_URL}/dataset-entry/${$selectedDataset}/${embedding.id}`);
		const fetchedText = await res.json();

		textConfig.text = fetchedText;
	}
	$: if (display || embedding.id || x || y) {
		fetchDatasetEntry();
	}
</script>

{#if display}
	<Rect bind:config={rectConfig} bind:handle={backgroundRect} on:click={handleClick} />
	<Rect bind:config={coloredRectConfig} bind:handle={coloredRect} on:click={handleClick} />
	<Text bind:config={coordinatesConfig} on:click={handleClick} />
	<Text bind:config={textConfig} bind:handle={text} on:click={handleClick} />
{/if}
