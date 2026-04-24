from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_
from typing import Optional, List
import os, shutil, uuid
from pydantic import BaseModel
from datetime import date

from app.db.database import get_db
from app.core.security import get_current_user, get_current_admin
from app.models.models import Estudiante, Carrera, Inscripcion, Usuario
from app.core.config import settings
from app.core.security import get_password_hash

router = APIRouter()


class EstudianteCreate(BaseModel):
    grado: Optional[str] = None
    nombres: str
    apellido_paterno: str
    apellido_materno: Optional[str] = None
    ci: str
    fecha_nacimiento: Optional[date] = None
    lugar_nacimiento: Optional[str] = None
    genero: Optional[str] = None
    grupo_sanguineo: Optional[str] = None
    celular: Optional[str] = None
    email: Optional[str] = None
    direccion: Optional[str] = None
    codigo_saga: Optional[str] = None
    matricula: Optional[str] = None
    anio_ingreso: Optional[int] = None
    estado: Optional[str] = "regular"
    carrera_id: Optional[int] = None
    tutor_nombre: Optional[str] = None
    tutor_relacion: Optional[str] = None
    tutor_ci: Optional[str] = None
    tutor_celular: Optional[str] = None


def estudiante_to_dict(e: Estudiante) -> dict:
    return {
        "id": e.id,
        "grado": e.grado,
        "nombres": e.nombres,
        "apellido_paterno": e.apellido_paterno,
        "apellido_materno": e.apellido_materno,
        "nombre_completo": f"{e.grado or ''} {e.nombres} {e.apellido_paterno} {e.apellido_materno or ''}".strip(),
        "ci": e.ci,
        "fecha_nacimiento": str(e.fecha_nacimiento) if e.fecha_nacimiento else None,
        "lugar_nacimiento": e.lugar_nacimiento,
        "genero": e.genero,
        "grupo_sanguineo": e.grupo_sanguineo,
        "celular": e.celular,
        "email": e.email,
        "direccion": e.direccion,
        "codigo_saga": e.codigo_saga,
        "matricula": e.matricula,
        "anio_ingreso": e.anio_ingreso,
        "estado": e.estado,
        "carrera_id": e.carrera_id,
        "carrera_nombre": e.carrera.nombre if e.carrera else None,
        "tutor_nombre": e.tutor_nombre,
        "tutor_relacion": e.tutor_relacion,
        "tutor_ci": e.tutor_ci,
        "tutor_celular": e.tutor_celular,
        "foto_url": e.foto_url,
        "tiene_biometria": e.embedding_facial is not None,
        "muestras_capturadas": e.muestras_capturadas,
        "activo": e.activo,
        "creado_en": str(e.creado_en) if e.creado_en else None,
    }


