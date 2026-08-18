import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
	CARD_MAX_SCALE,
	CARD_MIN_SCALE,
	canFitCardBelow,
	getCardAnchor,
	getCardPosition,
	getCardPositionForAnchor,
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

test('card opens upward near the bottom while keeping its preferred side', () => {
	const position = getCardPosition(
		{ x: 300, y: 580 },
		{ width: 100, height: 60 },
		{ width: 800, height: 600 },
		1
	);

	assert.deepEqual(position, { x: 320, y: 520, scale: 1 });
});

test('card uses the left bottom corner when the cross is too far right', () => {
	const position = getCardPosition(
		{ x: 760, y: 580 },
		{ width: 100, height: 60 },
		{ width: 800, height: 600 },
		1
	);

	assert.deepEqual(position, { x: 640, y: 520, scale: 1 });
});

test('card keeps its top anchor near the top edge', () => {
	const position = getCardPosition(
		{ x: 300, y: 4 },
		{ width: 100, height: 60 },
		{ width: 800, height: 600 },
		1
	);

	assert.deepEqual(position, { x: 320, y: 4, scale: 1 });
});

test('card uses the left top corner when the cross is too far right', () => {
	const position = getCardPosition(
		{ x: 760, y: 4 },
		{ width: 100, height: 60 },
		{ width: 800, height: 600 },
		1
	);

	assert.deepEqual(position, { x: 640, y: 4, scale: 1 });
});

test('card keeps the correct side and overflows when the viewport is too narrow', () => {
	const position = getCardPosition(
		{ x: 4, y: 300 },
		{ width: 100, height: 60 },
		{ width: 120, height: 600 },
		1
	);

	assert.deepEqual(position, { x: 24, y: 300, scale: 1 });
});

test('card keeps the left side when a narrow viewport is tight on the right', () => {
	const position = getCardPosition(
		{ x: 116, y: 300 },
		{ width: 100, height: 60 },
		{ width: 120, height: 600 },
		1
	);

	assert.deepEqual(position, { x: -4, y: 300, scale: 1 });
});

test('bottom anchoring can transition once the card fits below the cross', () => {
	const anchor = getCardAnchor(
		{ x: 300, y: 580 },
		{ width: 100, height: 60 },
		{ width: 800, height: 600 },
		1
	);

	assert.deepEqual(anchor, { side: 'right', vertical: 'bottom' });
	assert.equal(
		canFitCardBelow({ x: 300, y: 580 }, { width: 100, height: 60 }, { width: 800, height: 600 }, 1),
		false
	);
	assert.equal(
		canFitCardBelow({ x: 300, y: 300 }, { width: 100, height: 60 }, { width: 800, height: 600 }, 1),
		true
	);
	assert.deepEqual(
		getCardPositionForAnchor({ x: 300, y: 300 }, { width: 100, height: 60 }, 1, {
			side: 'right',
			vertical: 'top'
		}),
		{ x: 320, y: 300, scale: 1 }
	);
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
