import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { test } from 'node:test';
import { chromium } from 'playwright-core';

const APP_URL = process.env.PLOT_TEST_URL || 'http://localhost:8080';
const ARTIFACT_DIR =
	process.env.PLOT_TEST_ARTIFACTS || `/tmp/plot-rendering-playwright-${Date.now()}`;
const VIEWPORT = {
	width: Number(process.env.PLOT_TEST_WIDTH || 1280),
	height: Number(process.env.PLOT_TEST_HEIGHT || 800)
};

const searchFixture = {
	dataset: '20newsgroups',
	query: 'playwright-test',
	searchPoint: { x: 0.45, y: 0.45 },
	neighbors: [
		{ corpus_id: 0, x: 0.42, y: 0.42 },
		{ corpus_id: 1, x: 0.44, y: 0.45 },
		{ corpus_id: 2, x: 0.46, y: 0.44 }
	],
	color: '#00aa55'
};

async function preparePage(page, query = '') {
	await page.goto(`${APP_URL}/`);
	await page.evaluate(() => {
		localStorage.removeItem('searches');
		localStorage.setItem('selectedDataset', '20newsgroups');
	});
	await page.goto('about:blank');
	await page.goto(`${APP_URL}/${query}`);
	await page.waitForTimeout(1_200);
}

async function seedSearch(page) {
	await page.goto(`${APP_URL}/`);
	await page.evaluate((search) => {
		localStorage.setItem('searches', JSON.stringify([search]));
		localStorage.setItem('selectedDataset', '20newsgroups');
	}, searchFixture);
	await page.goto('about:blank');
}

async function canvasStats(page) {
	return page.evaluate(() => {
		const canvases = [...document.querySelectorAll('canvas')];
		return {
			canvasCount: canvases.length,
			canvases: canvases.map((canvas) => {
				const context = canvas.getContext('2d');
				const width = canvas.width;
				const height = canvas.height;
				const data = context.getImageData(0, 0, width, height).data;
				let opaquePixels = 0;
				let greenPixels = 0;
				for (let index = 0; index < data.length; index += 16) {
					const alpha = data[index + 3];
					if (alpha > 40) opaquePixels += 1;
					if (alpha > 40 && data[index + 1] > 120 && data[index] < 100) greenPixels += 1;
				}
				return { width, height, opaquePixels, greenPixels };
			})
		};
	});
}

async function startFrameRecorder(page) {
	await page.evaluate(() => {
		window.__plotTestStop?.();
		window.__plotTestFrames = [];
		let lastFrame;
		let animationFrame;
		const record = (timestamp) => {
			if (lastFrame !== undefined) window.__plotTestFrames.push(timestamp - lastFrame);
			lastFrame = timestamp;
			animationFrame = requestAnimationFrame(record);
		};
		window.__plotTestStop = () => cancelAnimationFrame(animationFrame);
		animationFrame = requestAnimationFrame(record);
	});
}

async function frameStats(page) {
	return page.evaluate(() => {
		const frames = (window.__plotTestFrames || [])
			.filter((frame) => frame > 0)
			.sort((a, b) => a - b);
		const percentile = (value) =>
			frames.length ? frames[Math.min(frames.length - 1, Math.ceil(value * frames.length) - 1)] : 0;
		return {
			count: frames.length,
			p50: percentile(0.5),
			p95: percentile(0.95),
			max: frames.length ? frames[frames.length - 1] : 0
		};
	});
}

async function dispatchWheel(page, deltaY, count = 1) {
	for (let index = 0; index < count; index += 1) {
		await page.mouse.wheel(0, deltaY);
		await page.waitForTimeout(50);
	}
}

