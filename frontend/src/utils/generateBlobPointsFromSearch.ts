import concaveman from 'concaveman';
import Offset from 'polygon-offset';
import simplify from 'simplify-js';
import type { Point } from '$lib/types';

type BlobSearch = {
	neighbors: Point[];
	searchPoint?: [number, number];
};

function generateBlobPointsForSearch(search: BlobSearch): number[] {
	if (!search.searchPoint) return [];

	const neighborCoordinates = search.neighbors.map((neighbor: Point) => [neighbor.x, neighbor.y]);
	const hull = concaveman(neighborCoordinates.concat([search.searchPoint]), 1, 1);

	const offset = new Offset();
	const offsetAmount = 50;
	const offsettedHull = offset.data(hull).margin(offsetAmount);

	// Transform the first offset polygon into objects with x and y properties.
	const offsettedHullPoints = offsettedHull[0].map((point: number[]) => {
		return { x: point[0], y: point[1] };
	});

	// Simplify the offset polygon.
	const simplifiedHullPoints = simplify(offsettedHullPoints, 5, true);

	// Transform the simplified points back into a flat array for Konva.
	return simplifiedHullPoints.flatMap((point) => [point.x, point.y]);
}

export { generateBlobPointsForSearch };
