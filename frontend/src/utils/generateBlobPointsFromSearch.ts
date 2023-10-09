import concaveman from 'concaveman';
import Offset from 'polygon-offset';

function generateBlobPointsForSearch(search) {
	const hull = concaveman(search.neighbors, 1, 1);

	const offset = new Offset();

	const offsetAmount = 50;
	const ofsettedHull = offset.data(hull).arcSegments(10).offset(offsetAmount);

	return ofsettedHull[0].flat();
}

export { generateBlobPointsForSearch };
