FROM node:lts-slim AS development

WORKDIR /app
COPY package.json yarn.lock ./
RUN yarn

COPY . .

EXPOSE 8080
CMD ["yarn", "dev"]

FROM node:lts-slim AS build

WORKDIR /app
COPY . . 
RUN yarn && yarn build

FROM nginx:stable AS production

WORKDIR /usr/share/nginx/html
RUN rm -rf ./*
COPY --from=build /app/build .
ENTRYPOINT ["nginx", "-g", "daemon off;"]
