import type { Point } from '$lib/types';
import type { PointSpatialIndex } from './point-spatial-index.ts';

export type PointerPosition = {
	x: number;
	y: number;
};

export type StageTransform = {
	x: number;
	y: number;
	scale: number;
};

const POINTER_HIT_RADIUS_PX = 16;

function getWorldPointerPosition(
	pointer: PointerPosition | null,
	stage: StageTransform
): PointerPosition | undefined {
	if (
		!pointer ||
		!Number.isFinite(pointer.x) ||
		!Number.isFinite(pointer.y) ||
		!Number.isFinite(stage.x) ||
		!Number.isFinite(stage.y) ||
		!Number.isFinite(stage.scale) ||
		stage.scale <= 0
	) {
		return;
	}

	return {
		x: (pointer.x - stage.x) / stage.scale,
		y: (pointer.y - stage.y) / stage.scale
	};
}

function findNearestPoint(
	pointer: PointerPosition | null,
	stage: StageTransform,
	pointSpatialIndex: PointSpatialIndex
): Point | undefined {
	const worldPointerPosition = getWorldPointerPosition(pointer, stage);
	if (!worldPointerPosition) return;

	return pointSpatialIndex.findNearest(worldPointerPosition, POINTER_HIT_RADIUS_PX / stage.scale);
}

export { POINTER_HIT_RADIUS_PX, findNearestPoint, getWorldPointerPosition };
