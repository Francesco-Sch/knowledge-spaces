import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { test } from 'node:test';
import { MIN_INTERACTION_SCALE } from '../src/lib/plot/plot-behaviour.ts';
import { chromium } from 'playwright-core';

const APP_URL = process.env.PLOT_TEST_URL || 'http://localhost:8080';
const ARTIFACT_DIR =
	process.env.PLOT_TEST_ARTIFACTS || `/tmp/plot-rendering-playwright-${Date.now()}`;
const VIEWPORT = {
	width: Number(process.env.PLOT_TEST_WIDTH || 1280),
	height: Number(process.env.PLOT_TEST_HEIGHT || 800)
};
const PROFILE_RECORDINGS_ENABLED = process.env.PLOT_TEST_PROFILES !== '0';
const PROFILE_WARMUP_MS = getDuration(process.env.PLOT_TEST_PROFILE_WARMUP_MS, 1_500);
const PROFILE_SETTLE_MS = getDuration(process.env.PLOT_TEST_PROFILE_SETTLE_MS, 1_000);
const PROFILE_MODES = parseList(process.env.PLOT_TEST_PROFILE_MODES, ['cache', 'hybrid', 'cull']);
const PROFILE_SCENARIO_NAMES = parseList(process.env.PLOT_TEST_PROFILE_SCENARIOS, [
	'initial-view',
	'panning',
	'wheel-zoom',
	'pointer-movement',
	'search-results',
	'hover-and-selection',
	'window-resizing',
	'zoom-min',
	'zoom-max'
]);

