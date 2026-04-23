from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional, List
from app.db.database import get_db
from app.core.security import get_current_user, get_current_admin
from app.models.models import Inscripcion, Estudiante, Materia, PeriodoAcademico

router = APIRouter()


class InscripcionCreate(BaseModel):
    estudiante_id: int
    materia_id: int
    periodo_id: int
    grupo: Optional[str] = "A"


class InscripcionMasivaCreate(BaseModel):
    estudiante_ids: List[int]
    materia_id: int
    periodo_id: int
    grupo: Optional[str] = "A"


def insc_to_dict(i: Inscripcion) -> dict:
    return {
        "id": i.id,
        "estudiante_id": i.estudiante_id,
        "estudiante_nombre": f"{i.estudiante.nombres} {i.estudiante.apellido_paterno}" if i.estudiante else None,
        "materia_id": i.materia_id,
        "materia_nombre": i.materia.nombre if i.materia else None,
        "periodo_id": i.periodo_id,
        "grupo": i.grupo,
        "es_encargado": i.es_encargado,
        "activa": i.activa,
    }


@router.get("/")
def listar_inscripciones(materia_id: Optional[int] = None, periodo_id: Optional[int] = None,
                          estudiante_id: Optional[int] = None,
                          db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    query = db.query(Inscripcion).filter(Inscripcion.activa == True)
    if materia_id:
        query = query.filter(Inscripcion.materia_id == materia_id)
    if periodo_id:
        query = query.filter(Inscripcion.periodo_id == periodo_id)
    if estudiante_id:
        query = query.filter(Inscripcion.estudiante_id == estudiante_id)
    return {"data": [insc_to_dict(i) for i in query.all()]}


@router.post("/")
def inscribir_estudiante(data: InscripcionCreate, db: Session = Depends(get_db),
                          current_user=Depends(get_current_admin)):
    existing = db.query(Inscripcion).filter(
        Inscripcion.estudiante_id == data.estudiante_id,
        Inscripcion.materia_id == data.materia_id,
        Inscripcion.periodo_id == data.periodo_id
    ).first()
    if existing:
        if not existing.activa:
            existing.activa = True
            db.commit()
            return insc_to_dict(existing)
        raise HTTPException(status_code=400, detail="El estudiante ya está inscrito")
    i = Inscripcion(**data.dict())
    db.add(i)
    db.commit()
    db.refresh(i)
    return insc_to_dict(i)


@router.post("/masiva")
def inscripcion_masiva(data: InscripcionMasivaCreate, db: Session = Depends(get_db),
                        current_user=Depends(get_current_admin)):
    creadas = 0
    for est_id in data.estudiante_ids:
        existing = db.query(Inscripcion).filter(
            Inscripcion.estudiante_id == est_id,
            Inscripcion.materia_id == data.materia_id,
            Inscripcion.periodo_id == data.periodo_id
        ).first()
        if not existing:
            i = Inscripcion(
                estudiante_id=est_id,
                materia_id=data.materia_id,
                periodo_id=data.periodo_id,
                grupo=data.grupo
            )
            db.add(i)
            creadas += 1
    db.commit()
    return {"message": f"{creadas} estudiantes inscritos correctamente"}


@router.delete("/{id}")
def eliminar_inscripcion(id: int, db: Session = Depends(get_db), current_user=Depends(get_current_admin)):
    i = db.query(Inscripcion).filter(Inscripcion.id == id).first()
    if not i:
        raise HTTPException(status_code=404, detail="Inscripción no encontrada")
    i.activa = False
    db.commit()
    return {"message": "Inscripción eliminada"}
