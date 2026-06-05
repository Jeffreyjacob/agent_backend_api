#!/bin/sh
set -e

echo "Running Prisma migrations..."
if [ "$NODE_ENV" = "production" ]; then
  npx prisma migrate deploy
else
  npx prisma migrate dev --skip-seed
fi

echo "Running seed..."
node dist/seed.js

echo "Starting..."
exec "$@"