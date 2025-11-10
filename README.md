# dual-avatar-platform
Production-ready dual AI avatar platform
# Dual Avatar Platform

A production-ready dual-platform architecture for AI-powered avatar video generation, combining manual creative control with autonomous batch automation.

## 🎯 Overview

This platform provides infrastructure to run two complementary AI avatar systems:

- **Manual Platform**: High-quality, UI-driven content creation for client work
- **Autonomous Platform**: Batch automation for volume content generation
- **Shared Infrastructure**: Unified storage, workflows, and monitoring

## ✨ Key Features

### Manual Platform (UI-Driven)
- 🎨 Rich web interface for creative control
- ✏️ Script editor with real-time preview
- 👤 Custom character creation
- 🎬 Timeline-based video composition
- 🔊 Voice profile management
- 🎥 Frame-by-frame quality control

### Autonomous Platform (Batch Processing)
- ⚡ High-volume automated generation
- 📋 Template-based content creation
- 🤖 Local LLM for script enhancement (Ollama)
- 🖼️ AI image generation (ComfyUI)
- 🔊 Voice synthesis (ElevenLabs/Coqui)
- 📦 Batch job processing with Celery

### Shared Services
- 🗄️ Centralized storage (MinIO)
- 🔄 Smart workflow routing (n8n)
- 📊 Complete monitoring (Prometheus + Grafana)
- 🔐 Unified authentication
- 💰 Cost optimization

## 🏗️ Architecture
```
┌─────────────────────────────────────────────────────────────┐
│                     Dual Avatar Platform                     │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌─────────────────┐         ┌──────────────────┐          │
│  │  Manual Platform │         │ Autonomous       │          │
│  │  (UI-Driven)     │         │ Platform (Batch) │          │
│  │                  │         │                  │          │
│  │  • Frontend      │         │  • Orchestrator  │          │
│  │  • Backend       │         │  • Ollama        │          │
│  │  • PostgreSQL    │         │  • ComfyUI       │          │
│  │  • Redis         │         │  • Voice/Avatar  │          │
│  └────────┬─────────┘         └────────┬─────────┘          │
│           │                            │                    │
│           └────────────┬───────────────┘                    │
│                        │                                    │
│           ┌────────────▼─────────────┐                      │
│           │  Shared Infrastructure   │                      │
│           │                          │                      │
│           │  • MinIO (Storage)       │                      │
│           │  • n8n (Workflows)       │                      │
│           │  • Prometheus/Grafana    │                      │
│           └──────────────────────────┘                      │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

## 🚀 Quick Start

### Prerequisites

**Hardware:**
- CPU: 8+ cores
- RAM: 32GB+ (64GB recommended)
- GPU: NVIDIA GPU with 12GB+ VRAM
- Storage: 200GB+ SSD

**Software:**
- Docker 20.10+
- Docker Compose 2.0+
- NVIDIA Driver 525+
- NVIDIA Container Toolkit

### Installation
```bash
# Clone repository
git clone https://github.com/yourusername/dual-avatar-platform.git
cd dual-avatar-platform

# Configure environment
cp .env.example .env
nano .env  # Update passwords and API keys

# Run setup
chmod +x infrastructure/scripts/setup.sh
./infrastructure/scripts/setup.sh

# Deploy
chmod +x infrastructure/scripts/deploy.sh
./infrastructure/scripts/deploy.sh
```

### Access Services

After deployment:

- **Manual Platform**: http://localhost:3000
- **Autonomous API**: http://localhost:8000
- **MinIO Console**: http://localhost:9001
- **n8n Workflows**: http://localhost:5678
- **Grafana**: http://localhost:3001
- **Prometheus**: http://localhost:9090

## 📋 Usage Examples

### Manual Platform

1. Open http://localhost:3000
2. Create a new project
3. Design your character
4. Write or paste your script
5. Generate and preview video
6. Download final output

### Autonomous Platform

Generate a single video:
```bash
curl -X POST http://localhost:8000/api/v1/generate \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your_api_key" \
  -d '{
    "script": "Hello! Welcome to our channel.",
    "character": "professional-host",
    "voice": "professional-male",
    "settings": {
      "background": "office",
      "resolution": "1080p"
    }
  }'
