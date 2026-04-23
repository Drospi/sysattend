from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import JSONResponse
import os

from app.core.config import settings
from app.db.database import engine, Base
from app.api.routes import (
    auth, estudiantes, docentes, carreras, materias,
    semestres, asistencia, reportes, usuarios_admin, inscripciones, biometria
)

# Crear tablas
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="SysAttend AI — Sistema de Gestión de Asistencia",
    description="Sistema de control de asistencia con visión artificial para universidades",
    version="1.0.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc"
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Archivos estáticos (fotos)
os.makedirs("uploads/fotos_estudiantes", exist_ok=True)
os.makedirs("uploads/fotos_docentes", exist_ok=True)
os.makedirs("uploads/embeddings", exist_ok=True)
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

# Rutas API
app.include_router(auth.router,            prefix="/api/auth",          tags=["Autenticación"])
app.include_router(usuarios_admin.router,  prefix="/api/admin",         tags=["Administración"])
app.include_router(estudiantes.router,     prefix="/api/estudiantes",   tags=["Estudiantes"])
app.include_router(docentes.router,        prefix="/api/docentes",      tags=["Docentes"])
app.include_router(carreras.router,        prefix="/api/carreras",      tags=["Carreras"])
app.include_router(materias.router,        prefix="/api/materias",      tags=["Materias"])
app.include_router(semestres.router,       prefix="/api/semestres",     tags=["Semestres"])
app.include_router(inscripciones.router,   prefix="/api/inscripciones", tags=["Inscripciones"])
app.include_router(asistencia.router,      prefix="/api/asistencia",    tags=["Asistencia"])
app.include_router(reportes.router,        prefix="/api/reportes",      tags=["Reportes"])
app.include_router(biometria.router,       prefix="/api/biometria",      tags=["Biometría"])

@app.get("/api/health")
def health_check():
    return {"status": "ok", "sistema": "SysAttend AI v1.0"}
