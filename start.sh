#!/bin/bash
set -e

DIR="$(cd "$(dirname "$0")" && pwd)"

echo "Starting Docker container..."
docker compose -f "$DIR/docker-compose.yml" up -d

echo "Installing dashboard dependencies..."
cd "$DIR/dashboard"
npm install --cache /tmp/npm-cache

echo "Starting dashboard..."
node server.js
