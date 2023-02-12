FROM node:19

ENV NODE_ENV development

WORKDIR /app
COPY ["package.json", "yarn.lock", "./" ]

RUN yarn install

EXPOSE 3000 
EXPOSE 24678