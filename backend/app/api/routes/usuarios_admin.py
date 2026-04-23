from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
from app.db.database import get_db
from app.core.security import get_current_admin, get_password_hash
from app.models.models import Usuario

router = APIRouter()


class UsuarioCreate(BaseModel):
    username: str
    email: str
    password: str
    rol: str = "admin"
    docente_id: Optional[int] = None
    estudiante_id: Optional[int] = None


@router.get("/usuarios")
def listar_usuarios(db: Session = Depends(get_db), current_user=Depends(get_current_admin)):
    users = db.query(Usuario).all()
    return {"data": [{
        "id": u.id, "username": u.username, "email": u.email,
        "rol": u.rol, "activo": u.activo
    } for u in users]}


@router.post("/usuarios")
def crear_usuario(data: UsuarioCreate, db: Session = Depends(get_db),
                  current_user=Depends(get_current_admin)):
    if db.query(Usuario).filter(Usuario.username == data.username).first():
        raise HTTPException(status_code=400, detail="Username ya existe")
    u = Usuario(
        username=data.username,
        email=data.email,
        hashed_password=get_password_hash(data.password),
        rol=data.rol,
        docente_id=data.docente_id,
        estudiante_id=data.estudiante_id,
    )
    db.add(u)
    db.commit()
    db.refresh(u)
    return {"id": u.id, "username": u.username, "rol": u.rol}


@router.put("/usuarios/{id}/toggle")
def toggle_usuario(id: int, db: Session = Depends(get_db), current_user=Depends(get_current_admin)):
    u = db.query(Usuario).filter(Usuario.id == id).first()
    if not u:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    u.activo = not u.activo
    db.commit()
    return {"activo": u.activo}


@router.post("/seed")
def seed_datos_iniciales(db: Session = Depends(get_db)):
    """Crea datos iniciales (solo primera vez)"""
    from app.core.security import get_password_hash
    from app.models.models import Carrera, PeriodoAcademico
    from datetime import date

    # Admin superusuario
    if not db.query(Usuario).filter(Usuario.username == "admin").first():
        admin = Usuario(
            username="admin",
            email="admin@universidad.edu.bo",
            hashed_password=get_password_hash("admin123"),
            rol="superadmin",
            activo=True
        )
        db.add(admin)

    # Carreras de ejemplo
    if db.query(Carrera).count() == 0:
        carreras = [
            Carrera(nombre="Ingeniería de Sistemas", codigo="ISI", duracion_semestres=10),
            Carrera(nombre="Ingeniería Civil", codigo="ICI", duracion_semestres=10),
            Carrera(nombre="Ingeniería Electrónica", codigo="IEL", duracion_semestres=10),
            Carrera(nombre="Administración de Empresas", codigo="ADM", duracion_semestres=8),
            Carrera(nombre="Contaduría Pública", codigo="CPA", duracion_semestres=8),
        ]
        for c in carreras:
            db.add(c)

    # Periodo activo
    if db.query(PeriodoAcademico).count() == 0:
        p = PeriodoAcademico(
            nombre="1er Semestre 2025",
            anio=2025, numero=1,
            fecha_inicio=date(2025, 2, 1),
            fecha_fin=date(2025, 6, 30),
            activo=True
        )
        db.add(p)

    db.commit()
    return {"message": "Datos iniciales creados correctamente"}
