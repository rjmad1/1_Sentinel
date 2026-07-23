# Multi-stage Dockerfile for Sentinel EIIP Integration Backend & UI

# Stage 1: Build React SPA frontend
FROM node:22-alpine AS frontend-builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Stage 2: Python FastAPI Service Environment
FROM python:3.11-slim AS backend
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Copy Python requirements & install
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend source & built static files
COPY Phase2_Integration /app/Phase2_Integration
COPY --from=frontend-builder /app/dist /app/static

ENV PORT=8000
ENV DEVELOPMENT_MODE=false

EXPOSE 8000

CMD ["uvicorn", "Phase2_Integration.Backend.main:app", "--host", "0.0.0.0", "--port", "8000"]