// These are the only mode-specific details in the suite. The interaction
// scenarios below are deliberately identical for every URL configuration.
const PROFILE_MODE_CONFIG = {
	cache: {
		query: [['plotHybrid', '0']]
	},
	// The selected adaptive mode is the normal URL; plotHybrid=1 remains its explicit alias.
	hybrid: {
		query: []
	},
	cull: {
		query: [
			['plotHybrid', '0'],
			['plotCache', '0'],
			['plotCull', '1']
		]
	}
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

const profileSearchFixtures = [
	{
		dataset: '20newsgroups',
		query: 'playwright-test-one',
		searchPoint: { x: 0.36, y: 0.36 },
		neighbors: [
			{ corpus_id: 0, x: 0.33, y: 0.33 },
			{ corpus_id: 1, x: 0.35, y: 0.36 },
			{ corpus_id: 2, x: 0.37, y: 0.34 },
			{ corpus_id: 3, x: 0.34, y: 0.38 },
			{ corpus_id: 4, x: 0.38, y: 0.37 }
		],
		color: '#00aa55'
	},
	{
		dataset: '20newsgroups',
		query: 'playwright-test-two',
		searchPoint: { x: 0.42, y: 0.42 },
		neighbors: [
			{ corpus_id: 5, x: 0.39, y: 0.4 },
			{ corpus_id: 6, x: 0.41, y: 0.43 },
			{ corpus_id: 7, x: 0.43, y: 0.41 },
			{ corpus_id: 8, x: 0.4, y: 0.44 },
			{ corpus_id: 9, x: 0.44, y: 0.43 }
		],
		color: '#0055cc'
	},
	{
		dataset: '20newsgroups',
		query: 'playwright-test-three',
		searchPoint: { x: 0.45, y: 0.45 },
		neighbors: [
			{ corpus_id: 10, x: 0.42, y: 0.43 },
			{ corpus_id: 11, x: 0.44, y: 0.46 },
			{ corpus_id: 12, x: 0.46, y: 0.44 },
			{ corpus_id: 13, x: 0.43, y: 0.47 },
			{ corpus_id: 14, x: 0.47, y: 0.45 }
		],
		color: '#cc5500'
	}
];

function getDuration(value, fallback) {
	const duration = Number(value);
	return Number.isFinite(duration) && duration >= 0 ? duration : fallback;
}

function parseList(value, fallback) {
	return (value ? value.split(',') : fallback).map((item) => item.trim()).filter(Boolean);
}

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

async function seedSearches(page, seededSearches) {
	await page.goto(`${APP_URL}/`);
	await page.evaluate((searches) => {
		localStorage.setItem('searches', JSON.stringify(searches));
		localStorage.setItem('selectedDataset', '20newsgroups');
	}, seededSearches);
	await page.goto('about:blank');
}

async function seedSearch(page) {
	await seedSearches(page, [searchFixture]);
}

async function seedProfileSearches(page) {
	await seedSearches(page, profileSearchFixtures);
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

async function waitForPlot(page) {
	await page.locator('canvas').first().waitFor({ state: 'attached' });
}

async function waitForRenderMode(page, expectedMode) {
	await page.waitForFunction(
		(mode) => document.querySelector('.plot-profiler')?.textContent?.includes(`Mode: ${mode}`),
		expectedMode,
		{ timeout: 10_000 }
	);
}

async function getPlotLayerOrder(page) {
	return page.evaluate(() => {
		const stage = window.Konva?.stages?.at(-1);
		const layer = stage?.getChildren()?.[0];
		return layer
			? layer.getChildren().map((node, index) => ({
					index,
					className: node.getClassName(),
					childCount: node.getChildren?.().length || 0,
					stroke: node.getAttr('stroke'),
					pointId: node.getAttr('pointId')
			  }))
			: [];
	});
}

function getExpectedInitialRenderMode(mode) {
	if (mode === 'cull') return 'forced-culling';
	return 'cached';
}

function getExpectedFinalRenderMode(mode, scenario) {
	if (mode === 'cache') return 'cached';
	if (mode === 'cull') return 'forced-culling';
	return scenario === 'zoom-max' ? 'adaptive-culling' : 'cached';
}

function getPageViewport(page) {
	return page.viewportSize() || VIEWPORT;
}

async function getPlotInteractionState(page) {
	return page.evaluate(() => {
		const stage = window.Konva?.stages?.at(-1);
		if (!stage) return null;

		const pointNodes = stage
			.find('Shape')
			.filter((node) => Number.isInteger(node.getAttr('pointId')) && node.getAttr('pointId') >= 0);
		const layers = stage.getChildren();
		return {
			scale: stage.scaleX(),
			cardNodeCount: layers.at(-1)?.getChildren().length || 0,
			pointNodeCount: pointNodes.length,
			pointNodeListening: pointNodes.map((node) => node.isListening())
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
	await page.goto(
		`${APP_URL}/?plotDebug=1&plotHybrid=0&plotCache=1&plotScenario=playwright-hover-benchmark`
	);
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

async function findHoverableDarkCanvasPoint(page) {
	const candidates = await findDarkCanvasPoints(page);
	for (const candidate of candidates) {
		await page.mouse.move(candidate.x, candidate.y);
		await page.waitForTimeout(50);
		if ((await page.evaluate(() => document.body.style.cursor)) === 'pointer') {
			return candidate;
		}
	}
	return null;
}

const PROFILE_SCENARIOS = {
	'initial-view': {
		needsSearch: false,
		run: async () => undefined
	},
	panning: {
		needsSearch: false,
		run: async (page) => {
			const { width, height } = getPageViewport(page);
			const start = { x: width * 0.55, y: height * 0.65 };
			await page.mouse.move(start.x, start.y);
			await page.mouse.down();
			for (let index = 0; index < 80; index += 1) {
				const progress = index / 79;
				await page.mouse.move(start.x - 260 + progress * 520, start.y - 120 + progress * 240);
				await page.waitForTimeout(20);
			}
			await page.mouse.up();
		}
	},
	'wheel-zoom': {
		needsSearch: false,
		run: async (page) => {
			const { width, height } = getPageViewport(page);
			await page.mouse.move(width / 2, height / 2);
			await dispatchWheel(page, -500, 8);
			await dispatchWheel(page, 500, 8);
		}
	},
	'pointer-movement': {
		needsSearch: false,
		run: async (page) => {
			const { width, height } = getPageViewport(page);
			for (let index = 0; index < 100; index += 1) {
				const progress = (index % 50) / 49;
				const direction = Math.floor(index / 50) % 2 === 0 ? 1 : -1;
				await page.mouse.move(
					300 + progress * (width - 400),
					180 + ((1 - progress) * 0.65 + (direction === 1 ? 0 : 0.2)) * (height - 220)
				);
				await page.waitForTimeout(20);
			}
		}
	},
	'search-results': {
		needsSearch: true,
		run: async () => undefined
	},
	'hover-and-selection': {
		needsSearch: true,
		run: async (page) => {
			const points = await findDarkCanvasPoints(page);
			assert.ok(points.length >= 10, `expected at least 10 hover points, found ${points.length}`);
			const target = await findHoverableDarkCanvasPoint(page);
			assert.ok(target, 'could not find an interactive point candidate for selection');
			for (const point of points.slice(0, 40)) {
				await page.mouse.move(point.x, point.y);
				await page.waitForTimeout(25);
			}
			await page.mouse.click(target.x, target.y);
			await page.waitForTimeout(500);
		}
	},
	'window-resizing': {
		needsSearch: false,
		run: async (page) => {
			const { width, height } = getPageViewport(page);
			const sizes = [
				{
					width: Math.max(640, Math.round(width * 0.8)),
					height: Math.max(480, Math.round(height * 0.8))
				},
				{
					width: Math.max(640, Math.round(width * 0.65)),
					height: Math.max(480, Math.round(height * 0.65))
				},
				{ width, height }
			];
			for (const size of sizes) {
				await page.setViewportSize(size);
				await page.waitForTimeout(350);
			}
		}
	},
	'zoom-min': {
		needsSearch: false,
		run: async (page) => {
			const { width, height } = getPageViewport(page);
			await page.mouse.move(width / 2, height / 2);
			await dispatchWheel(page, 500, 24);
		}
	},
	'zoom-max': {
		needsSearch: false,
		run: async (page) => {
			const { width, height } = getPageViewport(page);
			await page.mouse.move(width / 2, height / 2);
			await dispatchWheel(page, -500, 18);
		}
	}
};

function getProfileUrl(mode, scenario) {
	const modeConfig = PROFILE_MODE_CONFIG[mode];
	assert.ok(modeConfig, `unknown plot profile mode: ${mode}`);
	const query = new URLSearchParams([
		['plotDebug', '1'],
		...modeConfig.query,
		['plotScenario', scenario]
	]);
	return `${APP_URL}/?${query}`;
}

async function openProfileScenario(page, mode, scenario) {
	const scenarioConfig = PROFILE_SCENARIOS[scenario];
	assert.ok(scenarioConfig, `unknown plot profile scenario: ${scenario}`);
	if (scenarioConfig.needsSearch) {
		await seedProfileSearches(page);
	} else {
		await preparePage(page);
	}
	await page.goto(getProfileUrl(mode, scenario));
	await waitForPlot(page);
	await page.waitForTimeout(PROFILE_WARMUP_MS);
	await waitForRenderMode(page, getExpectedInitialRenderMode(mode));
}

async function saveProfilerRecording(page, mode, scenario) {
	const profileDirectory = join(ARTIFACT_DIR, 'profiles', mode);
	const recordingPath = join(profileDirectory, `${scenario}.json`);
	await mkdir(profileDirectory, { recursive: true });

	const saveButton = page.locator('.plot-profiler button');
	await saveButton.waitFor({ state: 'visible', timeout: 15_000 });
	const [download] = await Promise.all([page.waitForEvent('download'), saveButton.click()]);
	await download.saveAs(recordingPath);

	const recording = JSON.parse(await readFile(recordingPath, 'utf8'));
	assert.equal(recording.metadata.scenario, scenario, `${mode}/${scenario}: scenario metadata`);
	assert.equal(
		recording.metadata.cacheEnabled,
		mode === 'cache',
		`${mode}/${scenario}: cache metadata`
	);
	assert.equal(
		recording.metadata.hybridEnabled,
		mode === 'hybrid',
		`${mode}/${scenario}: hybrid metadata`
	);
	assert.equal(
		recording.metadata.cullEnabled,
		mode === 'cull',
		`${mode}/${scenario}: cull metadata`
	);
	assert.equal(
		recording.metadata.renderMode,
		getExpectedFinalRenderMode(mode, scenario),
		`${mode}/${scenario}: render mode metadata`
	);
	assert.ok(
		Array.isArray(recording.samples) && recording.samples.length > 0,
		`${mode}/${scenario}: profiler did not record samples`
	);

	return {
		mode,
		scenario,
		path: recordingPath,
		sampleCount: recording.samples.length,
		metadata: recording.metadata
	};
}

async function runProfileScenario(page, mode, scenario, errors) {
	await openProfileScenario(page, mode, scenario);
	await PROFILE_SCENARIOS[scenario].run(page);
	await page.waitForTimeout(PROFILE_SETTLE_MS);
	await waitForRenderMode(page, getExpectedFinalRenderMode(mode, scenario));
	const recording = await saveProfilerRecording(page, mode, scenario);
	const stats = await canvasStats(page);
	assertHealthy(stats, errors, `${mode}/${scenario}`);
	return recording;
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
	const context = await browser.newContext({
		viewport: VIEWPORT,
		acceptDownloads: true
	});
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
	const profileRecordings = [];
	const resetPage = async () => {
		await page.close();
		page = await createPage();
		resetErrors();
	};

	try {
		await t.test('initial cached render is nonblank', async () => {
			await resetPage();
			await preparePage(page, '?plotDebug=1&plotHybrid=0&plotScenario=playwright-initial');
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

		await t.test('adaptive mode follows its culling thresholds', async () => {
			await resetPage();
			await preparePage(page, '?plotDebug=1&plotScenario=playwright-adaptive');
			await waitForRenderMode(page, 'cached');
			await page.mouse.move(VIEWPORT.width / 2, VIEWPORT.height / 2);

			await dispatchWheel(page, 500, 24);
			await page.waitForTimeout(700);
			await waitForRenderMode(page, 'cached');
			const lowZoomStats = await canvasStats(page);
			assertHealthy(lowZoomStats, errors, 'adaptive low zoom');
			await page.screenshot({ path: `${ARTIFACT_DIR}/adaptive-low-zoom.png` });

			await dispatchWheel(page, -500, 18);
			await page.waitForTimeout(700);
			await waitForRenderMode(page, 'adaptive-culling');
			const normalZoomStats = await canvasStats(page);
			assertHealthy(normalZoomStats, errors, 'adaptive normal zoom');
			await page.screenshot({ path: `${ARTIFACT_DIR}/adaptive-normal-zoom.png` });
		});

		await t.test(
			'search overlays stay above crosses after cache and culling transitions',
			async () => {
				await resetPage();
				await seedSearch(page);
				await page.goto(`${APP_URL}/?plotDebug=1&plotScenario=playwright-search-order`);
				await page.waitForTimeout(1_500);
				await waitForRenderMode(page, 'cached');

				// Move through the cached mode and back into culling, matching the
				// transition where the overlay draw order previously became inverted.
				await dispatchWheel(page, 500, 5);
				await page.waitForTimeout(700);
				await waitForRenderMode(page, 'cached');
				await dispatchWheel(page, -500, 7);
				await page.waitForTimeout(700);
				await waitForRenderMode(page, 'adaptive-culling');

				const stats = await canvasStats(page);
				assertHealthy(stats, errors, 'search order transition');
				assert.ok(
					stats.canvases.some((canvas) => canvas.greenPixels > 0),
					'colored search overlay was not visible after the mode transition'
				);

				const layerOrder = await getPlotLayerOrder(page);
				const searchNodeIndexes = layerOrder
					.filter((node) => node.stroke === searchFixture.color)
					.map((node) => node.index);
				const embeddingGroupIndexes = layerOrder
					.filter((node) => node.className === 'Group')
					.map((node) => node.index);

				assert.ok(searchNodeIndexes.length > 0, 'search overlay nodes were not rendered');
				assert.ok(embeddingGroupIndexes.length > 0, 'embedding groups were not rendered');
				assert.ok(
					Math.max(...embeddingGroupIndexes) < Math.min(...searchNodeIndexes),
					'search overlays were rendered behind an embedding group after the mode transition'
				);
				await page.screenshot({ path: `${ARTIFACT_DIR}/search-order-transition.png` });
			}
		);

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
			await preparePage(
				page,
				'?plotDebug=1&plotHybrid=0&plotCache=0&plotScenario=playwright-hover'
			);
			const point = await findHoverableDarkCanvasPoint(page);
			assert.ok(point, 'could not find a point candidate for hover testing');
			const cursor = await page.evaluate(() => document.body.style.cursor);
			const stats = await canvasStats(page);
			assertHealthy(stats, errors, 'hover');
			assert.equal(cursor, 'pointer', 'hover did not set the pointer cursor');
			await page.screenshot({ path: `${ARTIFACT_DIR}/hover.png` });
			await page.mouse.move(VIEWPORT.width - 10, VIEWPORT.height - 10);
		});

		await t.test('stage interaction selects a point without point listeners', async () => {
			await resetPage();
			await preparePage(
				page,
				'?plotDebug=1&plotHybrid=0&plotCache=0&plotScenario=playwright-selection'
			);
			const point = await findHoverableDarkCanvasPoint(page);
			assert.ok(point, 'could not find a point candidate for selection');

			await page.mouse.click(point.x, point.y);
			await page.waitForTimeout(400);

			const state = await getPlotInteractionState(page);
			assert.ok(state, 'plot stage was not available');
			assert.ok(state.cardNodeCount > 0, 'nearest-point selection did not open the card');
			assert.ok(state.pointNodeCount > 0, 'plot did not contain point nodes');
			assert.ok(
				state.pointNodeListening.every((listening) => !listening),
				'point nodes still participate in Konva hit testing'
			);
			assertHealthy(await canvasStats(page), errors, 'stage selection');
		});

		await t.test('low-zoom selection zooms first and selects on the next click', async () => {
			await resetPage();
			await preparePage(
				page,
				'?plotDebug=1&plotHybrid=0&plotCache=0&plotScenario=playwright-low-zoom-selection'
			);
			await page.mouse.move(VIEWPORT.width / 2, VIEWPORT.height / 2);
			await dispatchWheel(page, 500, 24);
			await page.waitForTimeout(300);

			const lowZoomState = await getPlotInteractionState(page);
			assert.ok(lowZoomState, 'plot stage was not available at low zoom');
			assert.ok(lowZoomState.scale < 0.21, 'test did not reach the minimum zoom');

			await page.mouse.click(VIEWPORT.width / 2, VIEWPORT.height / 2);
			await page.waitForTimeout(300);
			const interactionZoomState = await getPlotInteractionState(page);
			assert.ok(interactionZoomState, 'plot stage was not available after interaction zoom');
			assert.ok(
				interactionZoomState.scale >= MIN_INTERACTION_SCALE - 0.01,
				`first low-zoom click did not reach the minimum interaction scale of ${MIN_INTERACTION_SCALE}`
			);
			assert.equal(
				interactionZoomState.cardNodeCount,
				0,
				'first low-zoom click selected a point before the user could confirm it'
			);

			const point = await findHoverableDarkCanvasPoint(page);
			assert.ok(point, 'could not find a point after zooming to the interaction scale');
			await page.mouse.click(point.x, point.y);
			await page.waitForTimeout(400);
			const selectedState = await getPlotInteractionState(page);
			assert.ok(selectedState?.cardNodeCount > 0, 'second click did not select a point');
			assertHealthy(await canvasStats(page), errors, 'low-zoom selection');
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

		if (PROFILE_RECORDINGS_ENABLED) {
			const unknownModes = PROFILE_MODES.filter((mode) => !PROFILE_MODE_CONFIG[mode]);
			const unknownScenarios = PROFILE_SCENARIO_NAMES.filter(
				(scenario) => !PROFILE_SCENARIOS[scenario]
			);
			assert.deepEqual(unknownModes, [], `unknown profile modes: ${unknownModes.join(', ')}`);
			assert.deepEqual(
				unknownScenarios,
				[],
				`unknown profile scenarios: ${unknownScenarios.join(', ')}`
			);

			for (const mode of PROFILE_MODES) {
				for (const scenario of PROFILE_SCENARIO_NAMES) {
					await t.test(`records ${scenario} in ${mode} mode`, async () => {
						await resetPage();
						profileRecordings.push(await runProfileScenario(page, mode, scenario, errors));
					});
				}
			}
		}

		await writeFile(
			join(ARTIFACT_DIR, 'profiles.json'),
			JSON.stringify(
				{
					enabled: PROFILE_RECORDINGS_ENABLED,
					modes: PROFILE_MODES,
					scenarios: PROFILE_SCENARIO_NAMES,
					warmupMs: PROFILE_WARMUP_MS,
					settleMs: PROFILE_SETTLE_MS,
					recordings: profileRecordings
				},
				null,
				2
			)
		);

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
