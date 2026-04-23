from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Optional
from pydantic import BaseModel
from app.db.database import get_db
from app.core.security import get_current_user, get_current_admin
from app.models.models import Materia, AsignacionDocente, Docente, PeriodoAcademico

router = APIRouter()


class AsignacionCreate(BaseModel):
    docente_id: int
    materia_id: int
    periodo_id: int
    grupo: Optional[str] = "A"


def asignacion_to_dict(a: AsignacionDocente) -> dict:
    return {
        "id": a.id,
        "docente_id": a.docente_id,
        "docente_nombre": f"{a.docente.nombres} {a.docente.apellido_paterno}" if a.docente else None,
        "materia_id": a.materia_id,
        "materia_nombre": a.materia.nombre if a.materia else None,
        "periodo_id": a.periodo_id,
        "grupo": a.grupo,
        "activa": a.activa,
    }


@router.get("/")
def listar_materias(carrera_id: Optional[int] = None, semestre: Optional[int] = None,
                    db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    query = db.query(Materia).filter(Materia.activa == True)
    if carrera_id:
        query = query.filter(Materia.carrera_id == carrera_id)
    if semestre:
        query = query.filter(Materia.semestre_num == semestre)
    materias = query.all()
    return {"data": [{
        "id": m.id, "nombre": m.nombre, "codigo": m.codigo,
        "semestre_num": m.semestre_num, "carrera_id": m.carrera_id,
        "carrera_nombre": m.carrera.nombre if m.carrera else None,
        "creditos": m.creditos, "horas_semana": m.horas_semana,
    } for m in materias]}


@router.post("/asignaciones")
def asignar_docente(data: AsignacionCreate, db: Session = Depends(get_db),
                    current_user=Depends(get_current_admin)):
    a = AsignacionDocente(**data.dict())
    db.add(a)
    db.commit()
    db.refresh(a)
    return asignacion_to_dict(a)


@router.get("/asignaciones")
def listar_asignaciones(periodo_id: Optional[int] = None, docente_id: Optional[int] = None,
                        db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    query = db.query(AsignacionDocente).filter(AsignacionDocente.activa == True)
    if periodo_id:
        query = query.filter(AsignacionDocente.periodo_id == periodo_id)
    if docente_id:
        query = query.filter(AsignacionDocente.docente_id == docente_id)
    return {"data": [asignacion_to_dict(a) for a in query.all()]}
