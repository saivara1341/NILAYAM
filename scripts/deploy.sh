#!/bin/bash
set -e

# ==============================================================================
# Nilayam Master Deployment Script (Zero-Downtime capable via Docker Swarm/Compose)
# Usage: ./deploy.sh [version_tag]
# ==============================================================================

export IMAGE_TAG=${1:-latest}
echo "Starting deployment for version: $IMAGE_TAG"

# 1. Backup Database before we do anything
echo "Taking pre-deploy database backup..."
./scripts/db-backup.sh || echo "Warning: Backup failed, but continuing..."

# 2. Pull new images
echo "Pulling new images..."
docker-compose -f docker-compose.prod.yml pull

# 3. Run Database Migrations
echo "Running database migrations..."
./scripts/db-migrate.sh up

# 4. Deploy (Rolling update if using scale > 1)
echo "Deploying containers..."
docker-compose -f docker-compose.prod.yml up -d --no-deps frontend backend proxy

# 5. Healthcheck
echo "Waiting for services to stabilize..."
sleep 15
./scripts/healthcheck.sh

echo "Deployment of $IMAGE_TAG successful! 🚀"
