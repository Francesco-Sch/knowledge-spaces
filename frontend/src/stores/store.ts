import { writable, derived } from 'svelte/store';

// --- Settings components ---
export const selectedDataset = writable(localStorage.getItem('selectedDataset') || '20newsgroups');
selectedDataset.subscribe((value) => (localStorage.selectedDataset = value));

export const amountOfNeighbors = writable(localStorage.getItem('amountOfNeighbors') || '5');
amountOfNeighbors.subscribe((value) => (localStorage.amountOfNeighbors = value));

// --- Searches ---
export const searches = writable(JSON.parse(localStorage.getItem('searches') || 'null'));
searches.subscribe((value) => (localStorage.searches = JSON.stringify(value)));

export const getActiveSearches = derived(
	[searches, selectedDataset],
	([$searches, $selectedDataset]) => {
		return $searches && $selectedDataset
			? $searches.filter((search: any) => search.dataset === $selectedDataset)
			: [];
	}
);

// --- Embeddings ---
export const getEmbeddingsFromSearches = derived(getActiveSearches, ($getActiveSearches: any) => {
	return $getActiveSearches.map((search: any) => search.neighbors);
});
