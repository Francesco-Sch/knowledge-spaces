export type PlotRenderMode = 'cached' | 'vector' | 'adaptive-culling' | 'forced-culling';

export type PointerPosition = {
	x: number;
	y: number;
};

export type ZoomTransform = {
	x: number;
	y: number;
	scale: number;
};

export type StagePosition = {
	x: number;
	y: number;
};

// Keep vector culling active at normal and high zoom. Only use the cached
// base group at very low zoom, where most of the dataset is visible anyway.
const CULLING_ENTER_SCALE = 1.1;
const CULLING_EXIT_SCALE = 1;
const RENDER_MODE_SWITCH_DELAY = 180;

const SCALE_BY = 1.15;
const MAX_SCALE = 5;
const MIN_SCALE = 0.2;
const MIN_INTERACTION_SCALE = 0.8;

function getCullingMode(
	stageScale: number,
	cullingEnabled: boolean,
	forcedCulling: boolean,
	hybridEnabled: boolean
): boolean {
	if (forcedCulling) return true;
	if (!hybridEnabled) return false;

	return cullingEnabled ? stageScale > CULLING_EXIT_SCALE : stageScale >= CULLING_ENTER_SCALE;
}

function getRenderMode(
	cullingEnabled: boolean,
	forcedCulling: boolean,
	cacheRequested: boolean
): PlotRenderMode {
	if (forcedCulling) return 'forced-culling';
	if (cullingEnabled) return 'adaptive-culling';

	return cacheRequested ? 'cached' : 'vector';
}

function getZoomTransformForScale(
	oldScale: number,
	stagePosition: StagePosition,
	pointer: PointerPosition | null,
	targetScale: number
): ZoomTransform | undefined {
	if (!pointer || !Number.isFinite(oldScale) || oldScale <= 0 || !Number.isFinite(targetScale)) {
		return;
	}

	const newScale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, targetScale));
	const mousePointTo = {
		x: (pointer.x - stagePosition.x) / oldScale,
		y: (pointer.y - stagePosition.y) / oldScale
	};

	return {
		x: pointer.x - mousePointTo.x * newScale,
		y: pointer.y - mousePointTo.y * newScale,
		scale: newScale
	};
}

function getZoomTransform(
	oldScale: number,
	stagePosition: StagePosition,
	pointer: PointerPosition | null,
	deltaY: number,
	ctrlKey: boolean
): ZoomTransform | undefined {
	if (!pointer) return;

	let direction = deltaY > 0 ? -1 : 1;

	// When we zoom on a trackpad, evt.ctrlKey is true. In that case, revert the
	// direction so pinch gestures zoom in and out as expected.
	if (ctrlKey) direction = -direction;

	const newScale = direction > 0 ? oldScale * SCALE_BY : oldScale / SCALE_BY;
	return getZoomTransformForScale(oldScale, stagePosition, pointer, newScale);
}

export {
	CULLING_ENTER_SCALE,
	CULLING_EXIT_SCALE,
	MAX_SCALE,
	MIN_INTERACTION_SCALE,
	MIN_SCALE,
	RENDER_MODE_SWITCH_DELAY,
	SCALE_BY,
	getCullingMode,
	getRenderMode,
	getZoomTransform,
	getZoomTransformForScale
};
