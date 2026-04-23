from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from datetime import date
from typing import Optional
from app.db.database import get_db
from app.core.security import get_current_user, get_current_admin
from app.models.models import PeriodoAcademico

router = APIRouter()


class PeriodoCreate(BaseModel):
    nombre: str
    anio: int
    numero: int
    fecha_inicio: date
    fecha_fin: date


@router.get("/")
def listar_periodos(db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    periodos = db.query(PeriodoAcademico).order_by(PeriodoAcademico.anio.desc()).all()
    return {"data": [{
        "id": p.id, "nombre": p.nombre, "anio": p.anio, "numero": p.numero,
        "fecha_inicio": str(p.fecha_inicio), "fecha_fin": str(p.fecha_fin), "activo": p.activo,
    } for p in periodos]}


@router.get("/activo")
def periodo_activo(db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    p = db.query(PeriodoAcademico).filter(PeriodoAcademico.activo == True).first()
    if not p:
        raise HTTPException(status_code=404, detail="No hay periodo activo")
    return {"id": p.id, "nombre": p.nombre, "anio": p.anio, "numero": p.numero,
            "fecha_inicio": str(p.fecha_inicio), "fecha_fin": str(p.fecha_fin)}


@router.post("/")
def crear_periodo(data: PeriodoCreate, db: Session = Depends(get_db),
                  current_user=Depends(get_current_admin)):
    p = PeriodoAcademico(**data.dict())
    db.add(p)
    db.commit()
    db.refresh(p)
    return {"id": p.id, "nombre": p.nombre}


@router.put("/{id}/activar")
def activar_periodo(id: int, db: Session = Depends(get_db), current_user=Depends(get_current_admin)):
    db.query(PeriodoAcademico).update({"activo": False})
    p = db.query(PeriodoAcademico).filter(PeriodoAcademico.id == id).first()
    if not p:
        raise HTTPException(status_code=404, detail="Periodo no encontrado")
    p.activo = True
    db.commit()
    return {"message": f"Periodo '{p.nombre}' activado"}
