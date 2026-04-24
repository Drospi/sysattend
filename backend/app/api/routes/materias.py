from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Optional
from pydantic import BaseModel
from app.db.database import get_db
from app.core.security import get_current_user, get_current_admin, get_password_hash
from app.models.models import Materia, AsignacionDocente, Docente, PeriodoAcademico, Carrera, Usuario

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
    # Verificar que la asignación no exista ya
    existente = db.query(AsignacionDocente).filter(
        AsignacionDocente.docente_id == data.docente_id,
        AsignacionDocente.materia_id == data.materia_id,
        AsignacionDocente.periodo_id == data.periodo_id,
        AsignacionDocente.grupo == data.grupo
    ).first()
    
    if existente:
        raise HTTPException(status_code=400, detail="Ya existe esta asignación")
    
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


@router.delete("/asignaciones/{id}")
def eliminar_asignacion(id: int, db: Session = Depends(get_db), 
                        current_user=Depends(get_current_admin)):
    asignacion = db.query(AsignacionDocente).filter(AsignacionDocente.id == id).first()
    if not asignacion:
        raise HTTPException(status_code=404, detail="Asignación no encontrada")
    asignacion.activa = False
    db.commit()
    return {"message": "Asignación eliminada correctamente"}


# ============ SEEDER DE MATERIAS Y ASIGNACIONES ============
@router.post("/seed")
def seed_materias(force: bool = False, db: Session = Depends(get_db)):
    """Crea materias de ejemplo y asignaciones
    
    Args:
        force: Si es True, elimina todas las materias y asignaciones existentes antes de crear nuevas
    """
    
    # Si force es True, limpiar todo
    if force:
        print("=== FORCE ACTIVADO: Limpiando materias y asignaciones existentes ===")
        # Primero eliminar asignaciones (por la foreign key)
        asignaciones_eliminadas = db.query(AsignacionDocente).delete()
        # Luego eliminar materias
        materias_eliminadas = db.query(Materia).delete()
        db.commit()
        print(f"Eliminadas {asignaciones_eliminadas} asignaciones y {materias_eliminadas} materias")
    
    # Verificar si ya hay materias (solo si force es False)
    if not force and db.query(Materia).count() > 0:
        return {
            "message": "Ya existen materias en la base de datos", 
            "count": db.query(Materia).count(),
            "suggestion": "Usa force=true para recrear las materias"
        }
    
    # Obtener carreras existentes
    carrera_sistemas = db.query(Carrera).filter(Carrera.codigo == "ISI").first()
    carrera_civil = db.query(Carrera).filter(Carrera.codigo == "ICI").first()
    carrera_electronica = db.query(Carrera).filter(Carrera.codigo == "IEL").first()
    carrera_administracion = db.query(Carrera).filter(Carrera.codigo == "ADM").first()
    carrera_contaduria = db.query(Carrera).filter(Carrera.codigo == "CPA").first()
    
    if not carrera_sistemas:
        raise HTTPException(status_code=404, detail="No existen carreras. Ejecuta primero el seed de inicialización")
    
    # Obtener periodo activo
    periodo_activo = db.query(PeriodoAcademico).filter(PeriodoAcademico.activo == True).first()
    if not periodo_activo:
        periodo_activo = db.query(PeriodoAcademico).first()
        if not periodo_activo:
            raise HTTPException(status_code=404, detail="No existen periodos académicos. Ejecuta primero el seed de inicialización")
    
    # Materias por carrera
    materias_data = []
    
    # Ingeniería de Sistemas (ISI)
    materias_sistemas = [
        {"nombre": "Programación I", "codigo": "ISI101", "semestre_num": 1, "carrera_id": carrera_sistemas.id, "creditos": 4, "horas_semana": 6},
        {"nombre": "Cálculo I", "codigo": "ISI102", "semestre_num": 1, "carrera_id": carrera_sistemas.id, "creditos": 4, "horas_semana": 5},
        {"nombre": "Álgebra Lineal", "codigo": "ISI103", "semestre_num": 1, "carrera_id": carrera_sistemas.id, "creditos": 3, "horas_semana": 4},
        {"nombre": "Programación II", "codigo": "ISI201", "semestre_num": 2, "carrera_id": carrera_sistemas.id, "creditos": 4, "horas_semana": 6},
        {"nombre": "Cálculo II", "codigo": "ISI202", "semestre_num": 2, "carrera_id": carrera_sistemas.id, "creditos": 4, "horas_semana": 5},
        {"nombre": "Estructura de Datos", "codigo": "ISI203", "semestre_num": 2, "carrera_id": carrera_sistemas.id, "creditos": 4, "horas_semana": 6},
        {"nombre": "Bases de Datos", "codigo": "ISI301", "semestre_num": 3, "carrera_id": carrera_sistemas.id, "creditos": 4, "horas_semana": 5},
        {"nombre": "Ingeniería de Software", "codigo": "ISI302", "semestre_num": 3, "carrera_id": carrera_sistemas.id, "creditos": 3, "horas_semana": 4},
        {"nombre": "Redes de Computadoras", "codigo": "ISI401", "semestre_num": 4, "carrera_id": carrera_sistemas.id, "creditos": 3, "horas_semana": 4},
        {"nombre": "Inteligencia Artificial", "codigo": "ISI402", "semestre_num": 4, "carrera_id": carrera_sistemas.id, "creditos": 4, "horas_semana": 5},
        {"nombre": "Desarrollo Web", "codigo": "ISI501", "semestre_num": 5, "carrera_id": carrera_sistemas.id, "creditos": 3, "horas_semana": 5},
        {"nombre": "Proyecto de Grado", "codigo": "ISI999", "semestre_num": 10, "carrera_id": carrera_sistemas.id, "creditos": 8, "horas_semana": 0},
    ]
    materias_data.extend(materias_sistemas)
    
    # Ingeniería Civil (ICI)
    if carrera_civil:
        materias_civil = [
            {"nombre": "Cálculo I", "codigo": "ICI101", "semestre_num": 1, "carrera_id": carrera_civil.id, "creditos": 4, "horas_semana": 5},
            {"nombre": "Física I", "codigo": "ICI102", "semestre_num": 1, "carrera_id": carrera_civil.id, "creditos": 4, "horas_semana": 5},
            {"nombre": "Dibujo Técnico", "codigo": "ICI103", "semestre_num": 1, "carrera_id": carrera_civil.id, "creditos": 3, "horas_semana": 4},
            {"nombre": "Cálculo II", "codigo": "ICI201", "semestre_num": 2, "carrera_id": carrera_civil.id, "creditos": 4, "horas_semana": 5},
            {"nombre": "Física II", "codigo": "ICI202", "semestre_num": 2, "carrera_id": carrera_civil.id, "creditos": 4, "horas_semana": 5},
            {"nombre": "Mecánica de Materiales", "codigo": "ICI301", "semestre_num": 3, "carrera_id": carrera_civil.id, "creditos": 4, "horas_semana": 5},
            {"nombre": "Hidráulica", "codigo": "ICI401", "semestre_num": 4, "carrera_id": carrera_civil.id, "creditos": 3, "horas_semana": 4},
        ]
        materias_data.extend(materias_civil)
    
    # Administración de Empresas (ADM)
    if carrera_administracion:
        materias_admin = [
            {"nombre": "Introducción a la Administración", "codigo": "ADM101", "semestre_num": 1, "carrera_id": carrera_administracion.id, "creditos": 3, "horas_semana": 4},
            {"nombre": "Matemáticas Básicas", "codigo": "ADM102", "semestre_num": 1, "carrera_id": carrera_administracion.id, "creditos": 3, "horas_semana": 4},
            {"nombre": "Contabilidad General", "codigo": "ADM103", "semestre_num": 1, "carrera_id": carrera_administracion.id, "creditos": 4, "horas_semana": 5},
            {"nombre": "Marketing", "codigo": "ADM201", "semestre_num": 2, "carrera_id": carrera_administracion.id, "creditos": 3, "horas_semana": 4},
            {"nombre": "Gestión Financiera", "codigo": "ADM301", "semestre_num": 3, "carrera_id": carrera_administracion.id, "creditos": 4, "horas_semana": 5},
        ]
        materias_data.extend(materias_admin)
    
    # Crear materias
    materias_creadas = []
    for data in materias_data:
        materia = Materia(**data)
        db.add(materia)
        db.flush()
        materias_creadas.append({"nombre": materia.nombre, "codigo": materia.codigo, "id": materia.id})
    
    db.commit()
    
    # Ahora crear asignaciones de docentes a materias
    # Obtener docentes existentes
    docentes = db.query(Docente).limit(5).all()
    
    if docentes and materias_creadas:
        asignaciones_creadas = []
        
        # Asignaciones de ejemplo
        asignaciones_data = [
            # Docente 1 a materias de Sistemas (Programación, Bases de Datos)
            (docentes[0].id if len(docentes) > 0 else None, "ISI101", periodo_activo.id, "A"),
            (docentes[0].id if len(docentes) > 0 else None, "ISI203", periodo_activo.id, "A"),
            (docentes[0].id if len(docentes) > 0 else None, "ISI301", periodo_activo.id, "A"),
            
            # Docente 2 a materias de Sistemas (Redes, IA)
            (docentes[1].id if len(docentes) > 1 else None, "ISI401", periodo_activo.id, "A"),
            (docentes[1].id if len(docentes) > 1 else None, "ISI402", periodo_activo.id, "A"),
            
            # Docente 3 a materias de Civil
            (docentes[2].id if len(docentes) > 2 else None, "ICI301", periodo_activo.id, "A"),
            
            # Docente 4 a materias de Administración
            (docentes[3].id if len(docentes) > 3 else None, "ADM201", periodo_activo.id, "A"),
            (docentes[3].id if len(docentes) > 3 else None, "ADM301", periodo_activo.id, "A"),
        ]
        
        for docente_id, codigo_materia, periodo_id, grupo in asignaciones_data:
            if not docente_id:
                continue
                
            materia = db.query(Materia).filter(Materia.codigo == codigo_materia).first()
            if not materia:
                continue
            
            asignacion = AsignacionDocente(
                docente_id=docente_id,
                materia_id=materia.id,
                periodo_id=periodo_id,
                grupo=grupo,
                activa=True
            )
            db.add(asignacion)
            asignaciones_creadas.append({
                "docente": next((d.nombres for d in docentes if d.id == docente_id), "Desconocido"),
                "materia": materia.nombre
            })
        
        db.commit()
        
        return {
            "message": "Seeder de materias y asignaciones completado",
            "force_used": force,
            "materias_creadas": len(materias_creadas),
            "materias": materias_creadas,
            "asignaciones_creadas": len(asignaciones_creadas),
            "asignaciones": asignaciones_creadas,
            "total_materias_bd": db.query(Materia).count(),
            "total_asignaciones_bd": db.query(AsignacionDocente).count()
        }
    
    return {
        "message": "Seeder de materias completado",
        "force_used": force,
        "materias_creadas": len(materias_creadas),
        "materias": materias_creadas,
        "total_materias_bd": db.query(Materia).count()
    }


