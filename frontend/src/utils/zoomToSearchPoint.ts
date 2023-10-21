import { get } from 'svelte/store';
import { stageConfig } from '../stores/store';

function zoomToSearchPoint(searchPoint, windowWidth, windowHeight) {
	const stage = get(stageConfig);

	console.log('zoomToSearchPoint', searchPoint);

	if (!stage) return; // Exit the function if stage is not yet defined

	const stageScale = 1; // Define the zoom level you want here
	const stageX = windowWidth / 2 - searchPoint[0] * stageScale;
	const stageY = windowHeight / 2 - searchPoint[1] * stageScale;

	stage.x = stageX;
	stage.y = stageY;
	stage.scaleX = stageScale;
	stage.scaleY = stageScale;

	// Update the stage
	stageConfig.set(stage);
}

export { zoomToSearchPoint };
