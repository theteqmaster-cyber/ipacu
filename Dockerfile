# Stage 1: Build Vite frontend
FROM node:20-alpine AS builder
WORKDIR /app

ARG VITE_GROQ_API_KEY
ARG VITE_GROQ_API_URL
ARG VITE_GROQ_MODEL

ENV VITE_GROQ_API_KEY=$VITE_GROQ_API_KEY
ENV VITE_GROQ_API_URL=$VITE_GROQ_API_URL
ENV VITE_GROQ_MODEL=$VITE_GROQ_MODEL

COPY package*.json ./
RUN npm ci || npm install
COPY . .
RUN npm run build

# Stage 2: Production PHP-FPM + Nginx server
FROM php:8.3-fpm-alpine

# Install Nginx and required dependencies
RUN apk add --no-cache nginx curl libpng-dev libjpeg-turbo-dev freetype-dev

# Configure Nginx
COPY nginx.conf /etc/nginx/nginx.conf

# Set working directory
WORKDIR /var/www/html

# Copy application backend and source files
COPY . /var/www/html/

# Copy built frontend assets from builder stage
COPY --from=builder /app/dist /var/www/html/dist

# Set permissions
RUN chown -R www-data:www-data /var/www/html

EXPOSE 80

CMD ["sh", "-c", "php-fpm -D && nginx -g 'daemon off;'"]
