from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Optional
from pydantic import BaseModel
from app.db.database import get_db
from app.core.security import get_current_user, get_current_admin
from app.models.models import Carrera, Materia

router = APIRouter()


class CarreraCreate(BaseModel):
    nombre: str
    codigo: str
    descripcion: Optional[str] = None
    duracion_semestres: Optional[int] = 10


class MateriaCreate(BaseModel):
    nombre: str
    codigo: str
    descripcion: Optional[str] = None
    creditos: Optional[int] = 3
    horas_semana: Optional[int] = 4
    semestre_num: int
    carrera_id: int


def carrera_to_dict(c: Carrera) -> dict:
    return {
        "id": c.id, "nombre": c.nombre, "codigo": c.codigo,
        "descripcion": c.descripcion, "duracion_semestres": c.duracion_semestres,
        "activa": c.activa,
        "total_materias": len([m for m in c.materias if m.activa]),
    }


def materia_to_dict(m: Materia) -> dict:
    return {
        "id": m.id, "nombre": m.nombre, "codigo": m.codigo,
        "descripcion": m.descripcion, "creditos": m.creditos,
        "horas_semana": m.horas_semana, "semestre_num": m.semestre_num,
        "carrera_id": m.carrera_id,
        "carrera_nombre": m.carrera.nombre if m.carrera else None,
        "activa": m.activa,
    }


# ── CARRERAS ──────────────────────────────────────────
@router.get("/")
def listar_carreras(db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    carreras = db.query(Carrera).filter(Carrera.activa == True).all()
    return {"data": [carrera_to_dict(c) for c in carreras]}


@router.get("/{id}")
def obtener_carrera(id: int, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    c = db.query(Carrera).filter(Carrera.id == id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Carrera no encontrada")
    data = carrera_to_dict(c)
    data["materias"] = [materia_to_dict(m) for m in c.materias if m.activa]
    return data


@router.post("/")
def crear_carrera(data: CarreraCreate, db: Session = Depends(get_db),
                  current_user=Depends(get_current_admin)):
    if db.query(Carrera).filter(Carrera.codigo == data.codigo).first():
        raise HTTPException(status_code=400, detail="Ya existe una carrera con ese código")
    c = Carrera(**data.dict())
    db.add(c)
    db.commit()
    db.refresh(c)
    return carrera_to_dict(c)


@router.put("/{id}")
def actualizar_carrera(id: int, data: CarreraCreate, db: Session = Depends(get_db),
                       current_user=Depends(get_current_admin)):
    c = db.query(Carrera).filter(Carrera.id == id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Carrera no encontrada")
    for k, v in data.dict(exclude_unset=True).items():
        setattr(c, k, v)
    db.commit()
    db.refresh(c)
    return carrera_to_dict(c)


@router.delete("/{id}")
def eliminar_carrera(id: int, db: Session = Depends(get_db), current_user=Depends(get_current_admin)):
    c = db.query(Carrera).filter(Carrera.id == id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Carrera no encontrada")
    c.activa = False
    db.commit()
    return {"message": "Carrera eliminada"}


# ── MATERIAS ──────────────────────────────────────────
@router.get("/{carrera_id}/materias")
def materias_de_carrera(carrera_id: int, semestre: Optional[int] = None,
                         db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    query = db.query(Materia).filter(Materia.carrera_id == carrera_id, Materia.activa == True)
    if semestre:
        query = query.filter(Materia.semestre_num == semestre)
    return {"data": [materia_to_dict(m) for m in query.all()]}


@router.post("/{carrera_id}/materias")
def crear_materia(carrera_id: int, data: MateriaCreate, db: Session = Depends(get_db),
                  current_user=Depends(get_current_admin)):
    data.carrera_id = carrera_id
    if db.query(Materia).filter(Materia.codigo == data.codigo).first():
        raise HTTPException(status_code=400, detail="Ya existe una materia con ese código")
    m = Materia(**data.dict())
    db.add(m)
    db.commit()
    db.refresh(m)
    return materia_to_dict(m)


@router.put("/materias/{id}")
def actualizar_materia(id: int, data: MateriaCreate, db: Session = Depends(get_db),
                       current_user=Depends(get_current_admin)):
    m = db.query(Materia).filter(Materia.id == id).first()
    if not m:
        raise HTTPException(status_code=404, detail="Materia no encontrada")
    for k, v in data.dict(exclude_unset=True).items():
        setattr(m, k, v)
    db.commit()
    db.refresh(m)
    return materia_to_dict(m)


@router.delete("/materias/{id}")
def eliminar_materia(id: int, db: Session = Depends(get_db), current_user=Depends(get_current_admin)):
    m = db.query(Materia).filter(Materia.id == id).first()
    if not m:
        raise HTTPException(status_code=404, detail="Materia no encontrada")
    m.activa = False
    db.commit()
    return {"message": "Materia eliminada"}
