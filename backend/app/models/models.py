"""
Modelos de base de datos - SysAttend AI
"""
from sqlalchemy import (Column, Integer, String, Float, Boolean, DateTime,
                        Date, Time, Text, ForeignKey, Enum, JSON)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db.database import Base
import enum


# ─────────────────────────────────────────
# ENUMS
# ─────────────────────────────────────────
class RolUsuario(str, enum.Enum):
    superadmin = "superadmin"
    admin = "admin"
    docente = "docente"
    encargado = "encargado"

class EstadoEstudiante(str, enum.Enum):
    regular = "regular"
    irregular = "irregular"
    congelado = "congelado"
    retirado = "retirado"
    egresado = "egresado"

class EstadoAsistencia(str, enum.Enum):
    presente = "presente"
    ausente = "ausente"
    tardanza = "tardanza"
    justificado = "justificado"

class EstadoSesion(str, enum.Enum):
    pendiente = "pendiente"
    activa = "activa"
    cerrada = "cerrada"
    cancelada = "cancelada"

class DiaSemana(str, enum.Enum):
    lunes = "lunes"
    martes = "martes"
    miercoles = "miercoles"
    jueves = "jueves"
    viernes = "viernes"
    sabado = "sabado"

class GrupoSanguineo(str, enum.Enum):
    a_pos = "A+"
    a_neg = "A-"
    b_pos = "B+"
    b_neg = "B-"
    ab_pos = "AB+"
    ab_neg = "AB-"
    o_pos = "O+"
    o_neg = "O-"


