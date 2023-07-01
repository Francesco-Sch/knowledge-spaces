import { writable } from 'svelte/store';

// --- Settings components ---
export const selectedDataset = writable('redpajama');
export const neighbors = writable(5);

// --- Searches ---
export const searchResults = writable(JSON.parse(localStorage.getItem('searchResults') || 'null'));
searchResults.subscribe((value) => (localStorage.searchResults = JSON.stringify(value)));
