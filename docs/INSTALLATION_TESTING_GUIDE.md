# Dual Avatar Platform - Complete Installation & Testing Guide

This guide will walk you through installing, configuring, and testing all features of the Dual Avatar Platform.

## Table of Contents

1. [Prerequisites Verification](#prerequisites-verification)
2. [Installation](#installation)
3. [Configuration](#configuration)
4. [Starting the Platform](#starting-the-platform)
5. [Testing Core Features](#testing-core-features)
6. [Testing Advanced Video Editing](#testing-advanced-video-editing)
7. [Troubleshooting](#troubleshooting)

---

## Prerequisites Verification

### 1. Check Docker Installation

```bash
# Check Docker version (need 20.10+)
docker --version

# Check Docker Compose version (need 2.0+)
docker-compose --version

# Verify Docker is running
docker ps
```

**Expected output:**
```
Docker version 20.10.x or higher
Docker Compose version v2.x.x or higher
CONTAINER ID   IMAGE   ...  (empty list is fine)
```

### 2. Check System Requirements

```bash
# Check available RAM (need 32GB+, recommended 64GB)
free -h

# Check available disk space (need 200GB+)
df -h

# Check CPU cores (need 8+)
nproc

# For GPU support (optional but recommended)
nvidia-smi
```

### 3. Check Network Ports

Ensure these ports are available:

```bash
# Check if ports are free
sudo lsof -i :3000  # Frontend
sudo lsof -i :8080  # Backend
sudo lsof -i :8000  # Autonomous Orchestrator
sudo lsof -i :9000  # MinIO
sudo lsof -i :9001  # MinIO Console
sudo lsof -i :5678  # n8n
sudo lsof -i :3001  # Grafana
sudo lsof -i :9090  # Prometheus
```

All should return empty (ports free).

---

## Installation

### Step 1: Clone Repository

```bash
# Clone the repository
git clone https://github.com/mvallautomations/dual-avatar-platform.git
cd dual-avatar-platform

# Verify you're on the correct branch
git checkout claude/complete-codebase-011CUzFPH15a1A1gSzYDUKBK

# Check repository structure
ls -la
```

**Expected files:**
```
.env.example
.gitignore
docker-compose.yml
README.md
GETTING_STARTED.md
CONTRIBUTING.md
platforms/
shared/
infrastructure/
docs/
.github/
```

### Step 2: Run Setup Script

```bash
# Make setup script executable
chmod +x infrastructure/scripts/setup.sh

# Run setup
./infrastructure/scripts/setup.sh
```

**What this does:**
- Creates `.env` from `.env.example`
- Creates necessary directories
- Pulls base Docker images
- Builds service images
- Initializes databases

**Expected output:**
```
🚀 Setting up Dual Avatar Platform...
✅ .env file created
📁 Creating necessary directories...
📦 Pulling base Docker images...
🏗️  Building services...
🗄️  Initializing databases...
✅ Setup completed successfully!
```

---

## Configuration

### Step 1: Edit Environment Variables

```bash
# Open .env file for editing
nano .env
```

### Step 2: Update Critical Values

**⚠️ IMPORTANT: Change these from defaults!**

```bash
# Security - Change these!
MANUAL_JWT_SECRET=YOUR_RANDOM_STRING_MIN_32_CHARS_HERE
NEXTAUTH_SECRET=YOUR_NEXTAUTH_SECRET_MIN_32_CHARS_HERE
MINIO_ROOT_PASSWORD=YOUR_MINIO_PASSWORD
N8N_ENCRYPTION_KEY=YOUR_N8N_ENCRYPTION_KEY_MIN_32_CHARS

# Database passwords
POSTGRES_MANUAL_PASSWORD=YOUR_MANUAL_DB_PASSWORD
POSTGRES_AUTO_PASSWORD=YOUR_AUTO_DB_PASSWORD
POSTGRES_N8N_PASSWORD=YOUR_N8N_DB_PASSWORD

# Redis passwords
REDIS_MANUAL_PASSWORD=YOUR_MANUAL_REDIS_PASSWORD
REDIS_AUTO_PASSWORD=YOUR_AUTO_REDIS_PASSWORD

# Voice synthesis (optional, for production)
ELEVENLABS_API_KEY=YOUR_ELEVENLABS_KEY  # If using ElevenLabs
ELEVENLABS_VOICE_ID=YOUR_VOICE_ID

# OpenAI (optional, for transcription)
OPENAI_API_KEY=YOUR_OPENAI_KEY  # If using OpenAI Whisper API
```

**Generate random secrets:**

```bash
# Generate random 32-char strings for secrets
openssl rand -base64 32
```

### Step 3: Configure Service URLs (if needed)

```bash
# For local development, these are fine:
NEXT_PUBLIC_API_URL=http://localhost:8080/api/v1
NEXT_PUBLIC_WS_URL=ws://localhost:8080

# For production, update to your domain:
# NEXT_PUBLIC_API_URL=https://api.yourdomain.com/api/v1
# NEXT_PUBLIC_WS_URL=wss://api.yourdomain.com
```

### Step 4: Save Configuration

```bash
# Save and exit nano (Ctrl+X, Y, Enter)
# Verify configuration
cat .env | grep -v PASSWORD | grep -v SECRET | grep -v KEY
```

---

## Starting the Platform

### Step 1: Start All Services

```bash
# Start all services in background
docker-compose up -d

# This will start 17 services:
# - Manual Platform (Backend, Frontend, PostgreSQL, Redis)
# - Autonomous Platform (Orchestrator, PostgreSQL, Redis, Ollama, ComfyUI)
# - Shared Services (MinIO, n8n, Prometheus, Grafana)
```

### Step 2: Monitor Startup

```bash
# Watch all services start
docker-compose logs -f

# Or watch specific services
docker-compose logs -f manual-backend manual-frontend

# Press Ctrl+C to stop watching logs
```

**Wait for these messages:**
- `manual-backend` - "Manual Platform Backend running on port 8080"
- `manual-frontend` - "ready - started server on 0.0.0.0:3000"
- `autonomous-orchestrator` - "Application startup complete"

### Step 3: Check Service Health

```bash
# Check all services are running
docker-compose ps

# All services should show "Up" or "Up (healthy)"
```

**Expected output:**
```
NAME                    STATUS
postgres-manual         Up (healthy)
postgres-auto           Up (healthy)
postgres-n8n            Up (healthy)
redis-manual            Up (healthy)
redis-auto              Up (healthy)
minio                   Up (healthy)
manual-backend          Up (healthy)
manual-frontend         Up (healthy)
autonomous-orchestrator Up (healthy)
...
```

### Step 4: Run Database Migrations

```bash
# Run migrations for Manual Platform
docker-compose exec manual-backend npm run migrate

# Expected: Migrations applied successfully
```

### Step 5: Access the Platform

Open your browser and navigate to:

- **Manual Platform**: http://localhost:3000
- **Backend API**: http://localhost:8080/health
- **Autonomous API**: http://localhost:8000/health
- **MinIO Console**: http://localhost:9001
- **Grafana**: http://localhost:3001
- **Prometheus**: http://localhost:9090
- **n8n**: http://localhost:5678

**Health Check:**

```bash
# Check Manual Backend
curl http://localhost:8080/health

# Expected: {"status":"healthy",...}

# Check Autonomous Orchestrator
curl http://localhost:8000/health

# Expected: {"status":"healthy",...}

# Check Frontend
curl http://localhost:3000

# Expected: HTML response
```

---

## Testing Core Features

### Test 1: User Registration & Authentication

**Via Browser:**

1. Navigate to http://localhost:3000
2. Click "Get Started" or "Register"
3. Fill in registration form:
   - Name: Test User
   - Email: test@example.com
   - Password: TestPassword123!
4. Click "Register"
5. You should be logged in automatically

**Via API:**

```bash
# Register a user
curl -X POST http://localhost:8080/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test User",
    "email": "test@example.com",
    "password": "TestPassword123!"
  }'

# Expected response:
# {"success":true,"data":{"user":{...},"token":"..."}}

# Save the token
export TOKEN="<your-token-here>"
```

**Test Login:**

```bash
# Login
curl -X POST http://localhost:8080/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "TestPassword123!"
  }'

# Expected: {"success":true,"data":{"user":{...},"token":"..."}}
```

✅ **Success Criteria:**
- User created successfully
- Token received
- Can login with credentials

---

### Test 2: Create Project

```bash
# Create a project
curl -X POST http://localhost:8080/api/v1/projects \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "title": "My First Video Project",
    "description": "Testing the platform"
  }'

# Expected: {"success":true,"data":{"id":"...","title":"My First Video Project",...}}

# Save project ID
export PROJECT_ID="<project-id-from-response>"

# List projects
curl http://localhost:8080/api/v1/projects \
  -H "Authorization: Bearer $TOKEN"

# Expected: Array of projects including the one you created
```

✅ **Success Criteria:**
- Project created with unique ID
- Project appears in list
- Can retrieve project by ID

---

### Test 3: Create Character

```bash
# Create a character
curl -X POST http://localhost:8080/api/v1/characters \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "name": "Alex the Avatar",
    "voice_id": "default",
    "avatar_config": {
      "style": "realistic",
      "gender": "neutral"
    }
  }'

# Expected: {"success":true,"data":{"id":"...","name":"Alex the Avatar",...}}

# Save character ID
export CHARACTER_ID="<character-id-from-response>"
```

✅ **Success Criteria:**
- Character created successfully
- Avatar config stored as JSON
- Character retrievable by ID

---

### Test 4: Create Video

```bash
# Create a video
curl -X POST http://localhost:8080/api/v1/videos \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "project_id": "'$PROJECT_ID'",
    "title": "Test Video",
    "script": {
      "text": "Hello, this is a test video."
    },
    "timeline": {}
  }'

# Expected: {"success":true,"data":{"id":"...","title":"Test Video",...}}

# Save video ID
export VIDEO_ID="<video-id-from-response>"

# Get video details
curl http://localhost:8080/api/v1/videos/$VIDEO_ID \
  -H "Authorization: Bearer $TOKEN"
```

✅ **Success Criteria:**
- Video created in project
- Script stored as JSON
- Video has status "draft"

---

### Test 5: Upload Asset

```bash
# Create a test file
echo "Test content" > test.txt

# Upload as asset
curl -X POST http://localhost:8080/api/v1/assets/upload \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@test.txt" \
  -F "type=other" \
  -F "project_id=$PROJECT_ID"

# Expected: {"success":true,"data":{"id":"...","filename":"test.txt",...}}

# List assets
curl http://localhost:8080/api/v1/assets?project_id=$PROJECT_ID \
  -H "Authorization: Bearer $TOKEN"
```

✅ **Success Criteria:**
- File uploaded to MinIO
- Asset metadata in database
- Can retrieve asset URL

---

## Testing Advanced Video Editing

### Test 6: Audio Transcription

**Prepare test audio:**

```bash
# You'll need an actual audio file for this
# For testing, you can use a sample MP3 file

# Upload audio asset first
curl -X POST http://localhost:8080/api/v1/assets/upload \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@sample-audio.mp3" \
  -F "type=audio" \
  -F "project_id=$PROJECT_ID"

# Save the storage_key from response
export AUDIO_STORAGE_KEY="<storage-key-from-response>"
```

**Create transcription:**

```bash
# Start transcription
curl -X POST http://localhost:8080/api/v1/transcriptions/video/$VIDEO_ID \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "audioStorageKey": "'$AUDIO_STORAGE_KEY'",
    "language": "en"
  }'

# Expected: {"success":true,"data":{"transcriptionId":"..."},"message":"Transcription started"}

export TRANSCRIPTION_ID="<transcription-id-from-response>"

# Check status (wait a few moments)
curl http://localhost:8080/api/v1/transcriptions/video/$VIDEO_ID \
  -H "Authorization: Bearer $TOKEN"

# When status is "completed", you'll see segments with word-level timestamps
```

**Generate subtitles:**

```bash
# Generate subtitles from transcription
curl -X POST http://localhost:8080/api/v1/transcriptions/$TRANSCRIPTION_ID/subtitles \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "maxCharsPerLine": 42,
    "maxDuration": 5
  }'

# Expected: {"success":true,"data":{"subtitleTrackId":"..."}}
```

**Export transcription:**

```bash
# Export as SRT
curl http://localhost:8080/api/v1/transcriptions/$TRANSCRIPTION_ID/export?format=srt \
  -H "Authorization: Bearer $TOKEN" \
  -o transcription.srt

# Check file
cat transcription.srt
```

✅ **Success Criteria:**
- Transcription processes successfully
- Segments include word-level timestamps
- Subtitles generated with proper timing
- Can export to SRT/VTT/TXT/JSON

---

### Test 7: Eye Contact Mapping

**Note:** This requires actual video with visible faces.

```bash
# Upload video asset
curl -X POST http://localhost:8080/api/v1/assets/upload \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@sample-video.mp4" \
  -F "type=video" \
  -F "project_id=$PROJECT_ID"

export VIDEO_STORAGE_KEY="<storage-key-from-response>"

# Start eye tracking
curl -X POST http://localhost:8080/api/v1/eye-tracking/video/$VIDEO_ID \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "videoStorageKey": "'$VIDEO_STORAGE_KEY'",
    "targetPosition": {"x": 0, "y": 0, "z": 1},
    "correctionStrength": 0.8,
    "smoothing": 0.6,
    "preserveBlinking": true,
    "framerate": 30
  }'

# Expected: {"success":true,"data":{"eyeTrackingId":"..."},"message":"Eye tracking started"}

export EYE_TRACKING_ID="<eye-tracking-id-from-response>"

# Check status (this takes a while)
curl http://localhost:8080/api/v1/eye-tracking/video/$VIDEO_ID \
  -H "Authorization: Bearer $TOKEN"

# When complete, get metrics
curl http://localhost:8080/api/v1/eye-tracking/video/$VIDEO_ID/metrics \
  -H "Authorization: Bearer $TOKEN"

# Expected: {"success":true,"data":{"averageConfidence":0.92,"eyeContactPercentage":78.5,...}}

# Get gaze heatmap
curl http://localhost:8080/api/v1/eye-tracking/video/$VIDEO_ID/heatmap \
  -H "Authorization: Bearer $TOKEN" \
  -o heatmap.json
```

✅ **Success Criteria:**
- Eye tracking completes successfully
- Metrics show confidence, contact %, blinks
- Heatmap data generated
- Can apply correction to video

---

### Test 8: Timeline Editing

```bash
# Get current timeline
curl http://localhost:8080/api/v1/timeline/video/$VIDEO_ID \
  -H "Authorization: Bearer $TOKEN"

# Create a video clip
curl -X POST http://localhost:8080/api/v1/timeline/video/$VIDEO_ID/clips \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "type": "video",
    "startTime": 0,
    "endTime": 10,
    "trackIndex": 0,
    "sourceAssetId": "'$ASSET_ID'",
    "properties": {
      "position": {"x": 0, "y": 0},
      "scale": {"x": 1, "y": 1},
      "opacity": 1
    },
    "volume": 1,
    "muted": false
  }'

# Expected: {"success":true,"data":{"id":"...","type":"video",...}}

export CLIP_ID="<clip-id-from-response>"

# Trim clip
curl -X POST http://localhost:8080/api/v1/timeline/clips/$CLIP_ID/trim \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "startTime": 2,
    "endTime": 8
  }'

# Split clip
curl -X POST http://localhost:8080/api/v1/timeline/clips/$CLIP_ID/split \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "splitTime": 5
  }'

# Expected: Two new clips

# Check for collisions
curl http://localhost:8080/api/v1/timeline/video/$VIDEO_ID/collisions \
  -H "Authorization: Bearer $TOKEN"

# Validate timeline
curl http://localhost:8080/api/v1/timeline/video/$VIDEO_ID/validate \
  -H "Authorization: Bearer $TOKEN"

# Expected: {"success":true,"data":{"valid":true,"errors":[]}}
```

✅ **Success Criteria:**
- Clips can be created on timeline
- Trim operation adjusts clip times
- Split creates two separate clips
- Collision detection works
- Timeline validates correctly

---

### Test 9: Autonomous Platform (Batch Processing)

```bash
# Create a template
curl -X POST http://localhost:8000/api/v1/templates \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Simple Avatar Template",
    "description": "Basic avatar video template",
    "config": {
      "voice": "default",
      "avatar": "realistic",
      "background": "white"
    }
  }'

# Expected: {"success":true,"data":{"id":"...","name":"Simple Avatar Template",...}}

export TEMPLATE_ID="<template-id-from-response>"

# Create a batch job
curl -X POST http://localhost:8000/api/v1/batch \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Batch",
    "description": "Testing batch processing",
    "template_id": "'$TEMPLATE_ID'",
    "jobs": [
      {
        "config": {},
        "input_data": {"text": "Hello from batch job 1"}
      },
      {
        "config": {},
        "input_data": {"text": "Hello from batch job 2"}
      }
    ]
  }'

# Expected: {"success":true,"data":{"id":"...","total_jobs":2,...}}

export BATCH_ID="<batch-id-from-response>"

# Check batch status
curl http://localhost:8000/api/v1/batch/$BATCH_ID

# List jobs in batch
curl http://localhost:8000/api/v1/jobs/batch/$BATCH_ID
```

✅ **Success Criteria:**
- Template created successfully
- Batch with multiple jobs created
- Jobs are queued for processing
- Can retrieve batch status

---

### Test 10: Monitoring & Metrics

**Access Grafana:**

1. Open http://localhost:3001
2. Login with:
   - Username: `admin`
   - Password: (from GRAFANA_ADMIN_PASSWORD in .env)
3. Navigate to Dashboards
4. Check for Prometheus data source

**Access Prometheus:**

1. Open http://localhost:9090
2. Go to Status → Targets
3. Verify all services are being scraped
4. Try a query: `up{job="manual-backend"}`

**Check MinIO:**

1. Open http://localhost:9001
2. Login with:
   - Username: (MINIO_ROOT_USER from .env)
   - Password: (MINIO_ROOT_PASSWORD from .env)
3. Check "avatar-platform" bucket exists
4. Verify uploaded files are present

✅ **Success Criteria:**
- Grafana accessible and configured
- Prometheus collecting metrics
- MinIO storing files correctly
- All services showing as healthy

---

## Troubleshooting

### Issue: Services won't start

**Check logs:**
```bash
docker-compose logs <service-name>
```

**Common causes:**
- Port already in use: `sudo lsof -i :<port>` to find and kill process
- Insufficient resources: Check `docker stats`
- Permission issues: Run with `sudo` or add user to docker group

### Issue: Database connection errors

**Check PostgreSQL:**
```bash
# Check if PostgreSQL is running
docker-compose ps postgres-manual

# Check logs
docker-compose logs postgres-manual

# Connect to database
docker-compose exec postgres-manual psql -U manual_user -d manual_platform

# Inside psql, check tables
\dt
\q
```

**Fix:**
```bash
# Restart database
docker-compose restart postgres-manual

# Re-run migrations
docker-compose exec manual-backend npm run migrate
```

### Issue: Frontend can't connect to backend

**Check network:**
```bash
# Test backend from frontend container
docker-compose exec manual-frontend curl http://manual-backend:8080/health

# Check CORS settings in .env
grep CORS .env
```

**Fix:**
```bash
# Update .env
MANUAL_CORS_ORIGIN=http://localhost:3000

# Restart backend
docker-compose restart manual-backend
```

### Issue: File uploads failing

**Check MinIO:**
```bash
# Check MinIO is running
docker-compose ps minio

# Check MinIO logs
docker-compose logs minio

# Test connection
curl http://localhost:9000/minio/health/live
```

**Fix:**
```bash
# Restart MinIO
docker-compose restart minio

# Recreate bucket manually via MinIO console
```

### Issue: Eye tracking or transcription failing

**These require external services. Check:**

```bash
# Eye tracking service (if configured)
curl http://localhost:8001/health

# Whisper service (if using local)
curl http://localhost:9000/v1/health
```

**For development/testing:**
- Eye tracking can be mocked or use OpenCV locally
- Transcription can use OpenAI API by setting OPENAI_API_KEY

### Complete Reset

If everything is broken:

```bash
# Stop all services
docker-compose down

# Remove all data (WARNING: destructive!)
docker-compose down -v
rm -rf shared/storage/*

# Start fresh
./infrastructure/scripts/setup.sh
docker-compose up -d
docker-compose exec manual-backend npm run migrate
```

---

## Next Steps

After successfully testing all features:

1. **Customize Configuration**
   - Add your ElevenLabs API key for voice synthesis
   - Configure custom ComfyUI workflows
   - Set up custom Grafana dashboards

2. **Deploy to Production**
   - Use the deploy script: `./infrastructure/scripts/deploy.sh production`
   - Set up SSL certificates
   - Configure domain names
   - Enable backups

3. **Integrate External Services**
   - Set up actual Whisper service for transcription
   - Deploy eye tracking service (MediaPipe/OpenCV)
   - Configure n8n workflows for automation

4. **Scale Services**
   - Use Kubernetes manifests in `infrastructure/kubernetes/`
   - Set up load balancing
   - Configure auto-scaling

---

## Summary Checklist

- [ ] All prerequisites verified
- [ ] Platform installed successfully
- [ ] Environment configured
- [ ] All 17 services running
- [ ] Database migrations applied
- [ ] User registration works
- [ ] Projects and videos created
- [ ] Assets uploaded to MinIO
- [ ] Transcription tested
- [ ] Eye tracking tested
- [ ] Timeline editing tested
- [ ] Batch processing tested
- [ ] Monitoring dashboards accessible

**You're now ready to use the Dual Avatar Platform!** 🎉

For questions or issues:
- Check [GETTING_STARTED.md](../GETTING_STARTED.md)
- Review [Advanced Video Editing docs](./ADVANCED_VIDEO_EDITING.md)
- File an issue on GitHub
