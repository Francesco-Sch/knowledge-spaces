import { writable } from 'svelte/store';

// --- Settings components ---
export const selectedDataset = writable('redpajama');
export const neighbors = writable(5);
