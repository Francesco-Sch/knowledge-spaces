import { get } from 'svelte/store';
import { getEmbeddingsFromSearches } from '../stores/store';
import { mapEmbeddingsToWindowSize } from './mapEmbeddingsToWindowSize';

function getMappedSearchEmbeddings(windowWidth: number, windowHeight: number) {
	console.log('getEmbeddingsFromSearches', get(getEmbeddingsFromSearches));

	// Turn objects from get(getEmbeddingsFromSearches) into array of arrays based on the x and y value
	const embeddingsArray = get(getEmbeddingsFromSearches)[0].map((embedding: any) => [
		embedding.x,
		embedding.y
	]);

	return {
		coordinates: mapEmbeddingsToWindowSize(embeddingsArray, windowWidth, windowHeight)
	};
}

export { getMappedSearchEmbeddings };