async function runHoverBenchmark(page) {
	await page.goto(`${APP_URL}/?plotDebug=1&plotCache=1&plotScenario=playwright-hover-benchmark`);
	await page.waitForTimeout(1_200);
	const points = await findDarkCanvasPoints(page);
	assert.ok(points.length >= 10, `expected at least 10 hover points, found ${points.length}`);
	await startFrameRecorder(page);

	for (const point of points.slice(0, 80)) {
		await page.mouse.move(point.x, point.y);
		await page.waitForTimeout(20);
	}
	await page.waitForTimeout(500);

	return {
		frames: await frameStats(page),
		canvas: await canvasStats(page),
		profiler: (await page.locator('.plot-profiler').count())
			? await page.locator('.plot-profiler').innerText()
			: ''
	};
}

async function findDarkCanvasPoints(page) {
	return page.evaluate(() => {
		const canvas = document.querySelector('canvas');
		if (!canvas) return [];
		const context = canvas.getContext('2d');
		const data = context.getImageData(0, 0, canvas.width, canvas.height).data;
		const points = [];
		for (let y = 180; y < canvas.height - 20; y += 3) {
			for (let x = 300; x < canvas.width - 20; x += 3) {
				const index = (y * canvas.width + x) * 4;
				if (
					data[index + 3] > 100 &&
					data[index] < 50 &&
					data[index + 1] < 50 &&
					data[index + 2] < 50 &&
					points.every((point) => Math.abs(point.x - x) > 18 || Math.abs(point.y - y) > 18)
				) {
					points.push({ x, y });
					if (points.length >= 120) return points;
				}
			}
		}
		return points;
	});
}

async function findDarkCanvasPoint(page) {
	return page.evaluate(() => {
		const canvas = document.querySelector('canvas');
		if (!canvas) return null;
		const context = canvas.getContext('2d');
		const data = context.getImageData(0, 0, canvas.width, canvas.height).data;
		for (let y = 180; y < canvas.height - 20; y += 3) {
			for (let x = 300; x < canvas.width - 20; x += 3) {
				const index = (y * canvas.width + x) * 4;
				if (
					data[index + 3] > 100 &&
					data[index] < 50 &&
					data[index + 1] < 50 &&
					data[index + 2] < 50
				) {
					return { x, y };
				}
			}
		}
		return null;
	});
}

function assertHealthy(stats, errors, label) {
	assert.ok(stats.canvasCount > 0, `${label}: expected at least one canvas`);
	assert.ok(
		stats.canvases.some((canvas) => canvas.opaquePixels > 0),
		`${label}: expected nonblank canvas`
	);
	assert.deepEqual(errors.console, [], `${label}: browser console errors`);
	assert.deepEqual(errors.page, [], `${label}: page exceptions`);
}

