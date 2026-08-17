import { get } from 'svelte/store';
import { stageConfig } from '../stores/store';

type SearchPoint = [number, number];

type StageConfig = {
	width: number;
	height: number;
	draggable: boolean;
	x: number;
	y: number;
	scaleX: number;
	scaleY: number;
};

function zoomToSearchPoint(
	searchPoint: SearchPoint | undefined,
	windowWidth: number,
	windowHeight: number
): StageConfig | undefined {
	const stage = get(stageConfig) as StageConfig;

	if (
		!searchPoint ||
		!Number.isFinite(searchPoint[0]) ||
		!Number.isFinite(searchPoint[1]) ||
		!Number.isFinite(windowWidth) ||
		!Number.isFinite(windowHeight)
	) {
		return;
	}

	const stageScale = 1;
	const stageX = windowWidth / 2 - searchPoint[0] * stageScale;
	const stageY = windowHeight / 2 - searchPoint[1] * stageScale;

	// Set a new config object so store subscribers always receive the update.
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
