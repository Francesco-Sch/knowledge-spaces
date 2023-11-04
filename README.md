<p align="center">
    <picture>
        <source media="(prefers-color-scheme: dark)" srcset="./.github/logo-dark.webp">
        <source media="(prefers-color-scheme: light)" srcset="./.github/logo-light.webp">
        <img alt="knowledge spaces" src="./.github/logo-light.webp" width="800" height="400" style="max-width: 100%;">
    </picture>
</p>

# knowledge spaces

Based on:

- <https://testdriven.io/blog/developing-a-single-page-app-with-fastapi-and-vuejs/>
- <https://medium.com/@bruno.fosados/simple-learn-docker-fastapi-and-vue-js-first-part-docker-setup-a8e4c09ef9c4>
- <https://medium.com/@jwdobken/vue-with-docker-initialize-develop-and-build-51fad21ad5e6>

- <https://www.okupter.com/blog/build-a-sveltekit-application-with-docker>
- <https://gist.github.com/williamngan/d18e4a6d9fc2fbd19e6907561b908a88>

- <https://svelte-modals.mattjennings.io/>
- <https://dev.to/danawoodman/svelte-quick-tip-connect-a-store-to-local-storage-4idi>

## Important commands

Start production build

```bash
docker compose -f docker-compose.production.yml up -d
```

Rebuild production build

```bash
docker compose -f docker-compose.production.yml up -d --build
```

Rebuild specific containers of production build

```bash
docker compose -f docker-compose.production.yml up -d --build frontend
```

## Important commands

Start production build

```bash
docker compose -f docker-compose.production.yml up -d
```

Rebuild production build

```bash
docker compose -f docker-compose.production.yml up -d --build
```

Rebuild specific containers of production build

```bash
docker compose -f docker-compose.production.yml up -d --build frontend
```
