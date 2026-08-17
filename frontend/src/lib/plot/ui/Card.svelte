<script lang="ts">
	import { afterUpdate, createEventDispatcher } from 'svelte';
	import type { Text as KonvaText } from 'konva/lib/shapes/Text';
	import { Group, Rect, Text } from 'svelte-konva';
	import { selectedDataset } from '../../../stores/store';
	import type { CardEmbedding } from '../plot-data';

	const dispatch = createEventDispatcher();

	// ----- Data -----
	export let display = false;
	export let x = 0;
	export let y = 0;
	export let color = 'black';
	export let embedding: CardEmbedding = {
		id: 0,
		x: 0,
		y: 0
	};

	// ----- Configs -----
	const padding = 15;

	let rectConfig: { width: number; height: number; x?: number; y?: number; fill?: string };
	let coloredRectConfig: { x: number; y: number; width: number; height: number; fill: string };
	let coordinatesConfig: {
		x: number;
		y: number;
		text: string;
		fontSize: number;
		fontFamily: string;
		width: number;
		padding: number;
		align: string;
	};
	let textConfig: {
		text: string;
		x?: number;
		y?: number;
		fontSize?: number;
		fontFamily?: string;
		width?: number;
		padding?: number;
		align?: string;
	};

	$: {
		rectConfig = {
			x: x,
			y: y,
			width: 325,
			height: 100,
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
	let text: KonvaText | undefined;

	afterUpdate(() => {
		if (text) {
			rectConfig.width = text.width() + 2 * padding;
			rectConfig.height = text.height() + 2 * padding;
		}
	});

	// ----- Event Handlers -----
	function handleClick(event: CustomEvent) {
		dispatch('card-click', event);
	}

	async function fetchDatasetEntry() {
		setTimeout(() => {
			textConfig.text = 'Loading...';
		}, 1);

		const res = await fetch(
			`/api/dataset-entry?dataset=${$selectedDataset}&embedding=${embedding.id}`
		);
		const fetchedText = await res.json();

		textConfig.text = fetchedText;
	}
	$: if (display) {
		fetchDatasetEntry();
	}
</script>

{#if display}
	<Group>
		<Rect bind:config={rectConfig} on:click={handleClick} on:tap={handleClick} />
		<Rect bind:config={coloredRectConfig} on:click={handleClick} on:tap={handleClick} />
		<Text bind:config={coordinatesConfig} on:click={handleClick} on:tap={handleClick} />
		<Text bind:config={textConfig} bind:handle={text} on:click={handleClick} on:tap={handleClick} />
	</Group>
{/if}
