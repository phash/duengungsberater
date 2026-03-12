FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package.json package-lock.json ./

# Install dependencies
RUN npm ci

# Copy project
COPY . .

# Expose Vite dev server port
EXPOSE 5173

# Run dev server with host binding to allow external access
CMD ["npm", "run", "dev", "--", "--host"]
