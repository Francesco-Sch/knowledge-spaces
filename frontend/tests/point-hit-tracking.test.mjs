import assert from 'node:assert/strict';
import test from 'node:test';
import { PointSpatialIndex } from '../src/lib/plot/point-spatial-index.ts';
import {
	findNearestPoint,
	getWorldPointerPosition,
	POINTER_HIT_RADIUS_PX
} from '../src/lib/plot/point-hit-tracking.ts';

const points = [
	{ id: 1, x: 100, y: 80 },
	{ id: 2, x: 140, y: 120 }
];

test('converts a screen pointer into world coordinates', () => {
	assert.deepEqual(getWorldPointerPosition({ x: 300, y: 240 }, { x: 100, y: 80, scale: 2 }), {
		x: 100,
		y: 80
	});
});

test('finds the nearest point using the stage transform', () => {
	const index = new PointSpatialIndex(points);

	assert.deepEqual(
		findNearestPoint({ x: 302, y: 242 }, { x: 100, y: 80, scale: 2 }, index),
		points[0]
	);
});

test('keeps the hit radius in screen pixels at every scale', () => {
	const index = new PointSpatialIndex([{ id: 1, x: 100, y: 80 }]);

	assert.deepEqual(
		findNearestPoint(
			{ x: 100 + POINTER_HIT_RADIUS_PX - 1, y: 80 },
			{ x: 0, y: 0, scale: 1 },
			index
		),
		{ id: 1, x: 100, y: 80 }
	);
	assert.deepEqual(
		findNearestPoint(
			{ x: 300 + POINTER_HIT_RADIUS_PX - 1, y: 240 },
			{ x: 100, y: 80, scale: 2 },
			index
		),
		{ id: 1, x: 100, y: 80 }
	);
});

test('rejects an invalid stage transform', () => {
	const index = new PointSpatialIndex(points);

	assert.equal(findNearestPoint({ x: 100, y: 80 }, { x: 0, y: 0, scale: 0 }, index), undefined);
});
