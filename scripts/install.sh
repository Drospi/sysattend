#!/bin/bash
# ─────────────────────────────────────────────────────────────
# SysAttend AI — Script de instalación rápida
# Ejecutar desde la raíz del proyecto: bash scripts/install.sh
# ─────────────────────────────────────────────────────────────
set -e

GREEN='\033[0;32m'; BLUE='\033[0;34m'; YELLOW='\033[1;33m'; NC='\033[0m'
echo -e "${BLUE}╔══════════════════════════════════════╗${NC}"
echo -e "${BLUE}║      SysAttend AI — Instalación      ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════╝${NC}"

# Backend
echo -e "\n${GREEN}[1/4] Configurando Backend...${NC}"
cd backend
if [ ! -f ".env" ]; then
  cp .env.example .env
  echo -e "${YELLOW}  → .env creado desde .env.example${NC}"
fi
python3 -m venv venv 2>/dev/null || python -m venv venv
source venv/bin/activate 2>/dev/null || source venv/Scripts/activate
pip install -r requirements.txt -q
echo -e "${GREEN}  ✓ Dependencias Python instaladas${NC}"

# Crear carpetas de uploads
mkdir -p uploads/fotos_estudiantes uploads/fotos_docentes uploads/embeddings uploads/biometria
echo -e "${GREEN}  ✓ Carpetas de uploads creadas${NC}"
cd ..

# Frontend
echo -e "\n${GREEN}[2/4] Configurando Frontend...${NC}"
cd frontend
npm install --silent
echo -e "${GREEN}  ✓ Dependencias Node instaladas${NC}"
cd ..

echo -e "\n${GREEN}[3/4] Inicializando base de datos...${NC}"
cd backend
source venv/bin/activate 2>/dev/null || source venv/Scripts/activate
python -c "
from app.db.database import engine, Base
from app.models.models import *
Base.metadata.create_all(bind=engine)
print('  ✓ Tablas creadas en SQLite')
"
cd ..

echo -e "\n${GREEN}[4/4] Instalación completada!${NC}"
echo -e "\n${BLUE}Para iniciar el sistema, ejecuta en dos terminales:${NC}"
echo -e "${YELLOW}  Terminal 1 (Backend):${NC}"
echo -e "    cd backend && source venv/bin/activate && uvicorn app.main:app --reload"
echo -e "${YELLOW}  Terminal 2 (Frontend):${NC}"
echo -e "    cd frontend && npm run dev"
echo -e "\n${GREEN}Luego abre: http://localhost:5173${NC}"
echo -e "${GREEN}Usuario: admin / Contraseña: admin123 (después de inicializar)${NC}\n"
