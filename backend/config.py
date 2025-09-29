import os
from typing import Optional

class Settings:
    # API Configuration
    API_V1_STR: str = "/api/v1"
    PROJECT_NAME: str = "CVD Detection API"
    VERSION: str = "1.0.0"
    
    # Server Configuration
    HOST: str = os.getenv("HOST", "0.0.0.0")
    PORT: int = int(os.getenv("PORT", "8000"))
    
    # Database Configuration (for future use)
    DATABASE_URL: Optional[str] = os.getenv("DATABASE_URL")
    
    # Redis Configuration (for future use)
    REDIS_URL: Optional[str] = os.getenv("REDIS_URL", "redis://localhost:6379")
    
    # Kafka Configuration (for future use)
    KAFKA_BOOTSTRAP_SERVERS: str = os.getenv("KAFKA_BOOTSTRAP_SERVERS", "localhost:9092")
    KAFKA_FEEDBACK_TOPIC: str = os.getenv("KAFKA_FEEDBACK_TOPIC", "cvd_feedback")
    
    # AI Model Configuration
    MODEL_PATH: str = os.getenv("MODEL_PATH", "./models")
    MODEL_VERSION: str = os.getenv("MODEL_VERSION", "v1.0")
    
    # Security
    SECRET_KEY: str = os.getenv("SECRET_KEY", "your-secret-key-here")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "30"))
    
    # File Upload Configuration
    MAX_FILE_SIZE: int = int(os.getenv("MAX_FILE_SIZE", "10485760"))  # 10MB
    UPLOAD_DIR: str = os.getenv("UPLOAD_DIR", "./uploads")
    ALLOWED_FILE_TYPES: list = [".jpg", ".jpeg", ".png", ".pdf", ".csv", ".txt"]
    
    # Logging
    LOG_LEVEL: str = os.getenv("LOG_LEVEL", "INFO")
    
    class Config:
        case_sensitive = True

settings = Settings()