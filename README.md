# SysAttend AI — Sistema de Gestión de Asistencia
## Visión Artificial · Redes Neuronales · Universidad

> Desarrollado para la Escuela Militar de Ingeniería (EMI) — La Paz, Bolivia  
> Basado en el artículo: *"Sistema Informático de Gestión de Asistencia Basado en Visión Artificial y Redes Neuronales"*  
> SCIENTIA CREATIVA N°1, Septiembre 2021

---

## 📋 Descripción

Sistema de control de asistencia universitaria que usa la **cámara del celular del docente o encargado de curso** para reconocer automáticamente a los estudiantes mediante **reconocimiento facial con IA** (OpenCV + MediaPipe + CNN/TensorFlow).

### Características principales

- 🎓 Gestión de **Carreras, Materias, Semestres** con CRUD completo
- 👨‍🎓 **Módulo de Estudiantes** con todos los datos (CI, SAGA, grupo sanguíneo, tutor, etc.)
- 👨‍🏫 **Módulo de Docentes** con asignación a materias por periodo
- 📋 **Inscripciones masivas** de estudiantes a materias
- 📱 **PWA instalable** en cualquier celular Android/iPhone sin app store
- 🤖 **Reconocimiento facial automático** con CNN (precisión >90%)
- 🔐 **Sesiones autorizadas**: el encargado toma la asistencia, el docente la autoriza
- 🗓️ Control de **tardanzas** con tolerancia configurable
- 📊 **Reportes** de asistencia por materia con exportación PDF y CSV
- ⚠️ **Alertas** de estudiantes en riesgo (menos del 75% de asistencia)
- 🔍 **Auditoría completa** de todas las acciones del sistema

---

## 🏗️ Arquitectura

```
Celular del docente/encargado
        │
        ▼ (PWA / Navegador)
┌──────────────────┐
│  Frontend React  │  ← React 18 + Vite + TailwindCSS + PWA
│   Puerto 5173    │
└────────┬─────────┘
         │ HTTP/REST (JWT)
         ▼
┌──────────────────┐
│  Backend FastAPI │  ← Python 3.11 + FastAPI + SQLAlchemy
│   Puerto 8000    │
├──────────────────┤
│ Módulo IA:       │  ← OpenCV + MediaPipe + TensorFlow/Keras
│ Vision Service   │     Pipeline: Frame→Detect→Align→Embed→Match
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│  Base de Datos   │  ← SQLite (dev) / PostgreSQL (prod)
└──────────────────┘
```

---

## 🚀 Instalación Rápida

### Opción 1: Con Docker (recomendado para producción)

```bash
# Clonar / descomprimir el proyecto
cd sysattend

# Copiar variables de entorno
cp backend/.env.example backend/.env

# Iniciar todo el sistema
docker-compose up -d

# Acceder en: http://localhost:3000
```

### Opción 2: Instalación manual (desarrollo)

#### Backend

```bash
cd backend

# Crear entorno virtual
python -m venv venv
source venv/bin/activate          # Linux/Mac
# venv\Scripts\activate.bat       # Windows

# Instalar dependencias base
pip install -r requirements.txt

# (Opcional) Instalar módulos de IA completos
pip install opencv-python mediapipe tensorflow

# Copiar configuración
cp .env.example .env

# Iniciar servidor
uvicorn app.main:app --reload --port 8000
```

#### Frontend

```bash
cd frontend
npm install
npm run dev
# Acceder en: http://localhost:5173
```

---

## 🔐 Primer Acceso

1. Abrir http://localhost:5173 (o http://localhost:3000 con Docker)
2. Hacer clic en **"Inicializar datos del sistema"**
3. Ingresar con:
   - **Usuario:** `admin`
   - **Contraseña:** `admin123`

> ⚠️ **Cambiar la contraseña inmediatamente después del primer acceso**

---

## 📱 Instalación en celular (PWA)

1. Abrir el sistema en Chrome (Android) o Safari (iPhone)
2. Android: menú → "Agregar a pantalla de inicio"
3. iPhone: botón compartir → "Agregar a pantalla de inicio"
4. El sistema funciona como app nativa con acceso a la cámara

---

## 📊 Flujo de Toma de Asistencia

```
1. Docente o encargado abre SysAttend en su celular
2. Crea una nueva sesión (materia + periodo) → se genera un PIN de 6 dígitos
3. Activa la cámara del celular
4. Apunta la cámara hacia cada estudiante
   → IA detecta el rostro (MediaPipe BlazeFace)
   → Extrae 468 puntos de referencia faciales
   → Genera embedding de 128 dimensiones (CNN TensorFlow)
   → Compara con la base de datos de estudiantes inscritos
   → Registra automáticamente: PRESENTE / TARDANZA
5. Estudiantes no reconocidos → registro manual
6. Si fue tomada por encargado → docente debe AUTORIZAR la sesión
7. Los datos quedan en la base de datos con timestamp exacto
8. Se pueden generar reportes y exportar a PDF/CSV
```

---

## 📂 Estructura del Proyecto

