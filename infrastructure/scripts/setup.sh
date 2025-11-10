#!/bin/bash

# =============================================================================
# Dual Avatar Platform - Setup Script
# =============================================================================
# This script sets up the development environment

set -e

echo "🚀 Setting up Dual Avatar Platform..."

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker first."
    exit 1
fi

# Check if Docker Compose is installed
if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose is not installed. Please install Docker Compose first."
    exit 1
fi

# Create .env file if it doesn't exist
if [ ! -f .env ]; then
    echo "📝 Creating .env file from .env.example..."
    cp .env.example .env
    echo "⚠️  Please update .env with your configuration values"
else
    echo "✅ .env file already exists"
fi

# Create necessary directories
echo "📁 Creating necessary directories..."
mkdir -p shared/storage/{videos,assets,models}
mkdir -p shared/monitoring/{prometheus,grafana}
mkdir -p logs/{manual-backend,manual-frontend,autonomous-orchestrator}

# Set permissions
echo "🔐 Setting permissions..."
chmod +x infrastructure/scripts/*.sh

# Pull base images
echo "📦 Pulling base Docker images..."
docker-compose pull postgres-manual postgres-auto postgres-n8n redis-manual redis-auto minio prometheus grafana

# Build services
echo "🏗️  Building services..."
docker-compose build

# Initialize databases (without starting all services)
echo "🗄️  Initializing databases..."
docker-compose up -d postgres-manual postgres-auto postgres-n8n redis-manual redis-auto

# Wait for databases to be ready
echo "⏳ Waiting for databases to be ready..."
sleep 10

# Run database migrations
echo "📊 Running database migrations..."
# Manual Platform
docker-compose run --rm manual-backend npm run migrate

# Autonomous Platform
# docker-compose run --rm autonomous-orchestrator alembic upgrade head

# Stop database containers
docker-compose stop

echo ""
echo "✅ Setup completed successfully!"
echo ""
echo "Next steps:"
echo "  1. Update .env with your configuration"
echo "  2. Run 'docker-compose up -d' to start all services"
echo "  3. Access the platforms:"
echo "     - Manual Platform: http://localhost:3000"
echo "     - Autonomous Orchestrator API: http://localhost:8000"
echo "     - Grafana: http://localhost:3001"
echo "     - MinIO: http://localhost:9001"
echo ""
