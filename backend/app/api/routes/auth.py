from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from datetime import timedelta
from pydantic import BaseModel

from app.db.database import get_db
from app.core.security import verify_password, create_access_token, get_current_user, get_password_hash
from app.core.config import settings
from app.models.models import Usuario

router = APIRouter()

class LoginResponse(BaseModel):
    access_token: str
    token_type: str
    rol: str
    nombre: str
    id: int

class ChangePasswordRequest(BaseModel):
    password_actual: str
    password_nuevo: str

@router.post("/login", response_model=LoginResponse)
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(Usuario).filter(
        (Usuario.username == form_data.username) | (Usuario.email == form_data.username)
    ).first()
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Usuario o contraseña incorrectos"
        )
    if not user.activo:
        raise HTTPException(status_code=403, detail="Usuario desactivado")
    token = create_access_token(
        data={"sub": str(user.id)},
        expires_delta=timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    nombre = ""
    if user.docente:
        nombre = f"{user.docente.nombres} {user.docente.apellido_paterno}"
    elif user.estudiante:
        nombre = f"{user.estudiante.nombres} {user.estudiante.apellido_paterno}"
    else:
        nombre = user.username
    return {"access_token": token, "token_type": "bearer", "rol": user.rol, "nombre": nombre, "id": user.id}

@router.get("/me")
def get_me(current_user: Usuario = Depends(get_current_user)):
    return {
        "id": current_user.id,
        "username": current_user.username,
        "email": current_user.email,
        "rol": current_user.rol,
        "docente_id": current_user.docente_id,
        "estudiante_id": current_user.estudiante_id,
    }

@router.post("/cambiar-password")
def cambiar_password(
    data: ChangePasswordRequest,
    current_user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if not verify_password(data.password_actual, current_user.hashed_password):
        raise HTTPException(status_code=400, detail="Contraseña actual incorrecta")
    current_user.hashed_password = get_password_hash(data.password_nuevo)
    db.commit()
    return {"message": "Contraseña actualizada correctamente"}
