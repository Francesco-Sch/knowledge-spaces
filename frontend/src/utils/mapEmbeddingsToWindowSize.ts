function map_range(value: number, low1: number, high1: number, low2: number, high2: number) {
	return low2 + ((high2 - low2) * (value - low1)) / (high1 - low1);
}

function mapEmbeddingsToWindowSize(
	embeddings: Array<Array<number>>,
	windowWidth: number,
	windowHeight: number
) {
	return embeddings.map(([x, y]) => [
		map_range(x, -0.1, 0.5, -1000, windowWidth + 1000),
		map_range(y, -0.1, 0.5, -1000, windowHeight + 1000)
	]);
}

export { mapEmbeddingsToWindowSize };