# ─────────────────────────────────────────
# USUARIO (sistema)
# ─────────────────────────────────────────
class Usuario(Base):
    __tablename__ = "usuarios"
    id            = Column(Integer, primary_key=True, index=True)
    username      = Column(String(50), unique=True, nullable=False, index=True)
    email         = Column(String(100), unique=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    rol           = Column(String(20), default="admin")
    activo        = Column(Boolean, default=True)
    creado_en     = Column(DateTime, server_default=func.now())
    # Relación con docente o estudiante
    docente_id    = Column(Integer, ForeignKey("docentes.id"), nullable=True)
    estudiante_id = Column(Integer, ForeignKey("estudiantes.id"), nullable=True)
    docente       = relationship("Docente", back_populates="usuario", foreign_keys=[docente_id])
    estudiante    = relationship("Estudiante", back_populates="usuario", foreign_keys=[estudiante_id])
    logs          = relationship("AuditLog", back_populates="usuario")


# ─────────────────────────────────────────
# CARRERA
# ─────────────────────────────────────────
class Carrera(Base):
    __tablename__ = "carreras"
    id            = Column(Integer, primary_key=True, index=True)
    nombre        = Column(String(150), nullable=False)
    codigo        = Column(String(20), unique=True, nullable=False)
    descripcion   = Column(Text, nullable=True)
    duracion_semestres = Column(Integer, default=10)
    activa        = Column(Boolean, default=True)
    creado_en     = Column(DateTime, server_default=func.now())
    materias      = relationship("Materia", back_populates="carrera")
    estudiantes   = relationship("Estudiante", back_populates="carrera")


# ─────────────────────────────────────────
# MATERIA
# ─────────────────────────────────────────
class Materia(Base):
    __tablename__ = "materias"
    id            = Column(Integer, primary_key=True, index=True)
    nombre        = Column(String(150), nullable=False)
    codigo        = Column(String(20), unique=True, nullable=False)
    descripcion   = Column(Text, nullable=True)
    creditos      = Column(Integer, default=3)
    horas_semana  = Column(Integer, default=4)
    semestre_num  = Column(Integer, nullable=False)   # 1-10
    carrera_id    = Column(Integer, ForeignKey("carreras.id"), nullable=False)
    activa        = Column(Boolean, default=True)
    creado_en     = Column(DateTime, server_default=func.now())
    carrera       = relationship("Carrera", back_populates="materias")
    asignaciones  = relationship("AsignacionDocente", back_populates="materia")
    inscripciones = relationship("Inscripcion", back_populates="materia")
    horarios      = relationship("Horario", back_populates="materia")


# ─────────────────────────────────────────
# SEMESTRE / PERIODO ACADÉMICO
# ─────────────────────────────────────────
class PeriodoAcademico(Base):
    __tablename__ = "periodos_academicos"
    id            = Column(Integer, primary_key=True, index=True)
    nombre        = Column(String(100), nullable=False)  # "1er Semestre 2025"
    anio          = Column(Integer, nullable=False)
    numero        = Column(Integer, nullable=False)       # 1 o 2
    fecha_inicio  = Column(Date, nullable=False)
    fecha_fin     = Column(Date, nullable=False)
    activo        = Column(Boolean, default=True)
    creado_en     = Column(DateTime, server_default=func.now())
    inscripciones = relationship("Inscripcion", back_populates="periodo")
    sesiones      = relationship("SesionAsistencia", back_populates="periodo")


# ─────────────────────────────────────────
# DOCENTE
# ─────────────────────────────────────────
class Docente(Base):
    __tablename__ = "docentes"
    id             = Column(Integer, primary_key=True, index=True)
    grado          = Column(String(50), nullable=True)   # Lic., Ing., MSc., Dr.
    nombres        = Column(String(100), nullable=False)
    apellido_paterno = Column(String(80), nullable=False)
    apellido_materno = Column(String(80), nullable=True)
    ci             = Column(String(20), unique=True, nullable=False)
    celular        = Column(String(20), nullable=True)
    email          = Column(String(100), unique=True, nullable=True)
    especialidad   = Column(String(150), nullable=True)
    tipo_contrato  = Column(String(50), nullable=True)   # item, contrato, honorarios
    codigo_docente = Column(String(30), unique=True, nullable=True)
    foto_url       = Column(String(255), nullable=True)
    embedding_facial = Column(JSON, nullable=True)        # vector 128-dim
    activo         = Column(Boolean, default=True)
    creado_en      = Column(DateTime, server_default=func.now())
    actualizado_en = Column(DateTime, onupdate=func.now())
    usuario        = relationship("Usuario", back_populates="docente",
                                  foreign_keys="Usuario.docente_id")
    asignaciones   = relationship("AsignacionDocente", back_populates="docente")


# ─────────────────────────────────────────
# ESTUDIANTE
# ─────────────────────────────────────────
class Estudiante(Base):
    __tablename__ = "estudiantes"
    id               = Column(Integer, primary_key=True, index=True)
    grado            = Column(String(50), nullable=True)
    nombres          = Column(String(100), nullable=False)
    apellido_paterno = Column(String(80), nullable=False)
    apellido_materno = Column(String(80), nullable=True)
    ci               = Column(String(20), unique=True, nullable=False)
    fecha_nacimiento = Column(Date, nullable=True)
    lugar_nacimiento = Column(String(100), nullable=True)
    genero           = Column(String(20), nullable=True)
    grupo_sanguineo  = Column(String(5), nullable=True)
    celular          = Column(String(20), nullable=True)
    email            = Column(String(100), unique=True, nullable=True)
    direccion        = Column(Text, nullable=True)
    codigo_saga      = Column(String(30), unique=True, nullable=True)
    matricula        = Column(String(30), unique=True, nullable=True)
    anio_ingreso     = Column(Integer, nullable=True)
    estado           = Column(String(20), default="regular")
    carrera_id       = Column(Integer, ForeignKey("carreras.id"), nullable=True)
    # Tutor
    tutor_nombre     = Column(String(150), nullable=True)
    tutor_relacion   = Column(String(50), nullable=True)  # padre, madre, tutor
    tutor_ci         = Column(String(20), nullable=True)
    tutor_celular    = Column(String(20), nullable=True)
    # Biometría
    foto_url         = Column(String(255), nullable=True)
    embedding_facial = Column(JSON, nullable=True)        # vector 128-dim
    muestras_capturadas = Column(Integer, default=0)
    # Flags
    activo           = Column(Boolean, default=True)
    creado_en        = Column(DateTime, server_default=func.now())
    actualizado_en   = Column(DateTime, onupdate=func.now())
    carrera          = relationship("Carrera", back_populates="estudiantes")
    usuario          = relationship("Usuario", back_populates="estudiante",
                                    foreign_keys="Usuario.estudiante_id")
    inscripciones    = relationship("Inscripcion", back_populates="estudiante")
    asistencias      = relationship("RegistroAsistencia", back_populates="estudiante")


# ─────────────────────────────────────────
# ASIGNACIÓN DOCENTE ↔ MATERIA
# ─────────────────────────────────────────
class AsignacionDocente(Base):
    __tablename__ = "asignaciones_docente"
    id         = Column(Integer, primary_key=True, index=True)
    docente_id = Column(Integer, ForeignKey("docentes.id"), nullable=False)
    materia_id = Column(Integer, ForeignKey("materias.id"), nullable=False)
    periodo_id = Column(Integer, ForeignKey("periodos_academicos.id"), nullable=False)
    grupo      = Column(String(10), default="A")
    activa     = Column(Boolean, default=True)
    creado_en  = Column(DateTime, server_default=func.now())
    docente    = relationship("Docente", back_populates="asignaciones")
    materia    = relationship("Materia", back_populates="asignaciones")
    horarios   = relationship("Horario", back_populates="asignacion")
    sesiones   = relationship("SesionAsistencia", back_populates="asignacion")


# ─────────────────────────────────────────
# HORARIO
# ─────────────────────────────────────────
class Horario(Base):
    __tablename__ = "horarios"
    id            = Column(Integer, primary_key=True, index=True)
    asignacion_id = Column(Integer, ForeignKey("asignaciones_docente.id"), nullable=False)
    materia_id    = Column(Integer, ForeignKey("materias.id"), nullable=False)
    dia           = Column(String(20), nullable=False)
    hora_inicio   = Column(Time, nullable=False)
    hora_fin      = Column(Time, nullable=False)
    aula          = Column(String(50), nullable=True)
    asignacion    = relationship("AsignacionDocente", back_populates="horarios")
    materia       = relationship("Materia", back_populates="horarios")


# ─────────────────────────────────────────
# INSCRIPCIÓN ESTUDIANTE ↔ MATERIA
# ─────────────────────────────────────────
class Inscripcion(Base):
    __tablename__ = "inscripciones"
    id            = Column(Integer, primary_key=True, index=True)
    estudiante_id = Column(Integer, ForeignKey("estudiantes.id"), nullable=False)
    materia_id    = Column(Integer, ForeignKey("materias.id"), nullable=False)
    periodo_id    = Column(Integer, ForeignKey("periodos_academicos.id"), nullable=False)
    grupo         = Column(String(10), default="A")
    es_encargado  = Column(Boolean, default=False)  # Encargado del curso
    activa        = Column(Boolean, default=True)
    creado_en     = Column(DateTime, server_default=func.now())
    estudiante    = relationship("Estudiante", back_populates="inscripciones")
    materia       = relationship("Materia", back_populates="inscripciones")
    periodo       = relationship("PeriodoAcademico", back_populates="inscripciones")


# ─────────────────────────────────────────
# SESIÓN DE ASISTENCIA (por clase)
# ─────────────────────────────────────────
class SesionAsistencia(Base):
    __tablename__ = "sesiones_asistencia"
    id            = Column(Integer, primary_key=True, index=True)
    asignacion_id = Column(Integer, ForeignKey("asignaciones_docente.id"), nullable=False)
    periodo_id    = Column(Integer, ForeignKey("periodos_academicos.id"), nullable=False)
    fecha         = Column(Date, nullable=False)
    hora_inicio   = Column(DateTime, nullable=False)
    hora_fin      = Column(DateTime, nullable=True)
    estado        = Column(String(20), default="pendiente")  # pendiente/activa/cerrada
    pin_sesion    = Column(String(6), nullable=True)          # PIN de 6 dígitos
    tomada_por_encargado = Column(Boolean, default=False)
    encargado_id  = Column(Integer, ForeignKey("estudiantes.id"), nullable=True)
    autorizada_por_docente = Column(Boolean, default=False)
    docente_autorizo_en = Column(DateTime, nullable=True)
    # Geolocalización
    lat_docente   = Column(Float, nullable=True)
    lng_docente   = Column(Float, nullable=True)
    observaciones = Column(Text, nullable=True)
    creado_en     = Column(DateTime, server_default=func.now())
    asignacion    = relationship("AsignacionDocente", back_populates="sesiones")
    periodo       = relationship("PeriodoAcademico", back_populates="sesiones")
    registros     = relationship("RegistroAsistencia", back_populates="sesion")
    encargado     = relationship("Estudiante", foreign_keys=[encargado_id])


# ─────────────────────────────────────────
# REGISTRO DE ASISTENCIA (por estudiante)
# ─────────────────────────────────────────
class RegistroAsistencia(Base):
    __tablename__ = "registros_asistencia"
    id            = Column(Integer, primary_key=True, index=True)
    sesion_id     = Column(Integer, ForeignKey("sesiones_asistencia.id"), nullable=False)
    estudiante_id = Column(Integer, ForeignKey("estudiantes.id"), nullable=False)
    estado        = Column(String(20), default="ausente")
    hora_registro = Column(DateTime, nullable=True)
    confianza_ia  = Column(Float, nullable=True)        # 0.0-1.0
    metodo        = Column(String(20), default="facial") # facial/manual
    foto_captura  = Column(String(255), nullable=True)
    lat           = Column(Float, nullable=True)
    lng           = Column(Float, nullable=True)
    dispositivo   = Column(String(100), nullable=True)
    modificado_por = Column(Integer, ForeignKey("usuarios.id"), nullable=True)
    motivo_modificacion = Column(Text, nullable=True)
    creado_en     = Column(DateTime, server_default=func.now())
    sesion        = relationship("SesionAsistencia", back_populates="registros")
    estudiante    = relationship("Estudiante", back_populates="asistencias")


# ─────────────────────────────────────────
# JUSTIFICACIÓN
# ─────────────────────────────────────────
class Justificacion(Base):
    __tablename__ = "justificaciones"
    id              = Column(Integer, primary_key=True, index=True)
    registro_id     = Column(Integer, ForeignKey("registros_asistencia.id"), nullable=False)
    estudiante_id   = Column(Integer, ForeignKey("estudiantes.id"), nullable=False)
    motivo          = Column(Text, nullable=False)
    documento_url   = Column(String(255), nullable=True)
    estado          = Column(String(20), default="pendiente")  # pendiente/aprobada/rechazada
    revisado_por    = Column(Integer, ForeignKey("usuarios.id"), nullable=True)
    creado_en       = Column(DateTime, server_default=func.now())


# ─────────────────────────────────────────
# LOG DE AUDITORÍA
# ─────────────────────────────────────────
class AuditLog(Base):
    __tablename__ = "audit_logs"
    id         = Column(Integer, primary_key=True, index=True)
    usuario_id = Column(Integer, ForeignKey("usuarios.id"), nullable=True)
    accion     = Column(String(100), nullable=False)
    tabla      = Column(String(50), nullable=True)
    registro_id = Column(Integer, nullable=True)
    detalle    = Column(JSON, nullable=True)
    ip         = Column(String(45), nullable=True)
    dispositivo = Column(String(200), nullable=True)
    creado_en  = Column(DateTime, server_default=func.now())
    usuario    = relationship("Usuario", back_populates="logs")
