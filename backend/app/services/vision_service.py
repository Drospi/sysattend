"""
Servicio de Visión Artificial — SysAttend AI
Implementa el pipeline: OpenCV → MediaPipe → CNN/TensorFlow → Embedding → Match
"""
import numpy as np
import json
from typing import Optional, Tuple
from sqlalchemy.orm import Session
from app.models.models import Estudiante, Inscripcion


# ─────────────────────────────────────────────────────────────────────────────
# DETECCIÓN DE ROSTRO CON MEDIAPIPE
# ─────────────────────────────────────────────────────────────────────────────
def detectar_rostro_mediapipe(frame: np.ndarray) -> Optional[np.ndarray]:
    """
    Usa MediaPipe FaceMesh para detectar y recortar el rostro.
    Aplica alineación facial con los 468 landmarks.
    Retorna la región del rostro normalizada 96x96 o None si no detecta.
    """
    try:
        import mediapipe as mp
        import cv2

        mp_face_mesh = mp.solutions.face_mesh
        with mp_face_mesh.FaceMesh(
            static_image_mode=True,
            max_num_faces=1,
            refine_landmarks=True,
            min_detection_confidence=0.5
        ) as face_mesh:
            rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            results = face_mesh.process(rgb_frame)

            if not results.multi_face_landmarks:
                return None

            h, w = frame.shape[:2]
            landmarks = results.multi_face_landmarks[0].landmark

            # Puntos clave para bounding box
            xs = [lm.x * w for lm in landmarks]
            ys = [lm.y * h for lm in landmarks]
            x1, y1 = max(0, int(min(xs)) - 20), max(0, int(min(ys)) - 20)
            x2, y2 = min(w, int(max(xs)) + 20), min(h, int(max(ys)) + 20)

            # Alineación facial: ojos como referencia
            # Ojo izquierdo: landmark 33, Ojo derecho: landmark 263
            left_eye = landmarks[33]
            right_eye = landmarks[263]
            dx = right_eye.x - left_eye.x
            dy = right_eye.y - left_eye.y
            import math
            angle = math.degrees(math.atan2(dy, dx))

            # Rotar para alinear ojos horizontalmente
            center = ((x1 + x2) // 2, (y1 + y2) // 2)
            M = cv2.getRotationMatrix2D(center, angle, 1.0)
            aligned = cv2.warpAffine(frame, M, (w, h))

            # Recortar rostro
            face_crop = aligned[y1:y2, x1:x2]
            if face_crop.size == 0:
                return None

            # Normalizar a 96x96
            face_resized = cv2.resize(face_crop, (96, 96))
            return face_resized

    except ImportError:
        # Fallback sin MediaPipe: Haar Cascade
        return _detectar_rostro_haar(frame)


def _detectar_rostro_haar(frame: np.ndarray) -> Optional[np.ndarray]:
    """Fallback con Haar Cascade cuando MediaPipe no está disponible"""
    try:
        import cv2
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')
        faces = cascade.detectMultiScale(gray, 1.1, 4, minSize=(60, 60))
        if len(faces) == 0:
            return None
        x, y, w, h = faces[0]
        face = frame[y:y+h, x:x+w]
        return cv2.resize(face, (96, 96))
    except Exception:
        return None


# ─────────────────────────────────────────────────────────────────────────────
# EXTRACCIÓN DE EMBEDDING (CNN TensorFlow/Keras)
# ─────────────────────────────────────────────────────────────────────────────
_model = None

def cargar_modelo():
    """Carga el modelo CNN (singleton)"""
    global _model
    if _model is not None:
        return _model
    try:
        import tensorflow as tf
        import os
        model_path = "app/models/face_model.h5"
        if os.path.exists(model_path):
            _model = tf.keras.models.load_model(model_path)
        else:
            # Construir modelo CNN por defecto si no existe uno entrenado
            _model = construir_modelo_cnn()
        return _model
    except ImportError:
        return None


def construir_modelo_cnn():
    """
    Construye la arquitectura CNN para embeddings faciales.
    Input: 96x96x3 → Output: 128-dim embedding normalizado L2
    """
    try:
        import tensorflow as tf
        from tensorflow.keras import layers, Model

        inputs = tf.keras.Input(shape=(96, 96, 3))
        x = layers.Conv2D(32, 3, activation='relu', padding='same')(inputs)
        x = layers.BatchNormalization()(x)
        x = layers.MaxPooling2D(2)(x)
        x = layers.Conv2D(64, 3, activation='relu', padding='same')(x)
        x = layers.BatchNormalization()(x)
        x = layers.MaxPooling2D(2)(x)
        x = layers.Conv2D(128, 3, activation='relu', padding='same')(x)
        x = layers.BatchNormalization()(x)
        x = layers.MaxPooling2D(2)(x)
        x = layers.Conv2D(256, 3, activation='relu', padding='same')(x)
        x = layers.GlobalAveragePooling2D()(x)
        x = layers.Dense(256, activation='relu')(x)
        x = layers.Dropout(0.3)(x)
        x = layers.Dense(128)(x)
        # Normalización L2 para embeddings
        outputs = layers.Lambda(lambda t: tf.math.l2_normalize(t, axis=1))(x)
        model = Model(inputs, outputs, name="FaceEmbeddingCNN")
        return model
    except Exception:
        return None


def extraer_embedding(face_img: np.ndarray) -> Optional[list]:
    """
    Extrae el embedding facial de 128 dimensiones desde la imagen del rostro.
    """
    model = cargar_modelo()
    if model is None:
        # Fallback: embedding simulado basado en histograma (baja precisión)
        return _embedding_fallback(face_img)
    try:
        import cv2
        # Preprocesamiento
        face_rgb = cv2.cvtColor(face_img, cv2.COLOR_BGR2RGB).astype(np.float32) / 255.0
        face_expanded = np.expand_dims(face_rgb, axis=0)
        embedding = model.predict(face_expanded, verbose=0)[0]
        return embedding.tolist()
    except Exception:
        return _embedding_fallback(face_img)


def _embedding_fallback(face_img: np.ndarray) -> list:
    """Embedding basado en histograma de color (solo para desarrollo)"""
    import cv2
    gray = cv2.cvtColor(face_img, cv2.COLOR_BGR2GRAY)
    hist = cv2.calcHist([gray], [0], None, [128], [0, 256])
    hist = hist.flatten() / (hist.sum() + 1e-7)
    return hist.tolist()


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
# RECONOCIMIENTO EN FRAME
# ─────────────────────────────────────────────────────────────────────────────
def reconocer_estudiante_en_frame(frame: np.ndarray, materia_id: int,
                                    periodo_id: int, db: Session) -> dict:
    """
    Pipeline completo: frame → detección → embedding → match con BD.
    Solo busca entre estudiantes inscritos en la materia/periodo.
    """
    from app.core.config import settings

    # 1. Detectar rostro
    face_img = detectar_rostro_mediapipe(frame)
    if face_img is None:
        return {"reconocido": False, "mensaje": "No se detectó ningún rostro en la imagen"}

    # 2. Extraer embedding
    embedding_nuevo = extraer_embedding(face_img)
    if embedding_nuevo is None:
        return {"reconocido": False, "mensaje": "Error al procesar la imagen facial"}

    # 3. Obtener estudiantes inscritos en esta materia
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
        return {"reconocido": False, "mensaje": "No hay estudiantes con biometría registrada"}

    # 4. Comparar con cada embedding en BD
    mejor_match = None
    mejor_similitud = 0.0
    umbral = settings.CONFIDENCE_THRESHOLD

    for estudiante in estudiantes:
        embedding_bd = estudiante.embedding_facial
        if not embedding_bd:
            continue
        dist = distancia_coseno(embedding_nuevo, embedding_bd)
        sim = similitud(dist)
        if sim > mejor_similitud:
            mejor_similitud = sim
            mejor_match = estudiante

    if mejor_match and mejor_similitud >= umbral:
        return {
            "reconocido": True,
            "estudiante_id": mejor_match.id,
            "confianza": mejor_similitud,
            "nombre": f"{mejor_match.nombres} {mejor_match.apellido_paterno}",
        }

    return {
        "reconocido": False,
        "mensaje": f"Rostro no reconocido (similitud máxima: {mejor_similitud:.1%})",
    }


# ─────────────────────────────────────────────────────────────────────────────
# REGISTRO DE MUESTRAS PARA ENTRENAMIENTO
# ─────────────────────────────────────────────────────────────────────────────
def registrar_embedding_estudiante(estudiante_id: int, frame: np.ndarray, db: Session) -> dict:
    """
    Captura y almacena el embedding facial de un estudiante.
    Se llama múltiples veces con diferentes frames para robusted.
    """
    face_img = detectar_rostro_mediapipe(frame)
    if face_img is None:
        return {"exito": False, "mensaje": "No se detectó rostro"}

    embedding = extraer_embedding(face_img)
    if embedding is None:
        return {"exito": False, "mensaje": "Error al procesar embedding"}

    estudiante = db.query(Estudiante).filter(Estudiante.id == estudiante_id).first()
    if not estudiante:
        return {"exito": False, "mensaje": "Estudiante no encontrado"}

    # Actualizar embedding (promedio si ya existe)
    if estudiante.embedding_facial:
        emb_anterior = np.array(estudiante.embedding_facial)
        emb_nuevo = np.array(embedding)
        emb_promedio = (emb_anterior + emb_nuevo) / 2.0
        # Normalizar
        norm = np.linalg.norm(emb_promedio)
        if norm > 0:
            emb_promedio = emb_promedio / norm
        estudiante.embedding_facial = emb_promedio.tolist()
    else:
        estudiante.embedding_facial = embedding

    estudiante.muestras_capturadas = (estudiante.muestras_capturadas or 0) + 1
    db.commit()

    return {
        "exito": True,
        "muestras_capturadas": estudiante.muestras_capturadas,
        "mensaje": f"Muestra {estudiante.muestras_capturadas} registrada"
    }
