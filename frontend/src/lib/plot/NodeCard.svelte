<script lang="ts">
	import { BASE_URL } from '../../data/config';
	import { Rect, Text, Group } from 'svelte-konva';
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
	export let search = {};

	// ----- Configs -----
	const padding = 15;

	let rectConfig: { width: any; height: any; x?: number; y?: number; fill?: string };
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
		text: any;
		x?: number;
		y?: number;
		fontSize?: number;
		fontFamily?: string;
		width?: number;
		padding?: number;
		align?: string;
	};
	let nextSearchEntryConfig: {
		x: number;
		y: number;
		text: string;
		fontSize: number;
		fontFamily: string;
		padding: number;
		align: string;
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

		nextSearchEntryConfig = {
			x: x + rectConfig.width,
			y: y + rectConfig.height,
			text: `→`,
			fontSize: 24,
			fontFamily: 'Helvetica',
			padding: 0,
			align: 'right'
		};
	}

	// ----- Canvas Objects -----
	let text: any;

	afterUpdate(() => {
		if (text) {
			rectConfig.width = text.width() + 2 * padding;
			rectConfig.height = text.height() + 2 * padding;
		} else if (text && search) {
			rectConfig.width = text.width() + 3 * padding;
			rectConfig.height = text.height() + 3 * padding;
		}
	});

	// ----- Event Handlers -----
	function handleClick(event) {
		dispatch('card-click', event);
	}

	async function fetchDatasetEntry() {
		setTimeout(() => {
			textConfig.text = 'Loading...';
		}, 1);

		const res = await fetch(`${BASE_URL}/dataset-entry/${$selectedDataset}/${embedding.id}`);
		const fetchedText = await res.json();

		textConfig.text = fetchedText;
	}
	$: if (display) {
		fetchDatasetEntry();
	}

	function navigateToNextSearchEntry(event) {
		dispatch('next-entry', { event: event, embedding: embedding, search: search });
	}
</script>

{#if display}
	<Group>
		<Rect bind:config={rectConfig} on:click={handleClick} />
		<Rect bind:config={coloredRectConfig} on:click={handleClick} />
		<Text bind:config={coordinatesConfig} on:click={handleClick} />
		<Text bind:config={textConfig} bind:handle={text} on:click={handleClick} />

		{#if search != null}
			<!-- To the next entry -->
			<Text bind:config={nextSearchEntryConfig} on:click={navigateToNextSearchEntry} />
		{/if}
	</Group>
{/if}
