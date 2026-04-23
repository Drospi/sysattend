from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from typing import Optional
import numpy as np

from app.db.database import get_db
from app.core.security import get_current_user, get_current_admin
from app.models.models import Estudiante, Docente

router = APIRouter()


@router.post("/estudiante/{id}/capturar")
async def capturar_muestra_estudiante(
    id: int,
    foto: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    """Captura una muestra facial del estudiante para entrenamiento del modelo"""
    estudiante = db.query(Estudiante).filter(Estudiante.id == id).first()
    if not estudiante:
        raise HTTPException(status_code=404, detail="Estudiante no encontrado")
    
    img_bytes = await foto.read()
    
    try:
        import cv2
        nparr = np.frombuffer(img_bytes, np.uint8)
        frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        if frame is None:
            raise HTTPException(status_code=400, detail="Imagen inválida")
        
        from app.services.vision_service import registrar_embedding_estudiante
        resultado = registrar_embedding_estudiante(id, frame, db)
        return resultado
    except ImportError:
        # Sin OpenCV: guardar foto y marcar como pendiente de procesamiento
        import os, uuid, shutil
        filename = f"biom_est_{id}_{uuid.uuid4().hex[:8]}.jpg"
        path = f"uploads/biometria/{filename}"
        os.makedirs("uploads/biometria", exist_ok=True)
        with open(path, "wb") as f:
            f.write(img_bytes)
        estudiante.muestras_capturadas = (estudiante.muestras_capturadas or 0) + 1
        db.commit()
        return {
            "exito": True,
            "muestras_capturadas": estudiante.muestras_capturadas,
            "mensaje": "Foto guardada (pendiente de procesamiento IA)"
        }


@router.delete("/estudiante/{id}/biometria")
def eliminar_biometria_estudiante(id: int, db: Session = Depends(get_db),
                                    current_user=Depends(get_current_admin)):
    """Elimina la biometría de un estudiante (derecho al olvido RGPD)"""
    e = db.query(Estudiante).filter(Estudiante.id == id).first()
    if not e:
        raise HTTPException(status_code=404, detail="Estudiante no encontrado")
    e.embedding_facial = None
    e.muestras_capturadas = 0
    db.commit()
    return {"message": "Datos biométricos eliminados"}


@router.get("/estudiante/{id}/estado")
def estado_biometria(id: int, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    e = db.query(Estudiante).filter(Estudiante.id == id).first()
    if not e:
        raise HTTPException(status_code=404, detail="Estudiante no encontrado")
    return {
        "tiene_biometria": e.embedding_facial is not None,
        "muestras_capturadas": e.muestras_capturadas or 0,
        "listo_para_reconocimiento": (e.muestras_capturadas or 0) >= 5
    }
