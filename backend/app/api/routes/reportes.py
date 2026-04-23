from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import Optional
from datetime import date, datetime

from app.db.database import get_db
from app.core.security import get_current_user
from app.models.models import (
    RegistroAsistencia, SesionAsistencia, Estudiante,
    Inscripcion, Materia, AsignacionDocente
)

router = APIRouter()


@router.get("/asistencia/materia/{materia_id}")
def reporte_materia(
    materia_id: int,
    periodo_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    """Reporte completo de asistencia por materia"""
    inscritos = db.query(Inscripcion).filter(
        Inscripcion.materia_id == materia_id,
        Inscripcion.activa == True,
        *([Inscripcion.periodo_id == periodo_id] if periodo_id else [])
    ).all()

    resultado = []
    for insc in inscritos:
        est = insc.estudiante
        registros = db.query(RegistroAsistencia).join(SesionAsistencia).filter(
            RegistroAsistencia.estudiante_id == est.id,
            SesionAsistencia.asignacion_id.in_(
                [a.id for a in db.query(AsignacionDocente).filter(
                    AsignacionDocente.materia_id == materia_id
                ).all()]
            )
        ).all()
        total = len(registros)
        presentes = sum(1 for r in registros if r.estado in ["presente", "tardanza", "justificado"])
        ausentes = sum(1 for r in registros if r.estado == "ausente")
        tardanzas = sum(1 for r in registros if r.estado == "tardanza")
        pct = round((presentes / total * 100), 1) if total > 0 else 0
        resultado.append({
            "estudiante_id": est.id,
            "nombre": f"{est.nombres} {est.apellido_paterno} {est.apellido_materno or ''}".strip(),
            "ci": est.ci,
            "codigo_saga": est.codigo_saga,
            "total_clases": total,
            "presentes": presentes,
            "ausentes": ausentes,
            "tardanzas": tardanzas,
            "porcentaje": pct,
            "en_riesgo": pct < 75,
        })
    resultado.sort(key=lambda x: x["nombre"])
    return {"materia_id": materia_id, "total_estudiantes": len(resultado), "data": resultado}


@router.get("/asistencia/estudiante/{estudiante_id}")
def reporte_estudiante(
    estudiante_id: int,
    periodo_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    """Reporte de asistencia de un estudiante por todas sus materias"""
    est = db.query(Estudiante).filter(Estudiante.id == estudiante_id).first()
    if not est:
        raise HTTPException(status_code=404, detail="Estudiante no encontrado")

    inscripciones = db.query(Inscripcion).filter(
        Inscripcion.estudiante_id == estudiante_id,
        Inscripcion.activa == True,
        *([Inscripcion.periodo_id == periodo_id] if periodo_id else [])
    ).all()

    materias_data = []
    for insc in inscripciones:
        registros = db.query(RegistroAsistencia).join(SesionAsistencia).filter(
            RegistroAsistencia.estudiante_id == estudiante_id,
            SesionAsistencia.asignacion_id.in_(
                [a.id for a in db.query(AsignacionDocente).filter(
                    AsignacionDocente.materia_id == insc.materia_id
                ).all()]
            )
        ).all()
        total = len(registros)
        presentes = sum(1 for r in registros if r.estado in ["presente", "tardanza", "justificado"])
        pct = round((presentes / total * 100), 1) if total > 0 else 0
        materias_data.append({
            "materia_id": insc.materia_id,
            "materia_nombre": insc.materia.nombre if insc.materia else None,
            "total": total,
            "presentes": presentes,
            "ausentes": total - presentes,
            "porcentaje": pct,
            "en_riesgo": pct < 75,
        })

    return {
        "estudiante": {
            "id": est.id,
            "nombre": f"{est.nombres} {est.apellido_paterno}",
            "ci": est.ci,
            "codigo_saga": est.codigo_saga,
        },
        "materias": materias_data,
        "total_materias": len(materias_data),
    }


@router.get("/asistencia/sesion/{sesion_id}/pdf")
def exportar_sesion_pdf(
    sesion_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    """Exporta la lista de asistencia de una sesión (datos para generar PDF en frontend)"""
    sesion = db.query(SesionAsistencia).filter(SesionAsistencia.id == sesion_id).first()
    if not sesion:
        raise HTTPException(status_code=404, detail="Sesión no encontrada")
    registros = [{
        "nro": i + 1,
        "nombre": f"{r.estudiante.nombres} {r.estudiante.apellido_paterno} {r.estudiante.apellido_materno or ''}".strip(),
        "ci": r.estudiante.ci,
        "codigo_saga": r.estudiante.codigo_saga,
        "estado": r.estado,
        "hora": str(r.hora_registro)[:16] if r.hora_registro else "--",
        "confianza": f"{r.confianza_ia*100:.1f}%" if r.confianza_ia else "--",
        "metodo": r.metodo,
    } for i, r in enumerate(sesion.registros)]
    return {
        "sesion": {
            "id": sesion.id,
            "materia": sesion.asignacion.materia.nombre if sesion.asignacion else None,
            "docente": (f"{sesion.asignacion.docente.nombres} {sesion.asignacion.docente.apellido_paterno}"
                        if sesion.asignacion and sesion.asignacion.docente else None),
            "fecha": str(sesion.fecha),
            "hora_inicio": str(sesion.hora_inicio)[:16],
            "estado": sesion.estado,
        },
        "registros": registros,
        "resumen": {
            "presentes": sum(1 for r in sesion.registros if r.estado in ["presente", "tardanza"]),
            "ausentes": sum(1 for r in sesion.registros if r.estado == "ausente"),
            "total": len(sesion.registros),
        }
    }