@router.post("/seed/materias-solo")
def seed_solo_materias(force: bool = False, db: Session = Depends(get_db)):
    """Crea SOLO las materias que faltan sin eliminar las existentes
    
    Args:
        force: Si es True, elimina todas las materias existentes antes de crear nuevas
    """
    
    # Si force es True, limpiar materias (pero no asignaciones)
    if force:
        print("=== FORCE ACTIVADO: Limpiando materias existentes ===")
        # Primero eliminar asignaciones (por la foreign key)
        db.query(AsignacionDocente).delete()
        # Luego eliminar materias
        materias_eliminadas = db.query(Materia).delete()
        db.commit()
        print(f"Eliminadas {materias_eliminadas} materias y sus asignaciones")
    
    # Obtener carreras
    carreras = db.query(Carrera).all()
    if not carreras:
        raise HTTPException(status_code=404, detail="No existen carreras")
    
    carrera_map = {c.nombre: c.id for c in carreras}
    
    materias_data = [
        # Ingeniería de Sistemas
        {"nombre": "Programación I", "codigo": "ISI101", "semestre_num": 1, "carrera_id": carrera_map.get("Ingeniería de Sistemas", carreras[0].id), "creditos": 4, "horas_semana": 6},
        {"nombre": "Programación II", "codigo": "ISI201", "semestre_num": 2, "carrera_id": carrera_map.get("Ingeniería de Sistemas", carreras[0].id), "creditos": 4, "horas_semana": 6},
        {"nombre": "Bases de Datos", "codigo": "ISI301", "semestre_num": 3, "carrera_id": carrera_map.get("Ingeniería de Sistemas", carreras[0].id), "creditos": 4, "horas_semana": 5},
        
        # Ingeniería Civil
        {"nombre": "Cálculo I", "codigo": "ICI101", "semestre_num": 1, "carrera_id": carrera_map.get("Ingeniería Civil", carreras[0].id), "creditos": 4, "horas_semana": 5},
        {"nombre": "Física I", "codigo": "ICI102", "semestre_num": 1, "carrera_id": carrera_map.get("Ingeniería Civil", carreras[0].id), "creditos": 4, "horas_semana": 5},
        
        # Administración
        {"nombre": "Administración General", "codigo": "ADM101", "semestre_num": 1, "carrera_id": carrera_map.get("Administración de Empresas", carreras[0].id), "creditos": 3, "horas_semana": 4},
    ]
    
    materias_creadas = []
    for data in materias_data:
        # Si no es force, verificar si ya existe
        if not force:
            existente = db.query(Materia).filter(Materia.codigo == data["codigo"]).first()
            if existente:
                continue
        
        materia = Materia(**data)
        db.add(materia)
        db.flush()
        materias_creadas.append(materia.nombre)
    
    db.commit()
    
    return {
        "message": f"Materias {'recreadas' if force else 'faltantes creadas'} correctamente",
        "force_used": force,
        "creadas": len(materias_creadas),
        "materias": materias_creadas,
        "total_bd": db.query(Materia).count()
    }