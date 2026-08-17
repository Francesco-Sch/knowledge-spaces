declare module 'polygon-offset' {
	type Polygon = number[][];

	export default class Offset {
		data(polygon: Polygon): {
			margin(distance: number): Polygon[];
		};
	}
}
