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

The suite writes screenshots and a summary JSON file to a temporary directory under `/tmp`. Set `PLOT_TEST_ARTIFACTS` to retain artifacts at a specific path:

```bash
PLOT_TEST_ARTIFACTS=/tmp/plot-rendering-run pnpm test:plot
```

Useful environment variables:

| Variable              | Default                     | Purpose                         |
| --------------------- | --------------------------- | ------------------------------- |
| `CHROMIUM_EXECUTABLE` | `/usr/bin/chromium-browser` | Chromium executable             |
| `PLOT_TEST_URL`       | `http://localhost:8080`     | Frontend URL to test            |
| `PLOT_TEST_WIDTH`     | `1280`                      | Test viewport width             |
| `PLOT_TEST_HEIGHT`    | `800`                       | Test viewport height            |
| `PLOT_TEST_ARTIFACTS` | Temporary `/tmp` directory  | Screenshot and report directory |

## Covered scenarios

- Initial nonblank rendering.
- Hybrid cache and vector-culling transitions.
- Search-result jumps with forced culling.
- Search overlay rendering after a jump.
- Hover targeting and pointer cursor behavior.
- Hover pointer-sweep performance metrics.
- Viewport resizing and canvas dimensions.
- Basic animation-frame and canvas health checks.

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
