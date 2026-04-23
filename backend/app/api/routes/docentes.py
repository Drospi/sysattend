from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from sqlalchemy import or_
from typing import Optional
import os, shutil, uuid
from pydantic import BaseModel

from app.db.database import get_db
from app.core.security import get_current_user, get_current_admin, get_password_hash
from app.models.models import Docente, Usuario
from app.core.config import settings

router = APIRouter()


class DocenteCreate(BaseModel):
    grado: Optional[str] = None
    nombres: str
    apellido_paterno: str
    apellido_materno: Optional[str] = None
    ci: str
    celular: Optional[str] = None
    email: Optional[str] = None
    especialidad: Optional[str] = None
    tipo_contrato: Optional[str] = None
    codigo_docente: Optional[str] = None


def docente_to_dict(d: Docente) -> dict:
    return {
        "id": d.id,
        "grado": d.grado,
        "nombres": d.nombres,
        "apellido_paterno": d.apellido_paterno,
        "apellido_materno": d.apellido_materno,
        "nombre_completo": f"{d.grado or ''} {d.nombres} {d.apellido_paterno} {d.apellido_materno or ''}".strip(),
        "ci": d.ci,
        "celular": d.celular,
        "email": d.email,
        "especialidad": d.especialidad,
        "tipo_contrato": d.tipo_contrato,
        "codigo_docente": d.codigo_docente,
        "foto_url": d.foto_url,
        "tiene_biometria": d.embedding_facial is not None,
        "activo": d.activo,
        "creado_en": str(d.creado_en) if d.creado_en else None,
    }


@router.get("/")
def listar_docentes(q: Optional[str] = None, skip: int = 0, limit: int = 50,
                    db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    query = db.query(Docente).filter(Docente.activo == True)
    if q:
        query = query.filter(or_(
            Docente.nombres.ilike(f"%{q}%"),
            Docente.apellido_paterno.ilike(f"%{q}%"),
            Docente.ci.ilike(f"%{q}%"),
        ))
    total = query.count()
    docentes = query.offset(skip).limit(limit).all()
    return {"total": total, "data": [docente_to_dict(d) for d in docentes]}


@router.get("/{id}")
def obtener_docente(id: int, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    d = db.query(Docente).filter(Docente.id == id).first()
    if not d:
        raise HTTPException(status_code=404, detail="Docente no encontrado")
    return docente_to_dict(d)


@router.post("/")
def crear_docente(data: DocenteCreate, db: Session = Depends(get_db),
                  current_user=Depends(get_current_admin)):
    if db.query(Docente).filter(Docente.ci == data.ci).first():
        raise HTTPException(status_code=400, detail="Ya existe un docente con ese CI")
    d = Docente(**data.dict())
    db.add(d)
    db.commit()
    db.refresh(d)
    # Crear usuario automáticamente
    username = f"doc_{data.ci}"
    if not db.query(Usuario).filter(Usuario.username == username).first():
        u = Usuario(
            username=username,
            email=data.email or f"{data.ci}@universidad.edu.bo",
            hashed_password=get_password_hash(data.ci),
            rol="docente",
            docente_id=d.id
        )
        db.add(u)
        db.commit()
    return docente_to_dict(d)


@router.put("/{id}")
def actualizar_docente(id: int, data: DocenteCreate, db: Session = Depends(get_db),
                       current_user=Depends(get_current_admin)):
    d = db.query(Docente).filter(Docente.id == id).first()
    if not d:
        raise HTTPException(status_code=404, detail="Docente no encontrado")
    for k, v in data.dict(exclude_unset=True).items():
        setattr(d, k, v)
    db.commit()
    db.refresh(d)
    return docente_to_dict(d)


@router.delete("/{id}")
def eliminar_docente(id: int, db: Session = Depends(get_db), current_user=Depends(get_current_admin)):
    d = db.query(Docente).filter(Docente.id == id).first()
    if not d:
        raise HTTPException(status_code=404, detail="Docente no encontrado")
    d.activo = False
    db.commit()
    return {"message": "Docente desactivado correctamente"}


@router.post("/{id}/foto")
async def subir_foto_docente(id: int, foto: UploadFile = File(...),
                              db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    d = db.query(Docente).filter(Docente.id == id).first()
    if not d:
        raise HTTPException(status_code=404, detail="Docente no encontrado")
    ext = foto.filename.split(".")[-1].lower()
    filename = f"doc_{id}_{uuid.uuid4().hex[:8]}.{ext}"
    path = os.path.join(settings.UPLOAD_DIR, "fotos_docentes", filename)
    with open(path, "wb") as f:
        shutil.copyfileobj(foto.file, f)
    d.foto_url = f"/uploads/fotos_docentes/{filename}"
    db.commit()
    return {"foto_url": d.foto_url}
