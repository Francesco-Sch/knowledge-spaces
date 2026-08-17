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
- Viewport resizing and canvas dimensions.
- Basic animation-frame and canvas health checks.
