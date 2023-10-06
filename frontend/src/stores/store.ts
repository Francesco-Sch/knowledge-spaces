import { writable } from 'svelte/store';

// --- Settings components ---
export const selectedDataset = writable(localStorage.getItem('selectedDataset') || 'redpajama');
selectedDataset.subscribe((value) => (localStorage.selectedDataset = value));

export const amountOfNeighbors = writable(localStorage.getItem('amountOfNeighbors') || '5');
amountOfNeighbors.subscribe((value) => (localStorage.amountOfNeighbors = value));

// --- Searches ---
export const searches = writable(JSON.parse(localStorage.getItem('searches') || 'null'));
searches.subscribe((value) => (localStorage.searches = JSON.stringify(value)));
