FROM node:lts-slim AS development

WORKDIR /app
COPY package.json ./
RUN yarn

COPY . .

EXPOSE 8080
CMD ["yarn", "dev"]

# Created production image based on this tutorial: 
# https://snyk.io/de/blog/10-best-practices-to-containerize-nodejs-web-applications-with-docker/
FROM node:20.11.1-bullseye-slim AS production

WORKDIR /usr/src/app

COPY package.json .
RUN yarn

COPY --chown=node:node . .
# COPY . .

RUN yarn build

ENV NODE_ENV production
USER node
CMD ["node", "build"]