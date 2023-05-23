FROM node:lts-slim AS build

WORKDIR /app
COPY . . 
RUN yarn && yarn build

FROM nginx:stable AS production

WORKDIR /usr/share/nginx/html
RUN rm -rf ./*
COPY --from=build /app/build .
ENTRYPOINT ["nginx", "-g", "daemon off;"]
