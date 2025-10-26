FROM node:20
WORKDIR /app
COPY package*.json ./
RUN npm install
RUN npm install -g nodemon
COPY . .
EXPOSE 8011
CMD ["nodemon", "src/index.js"]
