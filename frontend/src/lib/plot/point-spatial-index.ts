import type { Point } from '$lib/types';

export type SpatialPosition = {
	x: number;
	y: number;
};

const DEFAULT_CELL_SIZE = 32;

function getCellCoordinate(value: number, cellSize: number): number {
	return Math.floor(value / cellSize);
}

function getCellKey(x: number, y: number): string {
	return `${x}:${y}`;
}

/**
 * Uniform-grid lookup for world-space plot points.
 *
 * The point coordinates do not change when the stage pans or zooms, so the
 * index can be rebuilt only when the mapped dataset changes. Queries use a
 * caller-provided world-space radius, which keeps the visible hit area fixed
 * in CSS pixels at every stage scale.
 */
export class PointSpatialIndex {
	private points: Point[] = [];
	private readonly cellSize: number;
	private cells = new Map<string, number[]>();

	constructor(points: readonly Point[] = [], cellSize = DEFAULT_CELL_SIZE) {
		this.cellSize = cellSize > 0 && Number.isFinite(cellSize) ? cellSize : DEFAULT_CELL_SIZE;
		this.rebuild(points);
	}

	rebuild(points: readonly Point[]): void {
		this.points = Array.from(points);
		this.cells = new Map();

		this.points.forEach((point, index) => {
			if (!Number.isFinite(point.x) || !Number.isFinite(point.y)) return;

			const cellX = getCellCoordinate(point.x, this.cellSize);
			const cellY = getCellCoordinate(point.y, this.cellSize);
			const key = getCellKey(cellX, cellY);
			const cell = this.cells.get(key);

			if (cell) {
				cell.push(index);
			} else {
				this.cells.set(key, [index]);
			}
		});
	}

	findNearest(position: SpatialPosition, maxDistance: number): Point | undefined {
		if (
			!Number.isFinite(position.x) ||
			!Number.isFinite(position.y) ||
			!Number.isFinite(maxDistance) ||
			maxDistance < 0
		) {
			return undefined;
		}

		const maxDistanceSquared = maxDistance * maxDistance;
		const minCellX = getCellCoordinate(position.x - maxDistance, this.cellSize);
		const maxCellX = getCellCoordinate(position.x + maxDistance, this.cellSize);
		const minCellY = getCellCoordinate(position.y - maxDistance, this.cellSize);
		const maxCellY = getCellCoordinate(position.y + maxDistance, this.cellSize);
		let nearest: Point | undefined;
		let nearestDistanceSquared = maxDistanceSquared;

		for (let cellX = minCellX; cellX <= maxCellX; cellX += 1) {
			for (let cellY = minCellY; cellY <= maxCellY; cellY += 1) {
				const cell = this.cells.get(getCellKey(cellX, cellY));
				if (!cell) continue;

				for (const pointIndex of cell) {
					const point = this.points[pointIndex];
					const deltaX = point.x - position.x;
					const deltaY = point.y - position.y;
					const distanceSquared = deltaX * deltaX + deltaY * deltaY;

					if (
						distanceSquared < nearestDistanceSquared ||
						(distanceSquared === nearestDistanceSquared &&
							(nearest === undefined || point.id < nearest.id))
					) {
						nearest = point;
						nearestDistanceSquared = distanceSquared;
					}
				}
			}
		}

		return nearest;
	}
}

export { DEFAULT_CELL_SIZE };
