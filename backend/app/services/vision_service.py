"""
Servicio de Visión Artificial — SysAttend AI
Implementa el pipeline: OpenCV → DeepFace (Facenet) → Embedding → Match
"""
import numpy as np
from sqlalchemy.orm import Session
from app.models.models import Estudiante, Inscripcion

# ─────────────────────────────────────────────────────────────────────────────
# EXTRACCIÓN DE EMBEDDING (DEEPFACE NATIVO)
# ─────────────────────────────────────────────────────────────────────────────
def procesar_rostro(frame: np.ndarray) -> dict:
    """
    DeepFace hace todo en 1 paso: Detecta, recorta, alinea y extrae el embedding.
    """
    try:
        from deepface import DeepFace
        
        # detector_backend="opencv" evita usar MediaPipe por completo.
        # enforce_detection=True hace que falle rápido si no hay un rostro en la cámara.
        resultados = DeepFace.represent(
            img_path=frame,
            model_name="Facenet",
            detector_backend="opencv", 
            enforce_detection=True,
            align=True
        )
        
        return {"exito": True, "embedding": resultados[0]["embedding"]}
        
    except ValueError:
        # DeepFace lanza ValueError si no encuentra ninguna cara en la imagen
        return {"exito": False, "mensaje": "Encuadre su rostro / No detectado"}
    except Exception as e:
        print(f"Error procesando rostro: {e}")
        return {"exito": False, "mensaje": "Procesando IA..."}

# ─────────────────────────────────────────────────────────────────────────────
# COMPARACIÓN DE EMBEDDINGS
# ─────────────────────────────────────────────────────────────────────────────
def distancia_coseno(v1: list, v2: list) -> float:
    """Distancia coseno entre dos embeddings. 0 = idénticos, 2 = opuestos."""
    a = np.array(v1)
    b = np.array(v2)
    dot = np.dot(a, b)
    norm = np.linalg.norm(a) * np.linalg.norm(b)
    return 1.0 - (dot / (norm + 1e-7))

def similitud(dist: float) -> float:
    """Convierte distancia coseno a similitud [0,1]"""
    return max(0.0, 1.0 - dist)

# ─────────────────────────────────────────────────────────────────────────────
# RECONOCIMIENTO EN FRAME (TOMA DE ASISTENCIA)
# ─────────────────────────────────────────────────────────────────────────────
def reconocer_estudiante_en_frame(frame: np.ndarray, materia_id: int,
                                  periodo_id: int, db: Session) -> dict:
    from app.core.config import settings

    # 1. Extraer embedding (con detección incluida)
    ia_data = procesar_rostro(frame)
    if not ia_data["exito"]:
        return {"reconocido": False, "mensaje": ia_data["mensaje"]}

    embedding_nuevo = ia_data["embedding"]

    # 2. Buscar estudiantes inscritos
    inscritos = db.query(Inscripcion).filter(
        Inscripcion.materia_id == materia_id,
        Inscripcion.periodo_id == periodo_id,
        Inscripcion.activa == True
    ).all()

    estudiantes_ids = [i.estudiante_id for i in inscritos]
    estudiantes = db.query(Estudiante).filter(
        Estudiante.id.in_(estudiantes_ids),
        Estudiante.embedding_facial.isnot(None)
    ).all()

    if not estudiantes:
        return {"reconocido": False, "mensaje": "No hay biometrías registradas"}

    # 3. Comparar con la base de datos
    mejor_match = None
    mejor_similitud = 0.0
    umbral = getattr(settings, 'CONFIDENCE_THRESHOLD', 0.70) 

    for estudiante in estudiantes:
        dist = distancia_coseno(embedding_nuevo, estudiante.embedding_facial)
        sim = similitud(dist)
        
        if sim > mejor_similitud:
            mejor_similitud = sim
            mejor_match = estudiante

    if mejor_match and mejor_similitud >= umbral:
        return {
            "reconocido": True,
            "estudiante_id": mejor_match.id,
            "confianza": round(mejor_similitud * 100, 1), # Ya se envía en formato 85.0
            "nombre": f"{mejor_match.nombres} {mejor_match.apellido_paterno}",
        }

    return {
        "reconocido": False,
        "mensaje": f"No reconocido (Similitud: {mejor_similitud:.1%})",
    }

# ─────────────────────────────────────────────────────────────────────────────
# REGISTRO DE MUESTRAS PARA ENTRENAMIENTO (BIOMETRÍA)
# ─────────────────────────────────────────────────────────────────────────────
def registrar_embedding_estudiante(estudiante_id: int, frame: np.ndarray, db: Session) -> dict:
    
    ia_data = procesar_rostro(frame)
    if not ia_data["exito"]:
        return {"exito": False, "mensaje": ia_data["mensaje"]}

    embedding = ia_data["embedding"]

    estudiante = db.query(Estudiante).filter(Estudiante.id == estudiante_id).first()
    if not estudiante:
        return {"exito": False, "mensaje": "Estudiante no encontrado"}

    n = estudiante.muestras_capturadas or 0

    if n == 0 or not estudiante.embedding_facial:
        estudiante.embedding_facial = embedding
    else:
        # Promedio Ponderado
        emb_anterior = np.array(estudiante.embedding_facial)
        emb_nuevo = np.array(embedding)
        
        emb_promedio = ((emb_anterior * n) + emb_nuevo) / (n + 1)
        
        norm = np.linalg.norm(emb_promedio)
        if norm > 0:
            emb_promedio = emb_promedio / norm
            
        estudiante.embedding_facial = emb_promedio.tolist()

    estudiante.muestras_capturadas = n + 1
    db.commit()

    return {
        "exito": True,
        "muestras_capturadas": estudiante.muestras_capturadas,
        "mensaje": "Muestra registrada"
    }