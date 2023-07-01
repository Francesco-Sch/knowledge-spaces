import { writable } from 'svelte/store';

// --- Settings components ---
export const selectedDataset = writable(localStorage.getItem('selectedDataset') || 'redpajama');
selectedDataset.subscribe((value) => (localStorage.selectedDataset = value));

export const neighbors = writable(localStorage.getItem('neighbors') || '5');
neighbors.subscribe((value) => (localStorage.neighbors = value));

// --- Searches ---
export const searchResults = writable(JSON.parse(localStorage.getItem('searchResults') || 'null'));
searchResults.subscribe((value) => (localStorage.searchResults = JSON.stringify(value)));
