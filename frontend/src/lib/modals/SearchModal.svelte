<script lang="ts">
	import { fly } from 'svelte/transition';
	import { selectedDataset, neighbors, searchResults } from '../../stores/store';
	import LoadingBar from '$lib/LoadingBar.svelte';

	// provided by <Modals />
	export let isOpen;

	let query: string = '';
	let loading: boolean = false;

	const fetchNN = async () => {
		loading = true;

		console.log('The query is: ' + query);

		const res = await fetch(
			`http://localhost:7100/search/${$selectedDataset}?query=${query}&k=${$neighbors}`
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
		const embeddings_res = await fetch(
			`http://localhost:7100/embeddings/${$selectedDataset}?${ids}`
		);

		const embeddings = await embeddings_res.json();

		embeddings.forEach((embedding: any[], index: string | number) => {
			results[0][index].x = embedding[0];
			results[0][index].y = embedding[1];
		});

		// Add the search result to the search results store
		let searchResult = {
			query: query,
			neighbors: results[0]
		};

		if ($searchResults === null) {
			searchResults.update(() => [searchResult]);
		} else {
			searchResults.update((results) => [...results, searchResult]);
		}

		console.log($searchResults);

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
						class="editorial-new-400"
						autofocus
						on:keydown={(e) => {
							if (e.key === 'Enter') {
								fetchNN();
							}
						}}
					/>
					<button class="editorial-new-400" on:click={fetchNN}>→</button>
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
		color: #cacaca;
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

		transition: all 0.2s ease-in-out;
	}
	.search-wrapper button:hover {
		cursor: pointer;
		text-shadow: var(--hover-text-shadow_black);
	}
</style>
