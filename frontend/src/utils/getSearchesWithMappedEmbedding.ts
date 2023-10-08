import { get } from 'svelte/store';
import { getActiveSearches } from '../stores/store';
import { mapEmbeddingsToWindowSize } from './mapEmbeddingsToWindowSize';

function getMappedEmbeddings(windowWidth: number, windowHeight: number, search: any) {
	// If neighbors are not set, return
	if (!search.neighbors || search.neighbors.length === 0) return;

	// Turn searhc neighbors into array of arrays based on the x and y value
	const embeddingsArray = search.neighbors.map((neighbor: any) => [neighbor.x, neighbor.y]);

	return mapEmbeddingsToWindowSize(embeddingsArray, windowWidth, windowHeight);
}

const getSearchesWithMappedEmbeddings = (windowWidth: number, windowHeight: number) => {
	const activeSearches = get(getActiveSearches);
	const mappedEmbeddins = activeSearches.map((search: any) =>
		getMappedEmbeddings(windowWidth, windowHeight, search)
	);

	const searchesWithMappedEmbeddings = mappedEmbeddins.map(
		(mappedEmbedding: any, index: number) => {
			if (mappedEmbedding === undefined) return;

			if (activeSearches[index].searchPoint) {
				return {
					...activeSearches[index],
					searchPoint: mapEmbeddingsToWindowSize(
						[[activeSearches[index].searchPoint.x, activeSearches[index].searchPoint.y]],
						windowWidth,
						windowHeight
					)[0],
					neighbors: mappedEmbedding
				};
			}

			return {
				...activeSearches[index],
				neighbors: mappedEmbedding
			};
		}
	);

	return searchesWithMappedEmbeddings.filter((search: any) => search !== undefined);
};

export { getSearchesWithMappedEmbeddings };