@router.get("/")
def listar_estudiantes(
    q: Optional[str] = Query(None),
    carrera_id: Optional[int] = None,
    estado: Optional[str] = None,
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    query = db.query(Estudiante).filter(Estudiante.activo == True)
    if q:
        query = query.filter(or_(
            Estudiante.nombres.ilike(f"%{q}%"),
            Estudiante.apellido_paterno.ilike(f"%{q}%"),
            Estudiante.ci.ilike(f"%{q}%"),
            Estudiante.codigo_saga.ilike(f"%{q}%"),
        ))
    if carrera_id:
        query = query.filter(Estudiante.carrera_id == carrera_id)
    if estado:
        query = query.filter(Estudiante.estado == estado)
    total = query.count()
    estudiantes = query.offset(skip).limit(limit).all()
    return {"total": total, "data": [estudiante_to_dict(e) for e in estudiantes]}


@router.get("/{id}")
def obtener_estudiante(id: int, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    e = db.query(Estudiante).filter(Estudiante.id == id).first()
    if not e:
        raise HTTPException(status_code=404, detail="Estudiante no encontrado")
    return estudiante_to_dict(e)


@router.post("/")
def crear_estudiante(data: EstudianteCreate, db: Session = Depends(get_db),
                     current_user=Depends(get_current_admin)):
    # Verificar CI único
    if db.query(Estudiante).filter(Estudiante.ci == data.ci).first():
        raise HTTPException(status_code=400, detail="Ya existe un estudiante con ese CI")
    if data.codigo_saga and db.query(Estudiante).filter(Estudiante.codigo_saga == data.codigo_saga).first():
        raise HTTPException(status_code=400, detail="Ya existe un estudiante con ese código SAGA")
    e = Estudiante(**data.dict())
    db.add(e)
    db.commit()
    db.refresh(e)
    # Crear usuario automáticamente
    username = f"est_{data.ci}"
    if not db.query(Usuario).filter(Usuario.username == username).first():
        u = Usuario(
            username=username,
            email=data.email or f"{data.ci}@universidad.edu.bo",
            hashed_password=get_password_hash(data.ci),
            rol="encargado",
            estudiante_id=e.id
        )
        db.add(u)
        db.commit()
    return estudiante_to_dict(e)


@router.put("/{id}")
def actualizar_estudiante(id: int, data: EstudianteCreate, db: Session = Depends(get_db),
                          current_user=Depends(get_current_admin)):
    e = db.query(Estudiante).filter(Estudiante.id == id).first()
    if not e:
        raise HTTPException(status_code=404, detail="Estudiante no encontrado")
    for k, v in data.dict(exclude_unset=True).items():
        setattr(e, k, v)
    db.commit()
    db.refresh(e)
    return estudiante_to_dict(e)


@router.delete("/{id}")
def eliminar_estudiante(id: int, db: Session = Depends(get_db), current_user=Depends(get_current_admin)):
    e = db.query(Estudiante).filter(Estudiante.id == id).first()
    if not e:
        raise HTTPException(status_code=404, detail="Estudiante no encontrado")
    e.activo = False
    db.commit()
    return {"message": "Estudiante desactivado correctamente"}


@router.post("/{id}/foto")
async def subir_foto(id: int, foto: UploadFile = File(...),
                     db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    e = db.query(Estudiante).filter(Estudiante.id == id).first()
    if not e:
        raise HTTPException(status_code=404, detail="Estudiante no encontrado")
    ext = foto.filename.split(".")[-1].lower()
    if ext not in ["jpg", "jpeg", "png", "webp"]:
        raise HTTPException(status_code=400, detail="Formato de imagen no válido")
    filename = f"est_{id}_{uuid.uuid4().hex[:8]}.{ext}"
    path = os.path.join(settings.UPLOAD_DIR, "fotos_estudiantes", filename)
    with open(path, "wb") as f:
        shutil.copyfileobj(foto.file, f)
    e.foto_url = f"/uploads/fotos_estudiantes/{filename}"
    db.commit()
    return {"foto_url": e.foto_url}


@router.put("/{id}/encargado")
def marcar_encargado(id: int, materia_id: int, periodo_id: int,
                     db: Session = Depends(get_db), current_user=Depends(get_current_admin)):
    """Marca a un estudiante como encargado de curso en una materia"""
    # Quitar encargado anterior
    db.query(Inscripcion).filter(
        Inscripcion.materia_id == materia_id,
        Inscripcion.periodo_id == periodo_id,
        Inscripcion.es_encargado == True
    ).update({"es_encargado": False})
    # Asignar nuevo encargado
    insc = db.query(Inscripcion).filter(
        Inscripcion.estudiante_id == id,
        Inscripcion.materia_id == materia_id,
        Inscripcion.periodo_id == periodo_id
    ).first()
    if not insc:
        raise HTTPException(status_code=404, detail="El estudiante no está inscrito en esta materia")
    insc.es_encargado = True
    # Actualizar rol de usuario
    u = db.query(Usuario).filter(Usuario.estudiante_id == id).first()
    if u:
        u.rol = "encargado"
    db.commit()
    return {"message": "Encargado asignado correctamente"}

# Agrega esto al final de tu archivo estudiantes.py

@router.post("/seed")
def seed_estudiantes(db: Session = Depends(get_db)):
    """Crea estudiantes de ejemplo (solo primera vez)"""
    from datetime import date
    from app.models.models import Carrera
    
    # Verificar si ya hay estudiantes
    if db.query(Estudiante).count() > 0:
        return {"message": "Ya existen estudiantes en la base de datos", "count": db.query(Estudiante).count()}
    
    # Obtener carreras existentes
    carrera_sistemas = db.query(Carrera).filter(Carrera.codigo == "ISI").first()
    carrera_civil = db.query(Carrera).filter(Carrera.codigo == "ICI").first()
    carrera_administracion = db.query(Carrera).filter(Carrera.codigo == "ADM").first()
    
    if not carrera_sistemas:
        raise HTTPException(status_code=404, detail="No existen carreras. Ejecuta primero el seed de admin/usuarios")
    
    # Estudiantes de ejemplo
    estudiantes_data = [
        {
            "grado": "Sr.",
            "nombres": "Carlos Andrés",
            "apellido_paterno": "Mendoza",
            "apellido_materno": "López",
            "ci": "1234567",
            "fecha_nacimiento": date(2000, 5, 15),
            "lugar_nacimiento": "La Paz",
            "genero": "M",
            "grupo_sanguineo": "O+",
            "celular": "71234567",
            "email": "carlos.mendoza@estudiante.edu.bo",
            "direccion": "Calle 10 #123, Zona Sur",
            "codigo_saga": "20230001",
            "matricula": "2023-001",
            "anio_ingreso": 2023,
            "estado": "regular",
            "carrera_id": carrera_sistemas.id,
            "tutor_nombre": "María López",
            "tutor_relacion": "Madre",
            "tutor_ci": "8765432",
            "tutor_celular": "79876543"
        },
        {
            "grado": "Srta.",
            "nombres": "Ana Sofía",
            "apellido_paterno": "Torrez",
            "apellido_materno": "Vargas",
            "ci": "2345678",
            "fecha_nacimiento": date(2001, 8, 22),
            "lugar_nacimiento": "Cochabamba",
            "genero": "F",
            "grupo_sanguineo": "A-",
            "celular": "72345678",
            "email": "ana.torrez@estudiante.edu.bo",
            "direccion": "Av. América #456",
            "codigo_saga": "20230002",
            "matricula": "2023-002",
            "anio_ingreso": 2023,
            "estado": "regular",
            "carrera_id": carrera_sistemas.id,
            "tutor_nombre": "Roberto Torrez",
            "tutor_relacion": "Padre",
            "tutor_ci": "9876543",
            "tutor_celular": "73456789"
        },
        {
            "grado": "Sr.",
            "nombres": "Javier Antonio",
            "apellido_paterno": "Ríos",
            "apellido_materno": "Flores",
            "ci": "3456789",
            "fecha_nacimiento": date(2000, 12, 10),
            "lugar_nacimiento": "Santa Cruz",
            "genero": "M",
            "grupo_sanguineo": "AB+",
            "celular": "73456789",
            "email": "javier.rios@estudiante.edu.bo",
            "direccion": "Barrio Urcupata #789",
            "codigo_saga": "20220001",
            "matricula": "2022-001",
            "anio_ingreso": 2022,
            "estado": "regular",
            "carrera_id": carrera_civil.id,
            "tutor_nombre": "Carmen Flores",
            "tutor_relacion": "Madre",
            "tutor_ci": "7654321",
            "tutor_celular": "74567890"
        }
    ]
    
    estudiantes_creados = []
    
    for data in estudiantes_data:
        # Verificar si ya existe por CI o código SAGA
        if db.query(Estudiante).filter(
            (Estudiante.ci == data["ci"]) | 
            (Estudiante.codigo_saga == data["codigo_saga"])
        ).first():
            continue
        
        estudiante = Estudiante(**data)
        db.add(estudiante)
        db.flush()
        
        # Crear usuario asociado al estudiante
        username = f"est_{data['ci']}"
        if not db.query(Usuario).filter(Usuario.username == username).first():
            usuario = Usuario(
                username=username,
                email=data["email"],
                hashed_password=get_password_hash(data["ci"]),
                rol="estudiante",
                estudiante_id=estudiante.id
            )
            db.add(usuario)
        
        estudiantes_creados.append(estudiante.nombres)
    
    db.commit()
    
    return {
        "message": "Seeder de estudiantes completado",
        "creados": len(estudiantes_creados),
        "estudiantes": estudiantes_creados,
        "total_estudiantes_bd": db.query(Estudiante).count()
    }