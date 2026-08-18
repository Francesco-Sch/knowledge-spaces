export type CardPoint = {
	x: number;
	y: number;
};

export type CardSize = {
	width: number;
	height: number;
};

export type CardViewport = {
	width: number;
	height: number;
};

export type CardTransform = {
	x: number;
	y: number;
	scale: number;
};

export type CardPosition = {
	x: number;
	y: number;
	scale: number;
};

export type CardSide = 'right' | 'left';
export type CardVerticalAnchor = 'top' | 'bottom';

export type CardAnchor = {
	side: CardSide;
	vertical: CardVerticalAnchor;
};

export const CARD_DEFAULT_WIDTH = 325;
export const CARD_DEFAULT_HEIGHT = 100;
export const CARD_OFFSET = 20;
export const CARD_VIEWPORT_MARGIN = 12;
export const CARD_MIN_SCALE = 0.6;
export const CARD_MAX_SCALE = 1.7;

function finiteOr(value: number, fallback: number): number {
	return Number.isFinite(value) ? value : fallback;
}

function clamp(value: number, minimum: number, maximum: number): number {
	return Math.min(maximum, Math.max(minimum, value));
}

function getSafePoint(point: CardPoint): CardPoint {
	return {
		x: finiteOr(point.x, 0),
		y: finiteOr(point.y, 0)
	};
}

function getSafeViewport(viewport: CardViewport): CardViewport {
	return {
		width: Math.max(0, finiteOr(viewport.width, 0)),
		height: Math.max(0, finiteOr(viewport.height, 0))
	};
}

function getScaledCardSize(unscaledSize: CardSize, scale: number): CardSize {
	return {
		width: Math.max(0, finiteOr(unscaledSize.width, CARD_DEFAULT_WIDTH)) * scale,
		height: Math.max(0, finiteOr(unscaledSize.height, CARD_DEFAULT_HEIGHT)) * scale
	};
}

function getScaledOffset(offset: number, stageScale: number): number {
	return Math.max(0, finiteOr(offset, CARD_OFFSET)) * Math.max(0, finiteOr(stageScale, 1));
}

function getHorizontalPosition(
	point: CardPoint,
	size: CardSize,
	side: CardSide,
	scaledOffset: number
): number {
	return side === 'right' ? point.x + scaledOffset : point.x - scaledOffset - size.width;
}

function fitsHorizontally(
	x: number,
	width: number,
	viewport: CardViewport,
	margin: number
): boolean {
	return x >= margin && x + width <= viewport.width - margin;
}

function fitsBelow(
	point: CardPoint,
	size: CardSize,
	viewport: CardViewport,
	margin: number
): boolean {
	return point.y >= margin && point.y + size.height <= viewport.height - margin;
}

function fitsAbove(
	point: CardPoint,
	size: CardSize,
	viewport: CardViewport,
	margin: number
): boolean {
	return point.y - size.height >= margin && point.y <= viewport.height - margin;
}

export function getCardScale(stageScale: number): number {
	return clamp(finiteOr(stageScale, 1), CARD_MIN_SCALE, CARD_MAX_SCALE);
}

export function getCardScreenPoint(point: CardPoint, transform: CardTransform): CardPoint {
	const scale = finiteOr(transform.scale, 1);

	return {
		x: finiteOr(transform.x, 0) + finiteOr(point.x, 0) * scale,
		y: finiteOr(transform.y, 0) + finiteOr(point.y, 0) * scale
	};
}

/**
 * Select the initial side and vertical corner for a card.
 *
 * The right side and downward opening are preferred. If either would leave the
 * initial viewport, the card uses the opposite side or opens upward. When the
 * card cannot fit horizontally, the preferred side is retained and the card is
 * allowed to overflow rather than being clamped to a viewport edge.
 */
export function getCardAnchor(
	point: CardPoint,
	unscaledSize: CardSize = {
		width: CARD_DEFAULT_WIDTH,
		height: CARD_DEFAULT_HEIGHT
	},
	viewport: CardViewport,
	stageScale: number,
	offset = CARD_OFFSET,
	margin = CARD_VIEWPORT_MARGIN
): CardAnchor {
	const scale = getCardScale(stageScale);
	const size = getScaledCardSize(unscaledSize, scale);
	const safePoint = getSafePoint(point);
	const safeViewport = getSafeViewport(viewport);
	const scaledOffset = getScaledOffset(offset, stageScale);
	const rightX = getHorizontalPosition(safePoint, size, 'right', scaledOffset);
	const leftX = getHorizontalPosition(safePoint, size, 'left', scaledOffset);
	const side: CardSide = fitsHorizontally(rightX, size.width, safeViewport, margin)
		? 'right'
		: fitsHorizontally(leftX, size.width, safeViewport, margin)
		? 'left'
		: safeViewport.width - margin - rightX >= leftX - margin
		? 'right'
		: 'left';

	const vertical: CardVerticalAnchor = fitsBelow(safePoint, size, safeViewport, margin)
		? 'top'
		: fitsAbove(safePoint, size, safeViewport, margin)
		? 'bottom'
		: 'top';

	return { side, vertical };
}

/**
 * Return whether a bottom-anchored card can now open downward.
 *
 * This is intentionally a vertical check only. The selected left/right side is
 * preserved after the initial placement, even when later movement makes the
 * card overflow horizontally.
 */
export function canFitCardBelow(
	point: CardPoint,
	unscaledSize: CardSize,
	viewport: CardViewport,
	stageScale: number,
	margin = CARD_VIEWPORT_MARGIN
): boolean {
	const scale = getCardScale(stageScale);
	const size = getScaledCardSize(unscaledSize, scale);
	return fitsBelow(getSafePoint(point), size, getSafeViewport(viewport), margin);
}

export function getCardPositionForAnchor(
	point: CardPoint,
	unscaledSize: CardSize,
	stageScale: number,
	anchor: CardAnchor,
	offset = CARD_OFFSET
): CardPosition {
	const scale = getCardScale(stageScale);
	const size = getScaledCardSize(unscaledSize, scale);
	const safePoint = getSafePoint(point);
	const scaledOffset = getScaledOffset(offset, stageScale);

	return {
		x: getHorizontalPosition(safePoint, size, anchor.side, scaledOffset),
		y: anchor.vertical === 'top' ? safePoint.y : safePoint.y - size.height,
		scale
	};
}

export function getCardPosition(
	point: CardPoint,
	unscaledSize: CardSize = {
		width: CARD_DEFAULT_WIDTH,
		height: CARD_DEFAULT_HEIGHT
	},
	viewport: CardViewport,
	stageScale: number,
	offset = CARD_OFFSET,
	margin = CARD_VIEWPORT_MARGIN
): CardPosition {
	const anchor = getCardAnchor(point, unscaledSize, viewport, stageScale, offset, margin);
	return getCardPositionForAnchor(point, unscaledSize, stageScale, anchor, offset);
}
