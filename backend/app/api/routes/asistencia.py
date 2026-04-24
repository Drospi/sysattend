from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from sqlalchemy import func
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, date
import random, string, base64, io, os, uuid, json

from app.db.database import get_db
from app.core.security import get_current_user
from app.core.config import settings
from app.models.models import (
    SesionAsistencia, RegistroAsistencia, Inscripcion,
    AsignacionDocente, Estudiante, Usuario
)

router = APIRouter()


def generar_pin() -> str:
    return ''.join(random.choices(string.digits, k=6))


def sesion_to_dict(s: SesionAsistencia) -> dict:
    return {
        "id": s.id,
        "asignacion_id": s.asignacion_id,
        "materia_nombre": s.asignacion.materia.nombre if s.asignacion else None,
        "docente_nombre": (f"{s.asignacion.docente.nombres} {s.asignacion.docente.apellido_paterno}"
                           if s.asignacion and s.asignacion.docente else None),
        "periodo_id": s.periodo_id,
        "fecha": str(s.fecha),
        "hora_inicio": str(s.hora_inicio),
        "hora_fin": str(s.hora_fin) if s.hora_fin else None,
        "estado": s.estado,
        "pin_sesion": s.pin_sesion,
        "tomada_por_encargado": s.tomada_por_encargado,
        "autorizada_por_docente": s.autorizada_por_docente,
        "observaciones": s.observaciones,
        "total_registros": len(s.registros),
        "presentes": sum(1 for r in s.registros if r.estado == "presente"),
        "ausentes": sum(1 for r in s.registros if r.estado == "ausente"),
        "tardanzas": sum(1 for r in s.registros if r.estado == "tardanza"),
    }


class SesionCreate(BaseModel):
    asignacion_id: int
    periodo_id: int
    observaciones: Optional[str] = None
    lat: Optional[float] = None
    lng: Optional[float] = None


class RegistroManualCreate(BaseModel):
    estudiante_id: int
    estado: str  # presente/ausente/tardanza/justificado
    motivo: Optional[str] = None


class AutorizarSesion(BaseModel):
    observaciones: Optional[str] = None


# ── SESIONES ─────────────────────────────────────────────

@router.post("/sesiones")
def crear_sesion(data: SesionCreate, db: Session = Depends(get_db),
                 current_user=Depends(get_current_user)):
    """Docente o encargado crea una sesión de asistencia"""
    asignacion = db.query(AsignacionDocente).filter(
        AsignacionDocente.id == data.asignacion_id,
        AsignacionDocente.activa == True
    ).first()
    if not asignacion:
        raise HTTPException(status_code=404, detail="Asignación no encontrada")

    # Verificar permisos
    es_encargado = current_user.rol == "encargado"
    tomada_por_encargado = False
    if es_encargado:
        tomada_por_encargado = True

    pin = generar_pin()
    sesion = SesionAsistencia(
        asignacion_id=data.asignacion_id,
        periodo_id=data.periodo_id,
        fecha=date.today(),
        hora_inicio=datetime.now(),
        estado="activa",
        pin_sesion=pin,
        tomada_por_encargado=tomada_por_encargado,
        encargado_id=current_user.estudiante_id if es_encargado else None,
        lat_docente=data.lat,
        lng_docente=data.lng,
        observaciones=data.observaciones,
    )
    db.add(sesion)
    db.commit()
    db.refresh(sesion)

    # Pre-crear registros ausente para todos los inscritos
    inscritos = db.query(Inscripcion).filter(
        Inscripcion.materia_id == asignacion.materia_id,
        Inscripcion.periodo_id == data.periodo_id,
        Inscripcion.activa == True
    ).all()
    for insc in inscritos:
        reg = RegistroAsistencia(
            sesion_id=sesion.id,
            estudiante_id=insc.estudiante_id,
            estado="ausente",
        )
        db.add(reg)
    db.commit()
    return sesion_to_dict(sesion)


