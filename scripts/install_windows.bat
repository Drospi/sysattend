@echo off
echo ============================================
echo   SysAttend AI -- Instalacion Windows
echo ============================================

cd backend
if not exist ".env" copy .env.example .env
python -m venv venv
call venv\Scripts\activate.bat
pip install -r requirements.txt
mkdir uploads\fotos_estudiantes 2>nul
mkdir uploads\fotos_docentes 2>nul
mkdir uploads\embeddings 2>nul
mkdir uploads\biometria 2>nul
python -c "from app.db.database import engine, Base; from app.models.models import *; Base.metadata.create_all(bind=engine); print('Tablas creadas')"
cd ..

cd frontend
npm install
cd ..

echo.
echo Instalacion completada!
echo.
echo Terminal 1 - Backend:
echo   cd backend ^& venv\Scripts\activate ^& uvicorn app.main:app --reload
echo.
echo Terminal 2 - Frontend:
echo   cd frontend ^& npm run dev
echo.
echo Abrir: http://localhost:5173
pause
