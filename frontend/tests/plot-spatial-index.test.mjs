import assert from 'node:assert/strict';
import test from 'node:test';
import { PointSpatialIndex } from '../src/lib/plot/point-spatial-index.ts';

const points = [
	{ id: 10, x: -64, y: -64 },
	{ id: 20, x: 0, y: 0 },
	{ id: 30, x: 33, y: 2 },
	{ id: 40, x: 96, y: 96 }
];

test('finds the nearest point across positive and negative grid cells', () => {
	const index = new PointSpatialIndex(points, 32);

	assert.deepEqual(index.findNearest({ x: -62, y: -63 }, 8), points[0]);
	assert.deepEqual(index.findNearest({ x: 31, y: 2 }, 8), points[2]);
});

test('does not return points outside the requested radius', () => {
	const index = new PointSpatialIndex(points, 32);

	assert.equal(index.findNearest({ x: 10, y: 10 }, 4), undefined);
	assert.deepEqual(index.findNearest({ x: 10, y: 10 }, 15), points[1]);
});

test('uses the lowest point ID for equal-distance ties', () => {
	const index = new PointSpatialIndex(
		[
			{ id: 8, x: -4, y: 0 },
			{ id: 3, x: 4, y: 0 }
		],
		8
	);

	assert.equal(index.findNearest({ x: 0, y: 0 }, 4)?.id, 3);
});

test('rebuilds after mapped coordinates change', () => {
	const index = new PointSpatialIndex([{ id: 1, x: 0, y: 0 }], 16);

	index.rebuild([{ id: 2, x: 100, y: 100 }]);

	assert.equal(index.findNearest({ x: 0, y: 0 }, 10), undefined);
	assert.equal(index.findNearest({ x: 100, y: 100 }, 1)?.id, 2);
});

test('rejects invalid query positions and radii', () => {
	const index = new PointSpatialIndex(points);

	assert.equal(index.findNearest({ x: Number.NaN, y: 0 }, 10), undefined);
	assert.equal(index.findNearest({ x: 0, y: 0 }, -1), undefined);
	assert.equal(index.findNearest({ x: 0, y: 0 }, Number.POSITIVE_INFINITY), undefined);
});
