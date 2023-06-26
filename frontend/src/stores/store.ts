import { writable } from 'svelte/store';

export const selectedDataset = writable('redpajama');
export const neighbors = writable(5);
