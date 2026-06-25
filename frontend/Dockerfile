FROM node:22-alpine
WORKDIR /app

# Copy manifests first for layer caching
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci

# Copy the rest of the frontend source
COPY frontend/ .

EXPOSE 5173

# --host binds Vite to 0.0.0.0 so the port is reachable outside the container
CMD ["npm", "run", "dev", "--", "--host"]
