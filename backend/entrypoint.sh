#!/bin/sh
set -e

case "$APP_MODE" in
  web)
    echo "Running migrations..."
    php artisan migrate --force

    echo "Caching config, routes, views..."
    php artisan config:cache
    php artisan route:cache
    php artisan view:cache

    echo "Starting php-fpm..."
    php-fpm -D

    echo "Starting nginx..."
    exec nginx -g "daemon off;"
    ;;
  reverb)
    exec php artisan reverb:start --host=0.0.0.0 --port=8080
    ;;
  queue)
    exec php artisan queue:work --sleep=1 --tries=3
    ;;
  *)
    echo "Unknown APP_MODE: $APP_MODE" && exit 1
    ;;
esac
