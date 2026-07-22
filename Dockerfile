FROM php:8.3-fpm-alpine

# Install Nginx and required dependencies
RUN apk add --no-cache nginx curl libpng-dev libjpeg-turbo-dev freetype-dev

# Configure Nginx
COPY nginx.conf /etc/nginx/nginx.conf

# Set working directory
WORKDIR /var/www/html

# Copy application files
COPY . /var/www/html/

# Permissions
RUN chown -R www-data:www-data /var/www/html

EXPOSE 80

CMD ["sh", "-c", "php-fpm -D && nginx -g 'daemon off;'"]
