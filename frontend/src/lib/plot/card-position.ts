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

function fitsViewport(
	position: CardPoint,
	size: CardSize,
	viewport: CardViewport,
	margin: number
): boolean {
	return (
		position.x >= margin &&
		position.y >= margin &&
		position.x + size.width <= viewport.width - margin &&
		position.y + size.height <= viewport.height - margin
	);
}

function clampToViewport(
	position: CardPoint,
	size: CardSize,
	viewport: CardViewport,
	margin: number
): CardPoint {
	const maximumX = Math.max(margin, viewport.width - margin - size.width);
	const maximumY = Math.max(margin, viewport.height - margin - size.height);

	return {
		x: clamp(position.x, margin, maximumX),
		y: clamp(position.y, margin, maximumY)
	};
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
	const scale = getCardScale(stageScale);
	const size = {
		width: Math.max(0, finiteOr(unscaledSize.width, CARD_DEFAULT_WIDTH)) * scale,
		height: Math.max(0, finiteOr(unscaledSize.height, CARD_DEFAULT_HEIGHT)) * scale
	};
	const safePoint = {
		x: finiteOr(point.x, 0),
		y: finiteOr(point.y, 0)
	};
	const safeViewport = {
		width: Math.max(0, finiteOr(viewport.width, 0)),
		height: Math.max(0, finiteOr(viewport.height, 0))
	};
	const scaledOffset = Math.max(0, finiteOr(offset, CARD_OFFSET)) * finiteOr(stageScale, 1);

	const candidates = [
		{ x: safePoint.x + scaledOffset, y: safePoint.y },
		{ x: safePoint.x - scaledOffset - size.width, y: safePoint.y },
		{ x: safePoint.x, y: safePoint.y + scaledOffset },
		{ x: safePoint.x, y: safePoint.y - scaledOffset - size.height }
	];
	const fitted = candidates.find((candidate) =>
		fitsViewport(candidate, size, safeViewport, margin)
	);
	const position = fitted ?? clampToViewport(candidates[0], size, safeViewport, margin);

	return {
		x: position.x,
		y: position.y,
		scale
	};
}