```

Batch generation:
```bash
curl -X POST http://localhost:8000/api/v1/batch \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your_api_key" \
  -d '{
    "template_id": "news-update",
    "items": [
      {
        "variables": {
          "title": "Market Update",
          "content": "Stocks rose 2% today..."
        }
      },
      {
        "variables": {
          "title": "Weather Forecast",
          "content": "Sunny skies expected..."
        }
      }
    ]
  }'
```

## 📊 Performance

**Expected Metrics:**
- **Output**: 2-10x increase in total production
- **Cost**: 30-50% reduction per video
- **Manual Effort**: 60-80% reduction
- **Quality**: Maintained for high-value content

## 🛠️ Tech Stack

### Frontend
- React 18+ with Next.js 14
- TypeScript
- Tailwind CSS + shadcn/ui
- Redux Toolkit
- React Query

### Backend
- Node.js with Express (Manual)
- Python with FastAPI (Autonomous)
- PostgreSQL 15
- Redis 7
- Celery for task queue

### AI Services
- Ollama (Local LLM)
- ComfyUI (Image generation)
- ElevenLabs (Voice synthesis)
- FFmpeg (Video rendering)

### Infrastructure
- Docker & Docker Compose
- MinIO (Object storage)
- n8n (Workflow automation)
- Prometheus + Grafana (Monitoring)
- NGINX (Reverse proxy)

## 📚 Documentation

- [Getting Started Guide](GETTING_STARTED.md) - Complete setup walkthrough
- [Architecture Overview](docs/architecture/README.md) - System design details
- [API Documentation](docs/api/README.md) - API reference
- [Workflow Guide](docs/workflows/README.md) - Automation patterns
- [Contributing Guidelines](CONTRIBUTING.md) - Development guide
- [Troubleshooting](docs/troubleshooting/README.md) - Common issues

## 🔐 Security

- JWT authentication
- API key authorization
- Rate limiting
- Input validation
- SQL injection prevention
- CORS configuration
- Environment variable isolation
- Network segmentation

## 📈 Scaling

### Vertical Scaling
- GPU memory allocation
- CPU core assignment
- RAM limits per service

### Horizontal Scaling
```bash
# Scale autonomous workers
docker-compose up -d --scale autonomous-orchestrator=5

# Scale manual backend
docker-compose up -d --scale manual-backend=3
```

### Kubernetes
See `infrastructure/kubernetes/` for deployment manifests.

## 🤝 Contributing

We welcome contributions! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for:
- Code standards
- Development workflow
- Testing requirements
- Pull request process

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

Built with:
- [Ollama](https://ollama.ai) - Local LLM inference
- [ComfyUI](https://github.com/comfyanonymous/ComfyUI) - Image generation
- [ElevenLabs](https://elevenlabs.io) - Voice synthesis
- [n8n](https://n8n.io) - Workflow automation
- [MinIO](https://min.io) - Object storage

## 🔗 Links

- [Documentation](https://your-docs-site.com)
- [Issue Tracker](https://github.com/yourusername/dual-avatar-platform/issues)
- [Discussions](https://github.com/yourusername/dual-avatar-platform/discussions)
- [Changelog](CHANGELOG.md)

## 📞 Support

- 📖 [Documentation](https://your-docs-site.com)
- 💬 [GitHub Discussions](https://github.com/yourusername/dual-avatar-platform/discussions)
- 🐛 [Report Bug](https://github.com/yourusername/dual-avatar-platform/issues/new)
- ✨ [Request Feature](https://github.com/yourusername/dual-avatar-platform/issues/new)

---

**Status**: Production Ready ✅  
**Version**: 1.0.0  
**Last Updated**: 2025-11-10

Made with ❤️ for scalable AI avatar content creation