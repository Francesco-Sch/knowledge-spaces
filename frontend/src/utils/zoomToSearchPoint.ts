import { get } from 'svelte/store';
import { stageConfig } from '../stores/store';

function zoomToSearchPoint(searchPoint, windowWidth, windowHeight) {
	const stage = get(stageConfig);

	console.log('zoomToSearchPoint', searchPoint);

	if (
		!stage ||
		!searchPoint ||
		!Number.isFinite(searchPoint[0]) ||
		!Number.isFinite(searchPoint[1]) ||
		!Number.isFinite(windowWidth) ||
		!Number.isFinite(windowHeight)
	) {
		return;
	}

	const stageScale = 1; // Define the zoom level you want here
	const stageX = windowWidth / 2 - searchPoint[0] * stageScale;
	const stageY = windowHeight / 2 - searchPoint[1] * stageScale;

	// Set a new config object so store subscribers always receive the update
	const nextStage = {
		...stage,
		x: stageX,
		y: stageY,
		scaleX: stageScale,
		scaleY: stageScale
	};
	stageConfig.set(nextStage);

	return nextStage;
}

export { zoomToSearchPoint };
