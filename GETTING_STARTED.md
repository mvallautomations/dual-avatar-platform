# Getting Started with Dual Avatar Platform

This guide will help you set up and run the Dual Avatar Platform on your local machine.

## Prerequisites

Before you begin, ensure you have the following installed:

- **Docker** (v20.10 or higher)
- **Docker Compose** (v2.0 or higher)
- **Git**
- **Node.js** v18+ (for local development)
- **Python** 3.11+ (for local development)
- **NVIDIA GPU** (optional, for ComfyUI and Ollama acceleration)

## Quick Start

### 1. Clone the Repository

```bash
git clone https://github.com/yourusername/dual-avatar-platform.git
cd dual-avatar-platform
```

### 2. Run the Setup Script

```bash
chmod +x infrastructure/scripts/setup.sh
./infrastructure/scripts/setup.sh
```

This script will:
- Create a `.env` file from `.env.example`
- Create necessary directories
- Pull Docker base images
- Build service images
- Initialize databases

### 3. Configure Environment Variables

Edit the `.env` file and update the following critical values:

```bash
# Security - Change these!
MANUAL_JWT_SECRET=your-secure-random-string-min-32-chars
NEXTAUTH_SECRET=your-nextauth-secret-min-32-chars
MINIO_ROOT_PASSWORD=your-minio-password
N8N_ENCRYPTION_KEY=your-n8n-encryption-key-min-32-chars

# Database passwords
POSTGRES_MANUAL_PASSWORD=your-manual-db-password
POSTGRES_AUTO_PASSWORD=your-auto-db-password
POSTGRES_N8N_PASSWORD=your-n8n-db-password

# Redis passwords
REDIS_MANUAL_PASSWORD=your-manual-redis-password
REDIS_AUTO_PASSWORD=your-auto-redis-password

# Voice synthesis (if using ElevenLabs)
ELEVENLABS_API_KEY=your-elevenlabs-api-key
ELEVENLABS_VOICE_ID=your-voice-id
```

### 4. Start the Platform

```bash
docker-compose up -d
```

This will start all services in the background.

### 5. Verify Services are Running

```bash
docker-compose ps
```

All services should show as "Up" or "healthy".

### 6. Access the Platforms

- **Manual Platform Frontend**: http://localhost:3000
- **Manual Platform Backend API**: http://localhost:8080/api/v1
- **Autonomous Orchestrator API**: http://localhost:8000/api/v1
- **MinIO Console**: http://localhost:9001 (login with MINIO_ROOT_USER/MINIO_ROOT_PASSWORD)
- **n8n Workflow Automation**: http://localhost:5678
- **Grafana Monitoring**: http://localhost:3001 (default: admin/admin)
- **Prometheus**: http://localhost:9090

## Initial Setup

### Create Your First User (Manual Platform)

1. Navigate to http://localhost:3000
2. Click "Register" or use the API:

```bash
curl -X POST http://localhost:8080/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Your Name",
    "email": "your@email.com",
    "password": "secure-password"
  }'
```

### Test the Autonomous Platform

```bash
# Create a template
curl -X POST http://localhost:8000/api/v1/templates \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Template",
    "description": "A simple test template",
    "config": {
      "voice": "default",
      "avatar": "realistic"
    }
  }'

# Create a batch job
curl -X POST http://localhost:8000/api/v1/batch \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Batch",
    "description": "First batch job",
    "jobs": [
      {
        "config": {},
        "input_data": {"text": "Hello, world!"}
      }
    ]
  }'
```

## Development Mode

### Manual Platform Backend

```bash
cd platforms/manual/backend
npm install
npm run dev
```

### Manual Platform Frontend

```bash
cd platforms/manual/frontend
npm install
npm run dev
```

### Autonomous Orchestrator

```bash
cd platforms/autonomous/orchestrator
pip install -r requirements.txt
uvicorn src.main:app --reload
```

## Common Operations

### View Logs

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f manual-backend
docker-compose logs -f autonomous-orchestrator
```

### Stop the Platform

```bash
docker-compose stop
```

### Restart a Service

```bash
docker-compose restart manual-backend
```

### Rebuild a Service

```bash
docker-compose build manual-backend
docker-compose up -d manual-backend
```

### Run Database Migrations

```bash
# Manual platform
docker-compose exec manual-backend npm run migrate

# Autonomous platform
docker-compose exec autonomous-orchestrator alembic upgrade head
```

## Troubleshooting

### Services Won't Start

1. Check Docker is running: `docker ps`
2. Check logs: `docker-compose logs [service-name]`
3. Ensure ports are not in use: `lsof -i :3000,8080,8000`

### Database Connection Issues

1. Verify PostgreSQL is running: `docker-compose ps postgres-manual`
2. Check credentials in `.env`
3. Test connection:
   ```bash
   docker-compose exec postgres-manual psql -U manual_user -d manual_platform
   ```

### Out of Memory

1. Increase Docker memory limit (Docker Desktop → Settings → Resources)
2. Reduce number of workers in `.env`:
   ```
   MANUAL_WORKERS=2
   AUTONOMOUS_WORKERS=2
   ```

### GPU Not Detected

1. Install NVIDIA Container Toolkit
2. Verify: `docker run --gpus all nvidia/cuda:11.8.0-base-ubuntu22.04 nvidia-smi`

## Next Steps

- Read the [Architecture Documentation](docs/architecture/)
- Explore [API Documentation](docs/api/)
- Check out [Example Workflows](docs/workflows/)
- Join our [Community](https://discord.gg/yourinvite)

## Support

- **Issues**: https://github.com/yourusername/dual-avatar-platform/issues
- **Discussions**: https://github.com/yourusername/dual-avatar-platform/discussions
- **Discord**: https://discord.gg/yourinvite

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
