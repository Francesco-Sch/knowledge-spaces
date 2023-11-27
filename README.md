<p align="center">
    <picture>
        <source media="(prefers-color-scheme: dark)" srcset="./.github/logo-dark.webp">
        <source media="(prefers-color-scheme: light)" srcset="./.github/logo-light.webp">
        <img alt="knowledge spaces" src="./.github/logo-light.webp" width="800" height="400" style="max-width: 100%;">
    </picture>
</p>

# knowledge spaces

> Visualizing the knowledge of Large Language AI models.

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

## ⚙️ Technical implementation

### Processing the datasets

In order to make a text datasets searchable and two-dimensional, it had to be processed in two steps. First, it had to be converted into vector embeddings. As these vector embeddings are usually multi-dimensional, a second processing step must be added to reduce the information value of the multi-dimensional vector to two dimensions. By reducing the vectors to two dimensions, they can be rendered.

The [sentence transformers library](https://www.sbert.net/), specifically the `multi-qa-MiniLM-L6-cos-v1` model, was used for vector encoding of the data sets. [Truncated singular value decomposition (TruncatedSVD)](https://scikit-learn.org/stable/modules/generated/sklearn.decomposition.TruncatedSVD.html#sklearn.decomposition.TruncatedSVD) was then used to reduce the information density of the vector embeddings to two dimensions. This transformation is also known as latent semantic analysis (LSA). I chose TruncatedSVD over tSNE because it always produces the same two-dimensional vectors given the same multi-dimensional vectors. The [scikit-learn](https://scikit-learn.org/stable/index.html) implementation of TruncatedSVD was used to apply this transformation.

Both embedding datasets, the multi-dimensional and the two-dimensional, were stored on Huggingface via its [🤗 Datasets library](https://huggingface.co/docs/datasets/index).

#### List of processed Datasets

- [20Newsgroups](http://qwone.com/~jason/20Newsgroups/)
  - [Multi-dimensional vector embeddings](https://huggingface.co/datasets/fscheffczyk/20newsgroups_embeddings)
  - [Two-dimensional vector embeddings](https://huggingface.co/datasets/fscheffczyk/2D_20newsgroups_embeddings)

Different datasets should be added in the future. This issue keeps track of them: [#4](https://github.com/Francesco-Sch/knowledge-spaces/issues/4).

### Building the search function

### Rendering the embeddings and search results

- calling api
- map the returned values to screen size
- safe searches to localstorage to make them persistent

## 🚧 Development

Docker must be installed and running to start the development setup. Instructions on how to install Docker for your OS can be found [here](https://docs.docker.com/desktop/install/mac-install/).

To start a development setup run:

```bash
docker compose -f docker-compose.dev.yml up -d
```

This starts the frontend on `http://localhost:8080` and the backend on `http://localhost:7100`.
Both have a watch services enabled and reload automatically, when changes to the source code were made.

To rebuild the development setup run:

```bash
docker compose -f docker-compose.dev.yml up -d --build
```

To rebuild only a specific container run:

```bash
docker compose -f docker-compose.dev.yml up -d --build frontend
```

## 🐳 Deploy with Docker

To deploy this project to your server, the images need to be availabe on a container registry such as [Docker Hub](https://hub.docker.com/). The easiest way to do this, is to use the GitHub Action of this repository.

### 1. Add secrets to GitHub Repo

To push the images to Docker Hub you need to add a secret for your username and a secret for your Docker Hub access token to the GitHub Repo.

Navigate for that to `Settings > Secrets and Variables > Actions` of the Github Repo and create two new secrets called `DOCKER_HUB_USERNAME` and `DOCKER_HUB_ACCESS_TOKEN`.

Add your Docker Hub username and your access token, to the newly created secrets. To create a new access token for Docker Hub, log in to your profile, navigate to `Account Settings > Security` and click on "New Access Token".

### 2. Push images

With the next push on `main` the images will be pushed to [Docker Hub](https://hub.docker.com/).

### 3. Pull images and start the containers

One option would be to use a managed Docker service to pull your images and start the containers automatically.

Otherwise you can log into your server via SSH and execute the following command to pull the images and start the containers:

```bash
# Pull and run the backend image
docker run -d --name backend_knowledge-spaces -p 7100:7100 <YOUR_DOCKER_HUB_USERNAME>/backend_knowledge-spaces:latest

# Pull and run the frontend image
docker run -d --name frontend_knowledge-spaces -p 8080:80 <YOUR_DOCKER_HUB_USERNAME>/frontend_knowledge-spaces:latest
```
