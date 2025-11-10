from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    # Application
    ENV: str = "development"
    PORT: int = 8000
    WORKERS: int = 4
    API_VERSION: str = "v1"

    # CORS
    CORS_ORIGIN: str = "*"

    # Database
    DATABASE_URL: str

    # Redis
    REDIS_HOST: str = "redis-auto"
    REDIS_PORT: int = 6379
    REDIS_PASSWORD: Optional[str] = None
    REDIS_DB: int = 0

    # Celery
    CELERY_BROKER_URL: str
    CELERY_RESULT_BACKEND: str

    # MinIO/S3
    MINIO_ENDPOINT: str
    MINIO_ACCESS_KEY: str
    MINIO_SECRET_KEY: str
    MINIO_BUCKET_NAME: str = "avatar-platform"
    MINIO_USE_SSL: bool = False

    # Ollama
    OLLAMA_BASE_URL: str = "http://ollama:11434"
    OLLAMA_MODEL: str = "llama2"

    # ComfyUI
    COMFYUI_BASE_URL: str = "http://comfyui:8188"

    # Voice Synthesis
    VOICE_PROVIDER: str = "elevenlabs"
    ELEVENLABS_API_KEY: Optional[str] = None
    ELEVENLABS_VOICE_ID: Optional[str] = None

    # Batch Processing
    MAX_BATCH_SIZE: int = 100
    BATCH_TIMEOUT_SECONDS: int = 3600
    MAX_CONCURRENT_JOBS: int = 10
    RETRY_ATTEMPTS: int = 3
    RETRY_DELAY_SECONDS: int = 5

    # Logging
    LOG_LEVEL: str = "INFO"

    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()
