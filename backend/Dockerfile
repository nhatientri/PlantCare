FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install
USER node

# Install nodemon globally for dev
RUN npm install -g nodemon

COPY . .

# Expose port
EXPOSE 3000

# Start command (dev mode)
CMD ["nodemon", "src/server.js"]
