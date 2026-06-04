#!/bin/sh
set -e

echo "Running Prisma migrations..."

if [ "$NODE_ENV" = "production" ]; then
  npx prisma migrate deploy
else
  npx prisma migrate dev
fi

echo "Running seed..."
npx prisma db seed
# safe to run every time because seed uses upsert

echo "Starting..."
exec "$@"