@router.get("/sesiones")
def listar_sesiones(asignacion_id: Optional[int] = None, periodo_id: Optional[int] = None,
                     fecha: Optional[str] = None, estado: Optional[str] = None,
                     db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    query = db.query(SesionAsistencia)
    if asignacion_id:
        query = query.filter(SesionAsistencia.asignacion_id == asignacion_id)
    if periodo_id:
        query = query.filter(SesionAsistencia.periodo_id == periodo_id)
    if fecha:
        query = query.filter(SesionAsistencia.fecha == fecha)
    if estado:
        query = query.filter(SesionAsistencia.estado == estado)
    sesiones = query.order_by(SesionAsistencia.hora_inicio.desc()).limit(100).all()
    return {"data": [sesion_to_dict(s) for s in sesiones]}


@router.get("/sesiones/{id}")
def obtener_sesion(id: int, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    s = db.query(SesionAsistencia).filter(SesionAsistencia.id == id).first()
    if not s:
        raise HTTPException(status_code=404, detail="Sesión no encontrada")
    data = sesion_to_dict(s)
    data["registros"] = [{
        "id": r.id,
        "estudiante_id": r.estudiante_id,
        "estudiante_nombre": f"{r.estudiante.nombres} {r.estudiante.apellido_paterno}" if r.estudiante else None,
        "estudiante_ci": r.estudiante.ci if r.estudiante else None,
        "foto_url": r.estudiante.foto_url if r.estudiante else None,
        "estado": r.estado,
        "hora_registro": str(r.hora_registro) if r.hora_registro else None,
        "confianza_ia": r.confianza_ia,
        "metodo": r.metodo,
    } for r in s.registros]
    return data


@router.post("/sesiones/{id}/cerrar")
def cerrar_sesion(id: int, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    s = db.query(SesionAsistencia).filter(SesionAsistencia.id == id).first()
    if not s:
        raise HTTPException(status_code=404, detail="Sesión no encontrada")
    s.estado = "cerrada"
    s.hora_fin = datetime.now()
    db.commit()
    return {"message": "Sesión cerrada", "id": id}


@router.post("/sesiones/{id}/autorizar")
def autorizar_sesion(id: int, data: AutorizarSesion, db: Session = Depends(get_db),
                      current_user=Depends(get_current_user)):
    """El docente autoriza la asistencia tomada por el encargado"""
    s = db.query(SesionAsistencia).filter(SesionAsistencia.id == id).first()
    if not s:
        raise HTTPException(status_code=404, detail="Sesión no encontrada")
    if current_user.rol not in ["docente", "admin", "superadmin"]:
        raise HTTPException(status_code=403, detail="Solo el docente puede autorizar")
    s.autorizada_por_docente = True
    s.docente_autorizo_en = datetime.now()
    if data.observaciones:
        s.observaciones = data.observaciones
    db.commit()
    return {"message": "Sesión autorizada correctamente"}


# ── RECONOCIMIENTO FACIAL ─────────────────────────────────

@router.post("/sesiones/{sesion_id}/reconocer")
async def reconocer_rostro(
    sesion_id: int,
    imagen: UploadFile = File(...),
    lat: Optional[float] = Form(None),
    lng: Optional[float] = Form(None),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    """
    Recibe una imagen del celular, detecta y reconoce el rostro,
    y registra la asistencia automáticamente.
    """
    sesion = db.query(SesionAsistencia).filter(SesionAsistencia.id == sesion_id).first()
    if not sesion or sesion.estado != "activa":
        raise HTTPException(status_code=400, detail="Sesión no activa")

    # Leer imagen
    img_bytes = await imagen.read()

    try:
        import numpy as np
        import cv2

        # Decodificar imagen
        nparr = np.frombuffer(img_bytes, np.uint8)
        frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        if frame is None:
            raise HTTPException(status_code=400, detail="No se pudo decodificar la imagen")

        # Usar servicio de reconocimiento
        from app.services.vision_service import reconocer_estudiante_en_frame
        resultado = reconocer_estudiante_en_frame(frame, sesion.asignacion.materia_id,
                                                   sesion.periodo_id, db)

        if not resultado["reconocido"]:
            return {"reconocido": False, "mensaje": resultado.get("mensaje", "No se reconoció ningún rostro")}

        # Registrar asistencia
        estudiante_id = resultado["estudiante_id"]
        confianza = resultado["confianza"]

        # Verificar estado (tardanza si aplica)
        minutos_transcurridos = (datetime.now() - sesion.hora_inicio).seconds // 60
        estado = "presente" if minutos_transcurridos <= settings.TARDANZA_TOLERANCIA_MINUTOS else "tardanza"

        registro = db.query(RegistroAsistencia).filter(
            RegistroAsistencia.sesion_id == sesion_id,
            RegistroAsistencia.estudiante_id == estudiante_id
        ).first()

        if registro:
            if registro.estado in ["ausente"]:  # Solo actualizar si estaba ausente
                registro.estado = estado
                registro.hora_registro = datetime.now()
                registro.confianza_ia = confianza
                registro.metodo = "facial"
                registro.lat = lat
                registro.lng = lng
                db.commit()

        estudiante = db.query(Estudiante).filter(Estudiante.id == estudiante_id).first()
        return {
            "reconocido": True,
            "estudiante_id": estudiante_id,
            "nombre": f"{estudiante.nombres} {estudiante.apellido_paterno}" if estudiante else None,
            "foto_url": estudiante.foto_url if estudiante else None,
            "estado": estado,
            "confianza": confianza,
            "mensaje": f"Asistencia registrada: {estado.upper()}"
        }

    except ImportError:
        # Fallback simulado cuando OpenCV no está instalado
        return {
            "reconocido": False,
            "mensaje": "Módulo de visión artificial no disponible. Use registro manual.",
            "modo": "simulacion"
        }


# ── REGISTRO MANUAL ──────────────────────────────────────

@router.put("/sesiones/{sesion_id}/registro-manual")
def registro_manual(sesion_id: int, data: RegistroManualCreate,
                     db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    """Registro manual de asistencia (corrección o casos sin IA)"""
    registro = db.query(RegistroAsistencia).filter(
        RegistroAsistencia.sesion_id == sesion_id,
        RegistroAsistencia.estudiante_id == data.estudiante_id
    ).first()
    if registro:
        registro.estado = data.estado
        registro.hora_registro = datetime.now()
        registro.metodo = "manual"
        registro.modificado_por = current_user.id
        registro.motivo_modificacion = data.motivo
    else:
        registro = RegistroAsistencia(
            sesion_id=sesion_id,
            estudiante_id=data.estudiante_id,
            estado=data.estado,
            hora_registro=datetime.now(),
            metodo="manual",
            modificado_por=current_user.id,
        )
        db.add(registro)
    db.commit()
    return {"message": "Registro actualizado", "estado": data.estado}


# ── ESTADÍSTICAS ─────────────────────────────────────────

@router.get("/estadisticas/estudiante/{estudiante_id}")
def estadisticas_estudiante(estudiante_id: int, periodo_id: Optional[int] = None,
                              db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    query = db.query(RegistroAsistencia).filter(
        RegistroAsistencia.estudiante_id == estudiante_id
    )
    registros = query.all()
    total = len(registros)
    presentes = sum(1 for r in registros if r.estado in ["presente", "tardanza", "justificado"])
    ausentes = sum(1 for r in registros if r.estado == "ausente")
    porcentaje = round((presentes / total * 100), 1) if total > 0 else 0
    return {
        "estudiante_id": estudiante_id,
        "total_clases": total,
        "presentes": presentes,
        "ausentes": ausentes,
        "tardanzas": sum(1 for r in registros if r.estado == "tardanza"),
        "justificados": sum(1 for r in registros if r.estado == "justificado"),
        "porcentaje_asistencia": porcentaje,
        "en_riesgo": porcentaje < (100 - settings.LIMITE_FALTAS_PORCENTAJE),
    }


@router.get("/dashboard/resumen")
def dashboard_resumen(periodo_id: Optional[int] = None,
                       db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    from app.models.models import Estudiante, Docente, Carrera
    return {
        "total_estudiantes": db.query(Estudiante).filter(Estudiante.activo == True).count(),
        "total_docentes": db.query(Docente).filter(Docente.activo == True).count(),
        "total_carreras": db.query(Carrera).filter(Carrera.activa == True).count(),
        "sesiones_hoy": db.query(SesionAsistencia).filter(
            SesionAsistencia.fecha == date.today()
        ).count(),
        "sesiones_activas": db.query(SesionAsistencia).filter(
            SesionAsistencia.estado == "activa"
        ).count(),
        "registros_hoy": db.query(RegistroAsistencia).join(SesionAsistencia).filter(
            SesionAsistencia.fecha == date.today(),
            RegistroAsistencia.estado.in_(["presente", "tardanza"])
        ).count(),
    }
