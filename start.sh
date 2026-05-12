#!/bin/bash
set -e

DIR="$(cd "$(dirname "$0")" && pwd)"

echo "Starting Docker container..."
docker compose -f "$DIR/docker-compose.yml" up -d

echo "Starting dashboard..."
cd "$DIR/dashboard"
node server.js
