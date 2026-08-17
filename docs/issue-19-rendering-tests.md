# Issue #19 rendering tests

The plot rendering suite uses Playwright Core and runs the application in a local Chromium executable.

The implementation is located at:

```text
frontend/tests/plot-rendering.playwright.mjs
```

## Prerequisites

Start the frontend and backend using the project’s normal development setup. The frontend must be reachable at `http://localhost:8080` unless `PLOT_TEST_URL` is set.

The default runner uses `/usr/bin/chromium-browser`. Set `CHROMIUM_EXECUTABLE` when Chromium is installed elsewhere.

## Run the suite

From `frontend/`, run:

```bash
pnpm test:plot
```

The suite writes screenshots, profiler recordings, and summary JSON files to a temporary directory under `/tmp`. Set `PLOT_TEST_ARTIFACTS` to retain artifacts at a specific path:

```bash
PLOT_TEST_ARTIFACTS=/tmp/plot-rendering-run pnpm test:plot
```

Profiler recordings are enabled by default. The Playwright runner opens each configured URL, performs the same scenario interactions for every mode, clicks **Save JSON**, waits for the browser download, and saves the recording with a deterministic name. Each recording includes the final `metadata.renderMode`, and the debug panel displays the current mode while the scenario is running.

The selected default application mode is adaptive: normal URLs use vector culling and switch to cached rendering only at very low zoom. The matrix also keeps an explicit cache-only baseline (`plotHybrid=0`) and forced-culling diagnostic mode for comparison. Its output includes:

```text
/tmp/plot-rendering-run/profiles/cache/initial-view.json
/tmp/plot-rendering-run/profiles/hybrid/wheel-zoom.json
/tmp/plot-rendering-run/profiles/cull/search-results.json
/tmp/plot-rendering-run/adaptive-low-zoom.png
/tmp/plot-rendering-run/adaptive-normal-zoom.png
/tmp/plot-rendering-run/profiles.json
```

Run only one mode and a subset of scenarios when iterating:

```bash
PLOT_TEST_PROFILE_MODES=hybrid \
PLOT_TEST_PROFILE_SCENARIOS=initial-view,panning,wheel-zoom \
PLOT_TEST_ARTIFACTS=/tmp/plot-hybrid \
pnpm test:plot
```

Run the screenshot and correctness checks without the profiling matrix:

```bash
PLOT_TEST_PROFILES=0 PLOT_TEST_ARTIFACTS=/tmp/plot-screenshots pnpm test:plot
```

Useful environment variables:

| Variable                      | Default                     | Purpose                                |
| ----------------------------- | --------------------------- | -------------------------------------- |
| `CHROMIUM_EXECUTABLE`         | `/usr/bin/chromium-browser` | Chromium executable                    |
| `PLOT_TEST_URL`               | `http://localhost:8080`     | Frontend URL to test                   |
| `PLOT_TEST_WIDTH`             | `1280`                      | Test viewport width                    |
| `PLOT_TEST_HEIGHT`            | `800`                       | Test viewport height                   |
| `PLOT_TEST_ARTIFACTS`         | Temporary `/tmp` directory  | Screenshot and report directory        |
| `PLOT_TEST_PROFILES`          | `1`                         | Set to `0` to skip profiler recordings |
| `PLOT_TEST_PROFILE_MODES`     | `cache,hybrid,cull`         | Comma-separated URL-configured modes   |
| `PLOT_TEST_PROFILE_SCENARIOS` | All reference scenarios     | Comma-separated scenarios to record    |
| `PLOT_TEST_PROFILE_WARMUP_MS` | `1500`                      | Initial settling time per recording    |
| `PLOT_TEST_PROFILE_SETTLE_MS` | `1000`                      | Settling time after scenario actions   |

## Covered scenarios

- Initial nonblank rendering.
- Adaptive cache and vector-culling transitions.
- Direct render-mode assertions at normal zoom, very low zoom, and maximum zoom.
- Search-result jumps with forced culling.
- Search overlay rendering after a jump.
- Hover targeting and pointer cursor behavior.
- Hover pointer-sweep performance metrics.
- Viewport resizing and canvas dimensions.
- Basic animation-frame and canvas health checks.
- JSON profiler recordings for the selected mode/scenario matrix.
- Deterministic multi-search profiler fixtures for overlay and selection workloads.

The scenario actions are renderer-agnostic. Cache, adaptive, and forced-culling behavior is selected only by the URL query parameters, so changing the final implementation requires changing the mode mapping rather than duplicating scenario tests.

## Run an A/B comparison

The suite tests one checkout at a time. To compare two implementations, run the same suite twice and compare their artifact directories.

First run the current checkout:

```bash
cd frontend
PLOT_TEST_ARTIFACTS=/tmp/plot-current pnpm test:plot
```

Then create a temporary worktree for the version to compare:

```bash
git worktree add /tmp/knowledge-spaces-previous <commit-or-branch>
pnpm --dir /tmp/knowledge-spaces-previous/frontend install --frozen-lockfile
PUBLIC_BACKEND_URL=http://localhost:7100 \
pnpm --dir /tmp/knowledge-spaces-previous/frontend dev --host 127.0.0.1 --port 8081
```

In another terminal, run the same tests against that worktree:

```bash
PLOT_TEST_URL=http://localhost:8081 \
PLOT_TEST_ARTIFACTS=/tmp/plot-previous \
pnpm --dir /tmp/knowledge-spaces-previous/frontend test:plot
```

Compare the matching JSON files, especially:

```text
/tmp/plot-current/hover-performance.json
/tmp/plot-previous/hover-performance.json
```

The hover performance result contains frame p50, p95, and maximum values for the same pointer sweep. Remove the temporary worktree after the comparison:

```bash
git worktree remove --force /tmp/knowledge-spaces-previous
```

### Recorded hover-overlay comparison

The first successful A/B run used Chromium at a `1280 × 800` viewport and compared the current implementation with the previous checkout:

| Metric        | Current implementation | Previous implementation |    Difference |
| ------------- | ---------------------: | ----------------------: | ------------: |
| Frame p95     |              `83.4 ms` |               `99.9 ms` | `16.5%` lower |
| Maximum frame |             `100.0 ms` |              `100.0 ms` | No regression |

This comparison used the same 107-frame pointer sweep over detected crosses. Treat it as a hardware-specific benchmark signal and repeat it on representative machines.
