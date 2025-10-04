#!/bin/bash

# Railway runtime startup script
# Runs migrations and starts the application

echo "Starting Railway deployment..."

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
    echo "ERROR: DATABASE_URL is not set"
    exit 1
fi

echo "Running Prisma migrations..."
npx prisma migrate deploy

# Check if migrations succeeded
if [ $? -ne 0 ]; then
    echo "ERROR: Migration failed"
    exit 1
fi

echo "Starting Next.js application..."
npm start