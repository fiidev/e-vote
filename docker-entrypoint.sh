#!/bin/sh
set -e

echo "==> Synchronizing database schema with Prisma..."
if [ -n "$DATABASE_URL" ]; then
  ./node_modules/.bin/prisma db push --skip-generate || echo "==> Warning: Prisma db push failed, continuing startup..."
else
  echo "==> Warning: DATABASE_URL is not set, skipping prisma db push..."
fi

echo "==> Starting Next.js application on port ${PORT:-3000}..."
exec "$@"
