# build angular
FROM node:20 as build

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

RUN npm run build

# nginx server
FROM nginx:alpine

COPY --from=build /app/dist/app /usr/share/nginx/html

EXPOSE 80
