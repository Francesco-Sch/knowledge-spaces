<script lang="ts">
	import { fly } from 'svelte/transition';
	import { BASE_URL } from '../../data/config';
	import { selectedDataset, amountOfNeighbors, searches } from '../../stores/store';
	import LoadingBar from '$lib/LoadingBar.svelte';
	import { getRandomColor } from '../../utils/getRandomColor';

	// provided by <Modals />
	export let isOpen: boolean = false;

	let query: string = '';
	let loading: boolean = false;

	const fetchNN = async () => {
		loading = true;

		console.log('The query is: ' + query);

		const res = await fetch(
			`${BASE_URL}/search/${$selectedDataset}?query=${query}&k=${$amountOfNeighbors}`
		);

		const results = await res.json();

		// Check if there are any results
		if (results.length === 0) {
			console.log('No results found');
			loading = false;
			return;
		}

		// Prepare id query string
		let ids = results[0].map((id: { corpus_id: any }) => `ids=${id.corpus_id}`).join('&');

		// Fetch the embeddings for the ids
		const embeddings_res = await fetch(`${BASE_URL}/embeddings/${$selectedDataset}?${ids}`);

		const embeddings = await embeddings_res.json();

		embeddings.forEach((embedding: any[], index: string | number) => {
			results[0][index].x = embedding[0];
			results[0][index].y = embedding[1];
		});

		// Create a random point that is in close proximity to the embeddings
		let sumX = 0;
		let sumY = 0;

		embeddings.forEach((embedding: any[]) => {
			sumX += embedding[0];
			sumY += embedding[1];
		});

		const centroid = {
			x: sumX / embeddings.length,
			y: sumY / embeddings.length
		};

		function randomInRange(min: number, max: number): number {
			return Math.random() * (max - min) + min;
		}

		const offsetRange = 0.05;
		const randomPoint = {
			x: centroid.x + randomInRange(-offsetRange, offsetRange),
			y: centroid.y + randomInRange(-offsetRange, offsetRange)
		};

		// Add the search result to the search results store
		let searchResult = {
			dataset: $selectedDataset,
			query: query,
			searchPoint: randomPoint,
			neighbors: results[0],
			color: getRandomColor()
		};

		if ($searches === null) {
			searches.update(() => [searchResult]);
		} else {
			searches.update((results) => [...results, searchResult]);
		}

		loading = false;
		isOpen = false;
	};
</script>

{#if isOpen}
	<div role="dialog" class="modal" transition:fly={{ y: -10, duration: 500 }}>
		<div class="contents">
			{#if loading}
				<!-- Loading state -->
				<div class="loading">
					<LoadingBar {loading} />
				</div>
			{:else}
				<!-- Search input -->
				<div class="search-wrapper">
					<!-- svelte-ignore a11y-autofocus -->
					<input
						bind:value={query}
						type="text"
						placeholder="Enter your search term"
						class="times-400"
						autofocus
						on:keydown={(e) => {
							if (e.key === 'Enter') {
								fetchNN();
							}
						}}
					/>
					<button class="times-400" on:click={fetchNN}>→</button>
				</div>
			{/if}
		</div>
	</div>
{/if}

<style>
	.modal {
		position: fixed;
		top: 0;
		bottom: 0;
		right: 0;
		left: 0;
		z-index: 100;
		display: flex;
		justify-content: center;
		align-items: center;

		/* allow click-through to backdrop */
		pointer-events: none;
	}

	.contents {
		display: flex;
		flex-direction: row;
		justify-content: space-between;
		padding: 1rem;

		background-color: white;
		box-shadow: 0px 0px 40px 0px rgba(0, 0, 0, 1);

		pointer-events: auto;
	}

	/* Loading state */
	.loading {
		display: flex;
		width: 30vw;
		height: 100%;
	}

	/* Search input */
	.search-wrapper {
		display: flex;
		width: 100%;
		height: 100%;
	}

	.search-wrapper input {
		font-size: 3rem;

		border: none;
	}
	.search-wrapper input::placeholder {
		color: var(--text-secondary);
	}
	.search-wrapper input:focus {
		outline: none;
	}

	.search-wrapper button {
		width: 100%;
		height: auto;
		padding: 0;
		border: none;
		background: none;
		aspect-ratio: 1 / 1;

		font-size: 3rem;
		line-height: 100%;

		transition: all 0.2s ease-in-out;
	}
	.search-wrapper button:hover {
		cursor: pointer;
		text-shadow: var(--hover-text-shadow_black);
	}
</style>
