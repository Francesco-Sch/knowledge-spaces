export type PlotProfilerSnapshot = {
	fps: number;
	averageFrameTime: number;
	p95FrameTime: number;
	pointerEvents: number;
	wheelEvents: number;
	averageInputLatency: number;
	p95InputLatency: number;
	blobCount: number;
	blobTime: number;
	konvaNodeCount: number;
	jsHeapUsed: number | null;
};

type PlotProfilerOptions = {
	onSnapshot: (snapshot: PlotProfilerSnapshot) => void;
	getKonvaNodeCount: () => number;
};

type PerformanceWithMemory = Performance & {
	memory?: {
		usedJSHeapSize: number;
	};
};

const SAMPLE_INTERVAL = 500;

function percentile(values: number[], percentileValue: number): number {
	if (values.length === 0) return 0;

	const sortedValues = [...values].sort((a, b) => a - b);
	const index = Math.min(
		sortedValues.length - 1,
		Math.ceil((percentileValue / 100) * sortedValues.length) - 1
	);

	return sortedValues[index];
}

function createPlotProfiler({ onSnapshot, getKonvaNodeCount }: PlotProfilerOptions) {
	let animationFrame: number | undefined;
	let snapshotTimer: number | undefined;
	let previousFrameTime: number | undefined;
	let intervalStart = 0;
	let frameTimes: number[] = [];
	let pendingInputEvents: number[] = [];
	let inputLatencies: number[] = [];
	let pointerEvents = 0;
	let wheelEvents = 0;
	let blobCount = 0;
	let blobTime = 0;
	let running = false;

	function recordInputEvent(kind: 'pointer' | 'wheel') {
		if (!running) return;

		if (kind === 'pointer') {
			pointerEvents += 1;
		} else {
			wheelEvents += 1;
		}

		pendingInputEvents.push(performance.now());
	}

	function recordPointerEvent() {
		recordInputEvent('pointer');
	}

	function recordWheelEvent() {
		recordInputEvent('wheel');
	}

	function recordBlobGeneration(duration: number) {
		if (!running) return;

		blobCount += 1;
		blobTime += duration;
	}

	function renderFrame(timestamp: number) {
		if (!running) return;

		if (previousFrameTime !== undefined) {
			frameTimes.push(timestamp - previousFrameTime);
		}
		previousFrameTime = timestamp;

		if (pendingInputEvents.length > 0) {
			inputLatencies.push(...pendingInputEvents.map((startTime) => timestamp - startTime));
			pendingInputEvents = [];
		}

		animationFrame = requestAnimationFrame(renderFrame);
	}

	function publishSnapshot() {
		if (!running) return;

		const now = performance.now();
		const elapsed = Math.max(now - intervalStart, 1);
		const memory = (performance as PerformanceWithMemory).memory;
		const snapshot: PlotProfilerSnapshot = {
			fps: (frameTimes.length * 1000) / elapsed,
			averageFrameTime:
				frameTimes.length > 0
					? frameTimes.reduce((total, frameTime) => total + frameTime, 0) / frameTimes.length
					: 0,
			p95FrameTime: percentile(frameTimes, 95),
			pointerEvents,
			wheelEvents,
			averageInputLatency:
				inputLatencies.length > 0
					? inputLatencies.reduce((total, latency) => total + latency, 0) / inputLatencies.length
					: 0,
			p95InputLatency: percentile(inputLatencies, 95),
			blobCount,
			blobTime,
			konvaNodeCount: getKonvaNodeCount(),
			jsHeapUsed: memory ? memory.usedJSHeapSize : null
		};

		onSnapshot(snapshot);
		intervalStart = now;
		frameTimes = [];
		inputLatencies = [];
		pointerEvents = 0;
		wheelEvents = 0;
		blobCount = 0;
		blobTime = 0;
	}

	function start() {
		if (running) return;

		running = true;
		intervalStart = performance.now();
		previousFrameTime = undefined;
		animationFrame = requestAnimationFrame(renderFrame);
		snapshotTimer = window.setInterval(publishSnapshot, SAMPLE_INTERVAL);
	}

	function stop() {
		if (!running) return;

		running = false;
		if (animationFrame !== undefined) cancelAnimationFrame(animationFrame);
		if (snapshotTimer !== undefined) window.clearInterval(snapshotTimer);
		animationFrame = undefined;
		snapshotTimer = undefined;
	}

	return {
		start,
		stop,
		recordPointerEvent,
		recordWheelEvent,
		recordBlobGeneration
	};
}

export { createPlotProfiler };