```
sysattend/
├── backend/
│   ├── app/
│   │   ├── main.py              # Entrada FastAPI
│   │   ├── core/
│   │   │   ├── config.py        # Configuración (umbral IA, etc.)
│   │   │   └── security.py      # JWT, hashing
│   │   ├── db/
│   │   │   └── database.py      # SQLAlchemy engine
│   │   ├── models/
│   │   │   └── models.py        # 13 modelos de BD
│   │   ├── api/routes/
│   │   │   ├── auth.py          # Login/JWT
│   │   │   ├── estudiantes.py   # CRUD estudiantes
│   │   │   ├── docentes.py      # CRUD docentes
│   │   │   ├── carreras.py      # CRUD carreras + materias
│   │   │   ├── inscripciones.py # Inscripciones masivas
│   │   │   ├── asistencia.py    # Sesiones + reconocimiento IA
│   │   │   ├── biometria.py     # Captura de muestras faciales
│   │   │   └── reportes.py      # Reportes y estadísticas
│   │   └── services/
│   │       └── vision_service.py # Pipeline IA completo
│   ├── requirements.txt
│   ├── Dockerfile
│   └── .env.example
│
├── frontend/
│   ├── src/
│   │   ├── App.jsx              # Rutas principales
│   │   ├── pages/
│   │   │   ├── DashboardPage    # Panel principal
│   │   │   ├── EstudiantesPage  # CRUD estudiantes
│   │   │   ├── BiometriaPage    # Captura facial
│   │   │   ├── DocentesPage     # CRUD docentes
│   │   │   ├── CarrerasPage     # Carreras y materias
│   │   │   ├── InscripcionesPage# Inscripción masiva
│   │   │   ├── AsistenciaPage   # Lista de sesiones
│   │   │   ├── TomarAsistencia  # Cámara + IA en tiempo real
│   │   │   ├── SesionDetail     # Detalle de sesión
│   │   │   ├── ReportesPage     # Reportes con gráficos
│   │   │   └── ConfigPage       # Periodos y configuración
│   │   ├── components/
│   │   │   ├── layout/Layout    # Sidebar + topbar responsive
│   │   │   └── ui/index.jsx     # Componentes reutilizables
│   │   ├── services/api.js      # Cliente Axios + todos los endpoints
│   │   └── store/authStore.js   # Estado global Zustand
│   ├── package.json
│   └── Dockerfile
│
├── docker-compose.yml
└── README.md
```

---

## ⚙️ Configuración del Módulo IA

En `backend/.env`:

```env
# Umbral mínimo de confianza para reconocer un rostro (0.0-1.0)
CONFIDENCE_THRESHOLD=0.75

# Minutos de tolerancia para marcar como "tardanza" en vez de "ausente"
TARDANZA_TOLERANCIA_MINUTOS=10

# Porcentaje máximo de faltas antes de alerta de riesgo
LIMITE_FALTAS_PORCENTAJE=25.0

# Activar verificación de geolocalización (solo en campus)
GEO_ENABLED=false
CAMPUS_LAT=-16.5000
CAMPUS_LNG=-68.1500
CAMPUS_RADIUS_METERS=500.0
```

---

## 🔌 Instalación de módulos IA (opcional pero recomendado)

```bash
# Para reconocimiento facial completo:
pip install opencv-python mediapipe tensorflow

# Solo para detección básica (Haar Cascade - sin MediaPipe):
pip install opencv-python

# El sistema funciona sin IA instalada (modo registro manual)
```

---

## 👥 Roles del Sistema

| Rol | Permisos |
|-----|----------|
| `superadmin` | Acceso total al sistema |
| `admin` | CRUD completo, no puede eliminar datos críticos |
| `docente` | Ver sus materias, crear sesiones, autorizar asistencias |
| `encargado` | Tomar asistencia en sus materias asignadas |

---

## 🗄️ Modelos de Base de Datos

| Tabla | Descripción |
|-------|-------------|
| `usuarios` | Cuentas del sistema con roles |
| `carreras` | Carreras universitarias |
| `materias` | Materias con semestre y carrera |
| `periodos_academicos` | Semestres (1er Sem. 2025, etc.) |
| `docentes` | Docentes con embedding facial |
| `estudiantes` | Estudiantes con todos los datos + biometría |
| `asignaciones_docente` | Docente ↔ Materia por periodo |
| `horarios` | Horario de cada asignación |
| `inscripciones` | Estudiante ↔ Materia por periodo |
| `sesiones_asistencia` | Cada clase con PIN y estado |
| `registros_asistencia` | Asistencia individual por sesión |
| `justificaciones` | Justificaciones de faltas |
| `audit_logs` | Registro de todas las acciones |

---

## 📡 API Endpoints principales

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| POST | `/api/auth/login` | Iniciar sesión |
| GET | `/api/estudiantes/` | Listar estudiantes |
| POST | `/api/estudiantes/` | Crear estudiante |
| POST | `/api/biometria/estudiante/{id}/capturar` | Capturar muestra facial |
| POST | `/api/asistencia/sesiones` | Crear sesión de clase |
| POST | `/api/asistencia/sesiones/{id}/reconocer` | Reconocer rostro (IA) |
| POST | `/api/asistencia/sesiones/{id}/autorizar` | Autorizar sesión (docente) |
| GET | `/api/reportes/asistencia/materia/{id}` | Reporte por materia |
| GET | `/api/docs` | Documentación Swagger completa |

---

## 📞 Soporte

- Documentación Swagger: http://localhost:8000/api/docs
- Documentación ReDoc: http://localhost:8000/api/redoc

---

*SysAttend AI v1.0 — EMI Bolivia 2025*  
*Stack: Python 3.11 + FastAPI + OpenCV + MediaPipe + TensorFlow + React 18 + PWA*
#   s y s a t t e n d  
 