<p align="center">
    <picture>
        <source media="(prefers-color-scheme: dark)" srcset="./.github/logo-dark.webp">
        <source media="(prefers-color-scheme: light)" srcset="./.github/logo-light.webp">
        <img alt="knowledge spaces" src="./.github/logo-light.webp" width="800" height="400" style="max-width: 100%;">
    </picture>
</p>

# knowledge spaces

Recent developments in AI in 2022 and 2023 have led to a large number of newly released tools based on large language models, such as [ChatGPT](https://chat.openai.com/), [Bing Chat](https://copilot.microsoft.com/) or [Bard](https://bard.google.com/chat). While these models are impressive, it has become increasingly clear that they don't know everything. This raises questions about the limits of AI's knowledge, the nature of latent spaces, and their accessibility.

The aim of this project is to explore new ways of visualising and exploring latent spaces and making them more accessible for the public. It does this through a web interface that provides users with an interactive platform to explore and search high-dimensional vector embeddings, visualised on a two-dimensional `<canvas>`. Each high-dimensional vector embedding will be represented as a cross in the `<canvas>`, and each search will generate a new cross on the `<canvas>`, drawing connections between similar pieces of data in the embedding space. The resulting network of interconnected information will be visually similar to a map of an underground railway network, following [recent studies](https://www.ted.com/talks/manuel_lima_a_visual_history_of_human_knowledge) that suggest knowledge is best represented as rich, interconnected networks rather than linear trees.

See [✨ are.na](https://www.are.na/francesco-scheffczyk/knowledge-spaces) for a collection of sources on which my research is based on.

## 📝 Colophon

- Fonts in use:
  - Times New Roman by Stanley Morison und Victor Lardent
  - Helvetica by Max Miedinger
- Technology:
  - Frontend:
    - Build with [SvelteKit](https://kit.svelte.dev/)
    - Canvas powered by [Konva](https://konvajs.org/)
    - Modals are created with [svelte-modals](https://svelte-modals.mattjennings.io/)
  - Backend:
    - Build with [FastAPI](https://fastapi.tiangolo.com/)
    - Datasets are fetched through the [🤗 Datasets library](https://huggingface.co/docs/datasets/index)
    - Creating embeddings and searching is made possible thanks to [Sentence Transformers](https://www.sbert.net/)

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
