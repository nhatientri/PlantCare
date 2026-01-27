FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install
USER node

# Start command
CMD ["npm", "start"]
