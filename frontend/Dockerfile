FROM node:lts-slim AS development

WORKDIR /app
RUN npm install --global pnpm@11.21.0
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

COPY . .

EXPOSE 8080
CMD ["pnpm", "dev"]

# Created production image based on this tutorial: 
# https://snyk.io/de/blog/10-best-practices-to-containerize-nodejs-web-applications-with-docker/
FROM node:24.19.0-bullseye-slim AS production

WORKDIR /usr/src/app

RUN npm install --global pnpm@11.21.0
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

COPY --chown=node:node . .
# COPY . .

RUN pnpm build

ENV NODE_ENV production
USER node
CMD ["node", "build"]