test('plot rendering scenarios in Chromium', async (t) => {
	await mkdir(ARTIFACT_DIR, { recursive: true });
	const browser = await chromium.launch({
		executablePath: process.env.CHROMIUM_EXECUTABLE || '/usr/bin/chromium-browser',
		headless: true,
		args: ['--no-sandbox']
	});
	const context = await browser.newContext({ viewport: VIEWPORT });
	const errors = { console: [], page: [] };
	const resetErrors = () => {
		errors.console.length = 0;
		errors.page.length = 0;
	};
	const createPage = async () => {
		const nextPage = await context.newPage();
		await nextPage.setViewportSize(VIEWPORT);
		nextPage.on('console', (message) => {
			if (message.type() === 'error') errors.console.push(message.text());
		});
		nextPage.on('pageerror', (error) => errors.page.push(error.message));
		return nextPage;
	};
	let page = await createPage();
	const resetPage = async () => {
		await page.close();
		page = await createPage();
		resetErrors();
	};

	try {
		await t.test('initial cached render is nonblank', async () => {
			await resetPage();
			await preparePage(page, '?plotDebug=1&plotScenario=playwright-initial');
			const stats = await canvasStats(page);
			assertHealthy(stats, errors, 'initial render');
			await page.screenshot({ path: `${ARTIFACT_DIR}/initial.png` });
		});

		await t.test('hybrid mode transitions between cache and vector culling', async () => {
			await resetPage();
			await preparePage(page, '?plotDebug=1&plotHybrid=1&plotScenario=playwright-hybrid');
			await startFrameRecorder(page);
			await dispatchWheel(page, -500, 6);
			await page.waitForTimeout(700);
			const zoomedInStats = await canvasStats(page);
			const zoomedInFrames = await frameStats(page);
			assertHealthy(zoomedInStats, errors, 'hybrid zoomed in');
			assert.ok(zoomedInFrames.max < 2_000, 'hybrid zoom-in transition exceeded 2 seconds');
			await page.screenshot({ path: `${ARTIFACT_DIR}/hybrid-zoomed-in.png` });

			await dispatchWheel(page, 500, 6);
			await page.waitForTimeout(900);
			const zoomedOutStats = await canvasStats(page);
			assertHealthy(zoomedOutStats, errors, 'hybrid zoomed out');
			await page.screenshot({ path: `${ARTIFACT_DIR}/hybrid-zoomed-out.png` });
		});

		await t.test('forced culling keeps search overlays visible after a search jump', async () => {
			await resetPage();
			await seedSearch(page);
			await page.goto(
				`${APP_URL}/?plotDebug=1&plotCache=0&plotCull=1&plotScenario=playwright-search`
			);
			await page.waitForTimeout(1_500);
			const stats = await canvasStats(page);
			assertHealthy(stats, errors, 'search jump');
			assert.ok(
				stats.canvases.some((canvas) => canvas.greenPixels > 0),
				'search overlay was not rendered'
			);
			await page.screenshot({ path: `${ARTIFACT_DIR}/search-jump.png` });
		});

		await t.test('hover reports pointer targeting and keeps the canvas healthy', async () => {
			await resetPage();
			await preparePage(page, '?plotDebug=1&plotCache=0&plotScenario=playwright-hover');
			const point = await findDarkCanvasPoint(page);
			assert.ok(point, 'could not find a point candidate for hover testing');
			await page.mouse.move(point.x, point.y);
			await page.waitForTimeout(100);
			const cursor = await page.evaluate(() => document.body.style.cursor);
			const stats = await canvasStats(page);
			assertHealthy(stats, errors, 'hover');
			assert.equal(cursor, 'pointer', 'hover did not set the pointer cursor');
			await page.screenshot({ path: `${ARTIFACT_DIR}/hover.png` });
			await page.mouse.move(VIEWPORT.width - 10, VIEWPORT.height - 10);
		});

		await t.test('hover performance is recorded', async () => {
			await resetPage();
			const performance = await runHoverBenchmark(page);
			assertHealthy(performance.canvas, errors, 'hover performance');
			assert.ok(performance.frames.max < 2_000, 'hover benchmark exceeded 2 seconds per frame');
			await writeFile(
				`${ARTIFACT_DIR}/hover-performance.json`,
				JSON.stringify(performance, null, 2)
			);
		});

		await t.test('resizing keeps the renderer mounted and nonblank', async () => {
			await resetPage();
			await preparePage(page, '?plotDebug=1&plotHybrid=1&plotScenario=playwright-resize');
			await page.setViewportSize({ width: 1024, height: 700 });
			await page.waitForTimeout(1_000);
			const stats = await canvasStats(page);
			assertHealthy(stats, errors, 'resize');
			assert.equal(stats.canvases[0].width, 1024, 'canvas width did not follow resize');
			assert.equal(stats.canvases[0].height, 700, 'canvas height did not follow resize');
			await page.screenshot({ path: `${ARTIFACT_DIR}/resize.png` });
		});

		await writeFile(
			`${ARTIFACT_DIR}/summary.json`,
			JSON.stringify(
				{
					appUrl: APP_URL,
					viewport: VIEWPORT,
					artifacts: ARTIFACT_DIR
				},
				null,
				2
			)
		);
	} finally {
		await page.close();
		await browser.close();
	}
});
