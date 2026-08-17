import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
	CARD_MAX_SCALE,
	CARD_MIN_SCALE,
	getCardPosition,
	getCardScale,
	getCardScreenPoint
} from '../src/lib/plot/card-position.ts';

test('card scale is clamped to the configured zoom range', () => {
	assert.equal(getCardScale(0.2), CARD_MIN_SCALE);
	assert.equal(getCardScale(1), 1);
	assert.equal(getCardScale(2), CARD_MAX_SCALE);
});

test('card screen position follows the world point and stage transform', () => {
	assert.deepEqual(getCardScreenPoint({ x: 100, y: 50 }, { x: 20, y: 30, scale: 1.5 }), {
		x: 170,
		y: 105
	});
});

test('card prefers the right side when it fits', () => {
	const position = getCardPosition(
		{ x: 300, y: 200 },
		{ width: 100, height: 60 },
		{ width: 800, height: 600 },
		1
	);

	assert.deepEqual(position, { x: 320, y: 200, scale: 1 });
});

test('card uses the left side when the right side leaves the viewport', () => {
	const position = getCardPosition(
		{ x: 760, y: 200 },
		{ width: 100, height: 60 },
		{ width: 800, height: 600 },
		1
	);

	assert.deepEqual(position, { x: 640, y: 200, scale: 1 });
});

test('card clamps to the viewport when no side has enough room', () => {
	const position = getCardPosition(
		{ x: 4, y: 4 },
		{ width: 100, height: 60 },
		{ width: 120, height: 90 },
		1
	);

	assert.deepEqual(position, { x: 12, y: 12, scale: 1 });
});

test('card dimensions and offset follow the bounded stage scale', () => {
	const position = getCardPosition(
		{ x: 300, y: 200 },
		{ width: 100, height: 60 },
		{ width: 800, height: 600 },
		1.5
	);

	assert.deepEqual(position, { x: 330, y: 200, scale: 1.5 });
});
