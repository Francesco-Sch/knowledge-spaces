import type { Point } from '$lib/types';
import { getSearchesWithMappedEmbeddings, mapEmbeddingsToWindowSize } from '../../utils';

export type SearchNeighbor = {
	corpus_id: number;
	x: number;
	y: number;
};

export type Search = {
	dataset: string;
	query: string;
	searchPoint?: {
		x: number;
		y: number;
	};
	neighbors: SearchNeighbor[];
	color: string;
};

export type MappedSearch = Omit<Search, 'searchPoint' | 'neighbors'> & {
	searchPoint?: [number, number];
	neighbors: Point[];
	key: string;
};

export type Viewport = {
	x: number;
	y: number;
	scale: number;
};

export type HoveredPoint = Point & {
	color: string;
};

export type CardEmbedding = {
	id: number;
	x: number;
	y: number;
};

export type CardConfig = {
	display: boolean;
	x: number;
	y: number;
	color: string;
	embedding: CardEmbedding;
	search: Search | null;
};

function mapEmbeddingsToPoints(
	embeddings: Array<Array<number>>,
	windowWidth: number,
	windowHeight: number
): Point[] {
	return mapEmbeddingsToWindowSize(embeddings, windowWidth, windowHeight).map(
		([x, y], id): Point => ({ id, x, y })
	);
}

function getMappedSearches(windowWidth: number, windowHeight: number): MappedSearch[] {
	const searches = getSearchesWithMappedEmbeddings(windowWidth, windowHeight) as MappedSearch[];

	return searches.map((search: MappedSearch) => ({
		...search,
		key: getSearchKey(search)
	}));
}

function getSearchKey(search: { dataset?: string; query?: string }): string {
	return JSON.stringify([search.dataset ?? '', search.query ?? '']);
}

function getVisiblePoints(
	points: Point[],
	viewport: Viewport,
	width: number,
	height: number
): Point[] {
	const margin = 6;
	const left = -viewport.x / viewport.scale - margin;
	const top = -viewport.y / viewport.scale - margin;
	const right = (width - viewport.x) / viewport.scale + margin;
	const bottom = (height - viewport.y) / viewport.scale + margin;

	return points.filter(
		(point) => point.x >= left && point.x <= right && point.y >= top && point.y <= bottom
	);
}

function getSearchForPoint(searches: Search[] | null | undefined, pointId: number): Search | null {
	return (
		searches?.find((search) =>
			search.neighbors.some((neighbor) => neighbor.corpus_id === pointId)
		) ?? null
	);
}

export {
	getMappedSearches,
	getSearchForPoint,
	getSearchKey,
	getVisiblePoints,
	mapEmbeddingsToPoints
};
