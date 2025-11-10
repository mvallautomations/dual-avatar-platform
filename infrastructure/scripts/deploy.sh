#!/bin/bash

# =============================================================================
# Dual Avatar Platform - Deployment Script
# =============================================================================
# This script deploys the platform to production

set -e

echo "🚀 Deploying Dual Avatar Platform..."

# Check environment
if [ -z "$1" ]; then
    echo "Usage: ./deploy.sh [environment]"
    echo "Example: ./deploy.sh production"
    exit 1
fi

ENVIRONMENT=$1

# Validate environment
if [ "$ENVIRONMENT" != "production" ] && [ "$ENVIRONMENT" != "staging" ]; then
    echo "❌ Invalid environment. Use 'production' or 'staging'"
    exit 1
fi

echo "📋 Deploying to: $ENVIRONMENT"

# Load environment variables
if [ -f ".env.$ENVIRONMENT" ]; then
    source ".env.$ENVIRONMENT"
else
    echo "❌ Environment file .env.$ENVIRONMENT not found"
    exit 1
fi

# Create backup
echo "💾 Creating backup..."
BACKUP_DIR="backups/$(date +%Y%m%d_%H%M%S)"
mkdir -p "$BACKUP_DIR"

# Backup databases
docker-compose exec -T postgres-manual pg_dump -U $POSTGRES_MANUAL_USER $POSTGRES_MANUAL_DB > "$BACKUP_DIR/manual_db.sql"
docker-compose exec -T postgres-auto pg_dump -U $POSTGRES_AUTO_USER $POSTGRES_AUTO_DB > "$BACKUP_DIR/auto_db.sql"

echo "✅ Backup created at $BACKUP_DIR"

# Pull latest changes
echo "📥 Pulling latest code..."
git pull origin main

# Build new images
echo "🏗️  Building Docker images..."
docker-compose -f docker-compose.yml -f "docker-compose.$ENVIRONMENT.yml" build

# Stop services gracefully
echo "🛑 Stopping services..."
docker-compose -f docker-compose.yml -f "docker-compose.$ENVIRONMENT.yml" stop

# Run database migrations
echo "📊 Running database migrations..."
docker-compose -f docker-compose.yml -f "docker-compose.$ENVIRONMENT.yml" run --rm manual-backend npm run migrate
# docker-compose -f docker-compose.yml -f "docker-compose.$ENVIRONMENT.yml" run --rm autonomous-orchestrator alembic upgrade head

# Start services
echo "▶️  Starting services..."
docker-compose -f docker-compose.yml -f "docker-compose.$ENVIRONMENT.yml" up -d

# Health checks
echo "🏥 Running health checks..."
sleep 10

# Check Manual Backend
if curl -f http://localhost:8080/health > /dev/null 2>&1; then
    echo "✅ Manual Backend is healthy"
else
    echo "❌ Manual Backend health check failed"
fi

# Check Manual Frontend
if curl -f http://localhost:3000 > /dev/null 2>&1; then
    echo "✅ Manual Frontend is healthy"
else
    echo "❌ Manual Frontend health check failed"
fi

# Check Autonomous Orchestrator
if curl -f http://localhost:8000/health > /dev/null 2>&1; then
    echo "✅ Autonomous Orchestrator is healthy"
else
    echo "❌ Autonomous Orchestrator health check failed"
fi

# Clean up old images
echo "🧹 Cleaning up old images..."
docker image prune -f

echo ""
echo "✅ Deployment completed successfully!"
echo "📊 Check service status: docker-compose ps"
echo "📝 View logs: docker-compose logs -f [service-name]"
echo ""
