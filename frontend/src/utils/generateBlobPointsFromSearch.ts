import concaveman from 'concaveman';
import Offset from 'polygon-offset';
import simplify from 'simplify-js';

function generateBlobPointsForSearch(search) {
	const hull = concaveman(search.neighbors, 1, 1);

	const offset = new Offset();
	const offsetAmount = 50;
	const ofsettedHull = offset.data(hull).margin(offsetAmount);

	// Transform the array in offsettedHull[0] to an array of objects with x and y properties
	const ofsettedHullPoints = ofsettedHull[0].map((point) => {
		return { x: point[0], y: point[1] };
	});

	// Simplify the offsetted hull
	const simplifiedHullPoints = simplify(ofsettedHullPoints, 5, true);

	// Transform the array of objects with x and y properties back to an array of arrays
	const simplifiedHull = simplifiedHullPoints.map((point) => {
		return [point.x, point.y];
	});

	return simplifiedHull.flat();
}

export { generateBlobPointsForSearch };
