from pydantic_settings import BaseSettings
from typing import List
import os

class Settings(BaseSettings):
    # App
    APP_NAME: str = "SysAttend AI"
    SECRET_KEY: str = "sysattend-secret-key-cambiar-en-produccion-2025"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 480  # 8 horas

    # Base de datos
    DATABASE_URL: str = "sqlite:///./sysattend.db"
    # Para PostgreSQL: "postgresql://user:password@localhost/sysattend"

    # CORS
    ALLOWED_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://localhost:5173",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:5173",
    ]

    # Visión artificial
    CONFIDENCE_THRESHOLD: float = 0.75   # 75% mínimo para reconocer
    EMBEDDING_DIM: int = 128
    MAX_FACES_PER_FRAME: int = 10
    LIVENESS_CHECK: bool = True
    SESSION_MAX_MINUTES: int = 30        # Tiempo máximo de sesión de asistencia

    # Geolocalización (radio en metros del campus)
    GEO_ENABLED: bool = False
    CAMPUS_LAT: float = -16.5000
    CAMPUS_LNG: float = -68.1500
    CAMPUS_RADIUS_METERS: float = 500.0

    # Asistencia
    TARDANZA_TOLERANCIA_MINUTOS: int = 10
    LIMITE_FALTAS_PORCENTAJE: float = 25.0  # 25% máximo de faltas

    # Uploads
    UPLOAD_DIR: str = "uploads"
    MAX_FILE_SIZE_MB: int = 5

    # Notificaciones
    WHATSAPP_ENABLED: bool = False
    TWILIO_ACCOUNT_SID: str = ""
    TWILIO_AUTH_TOKEN: str = ""
    TWILIO_WHATSAPP_FROM: str = ""

    class Config:
        env_file = ".env"
        case_sensitive = True

settings = Settings()
