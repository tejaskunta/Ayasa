FROM node:22-slim

WORKDIR /app

# Install deps first for layer caching.
COPY package.json ./
RUN npm install --omit=dev

COPY . .

EXPOSE 5000
CMD ["node", "server.js"]