from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from db import database, models
from core import security
from schemas import schemas
from api import deps
from typing import Optional
from datetime import datetime, timedelta, timezone
import logging

logger = logging.getLogger("mandala.auth")
router = APIRouter()

@router.post("/login/", response_model=schemas.Token)
def login(login_data: schemas.UserCreate, db: Session = Depends(deps.get_db)):
    user = db.query(models.Usuario).filter(models.Usuario.username == login_data.username).first()
    
    plain_password = login_data.password[:72] if login_data.password else ""
    
    if not user or not security.verify_password(plain_password, user.password):
        logger.warning(f"Intento de login fallido para: {login_data.username}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Usuario o contraseña incorrectos",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    if not user.activo:
        logger.warning(f"Intento de login para usuario inactivo: {user.username}")
        raise HTTPException(status_code=400, detail="Usuario inactivo")

    # Obtener rol
    role = "usuario"
    user_rol = db.query(models.UsuarioRol).filter(models.UsuarioRol.usuario_id == user.id).first()
    if user_rol:
        role = user_rol.rol.nombre.lower()

    # Generar JWT Tokens
    access_token = security.create_access_token(subject=user.username)
    refresh_token = security.create_refresh_token(subject=user.username)
    
    # Opcional: Guardar en DB para permitir revocación
    try:
        now = datetime.now(timezone.utc)
        new_session = models.UserSession(
            token=access_token,
            user_id=user.id,
            expires_at=now + timedelta(minutes=security.ACCESS_TOKEN_EXPIRE_MINUTES),
            created_at=now
        )
        db.add(new_session)
        db.commit()
    except Exception as e:
        db.rollback()
        logger.error(f"Error guardando sesión: {str(e)}")

    logger.info(f"Login exitoso (JWT): {user.username} (Rol: {role})")
    return {
        "token": access_token,
        "refresh": refresh_token,
        "role": role,
        "username": user.username,
        "nombre": user.nombre_completo or user.username,
        "user_id": user.id,
        "detail": f"Bienvenido {user.nombre_completo or user.username}"
    }

@router.post("/token/refresh/", response_model=schemas.TokenRefreshResponse)
def refresh_token(refresh_data: dict, db: Session = Depends(deps.get_db)):
    token = refresh_data.get("refresh")
    if not token:
        raise HTTPException(status_code=400, detail="Refresh token requerido")
    
    payload = security.decode_token(token)
    if not payload or payload.get("type") != "refresh":
        raise HTTPException(status_code=401, detail="Refresh token inválido o expirado")
    
    username = payload.get("sub")
    user = db.query(models.Usuario).filter(models.Usuario.username == username).first()
    if not user:
        raise HTTPException(status_code=401, detail="Usuario no encontrado")

    # Generar nuevo Access Token
    new_access_token = security.create_access_token(subject=user.username)

    return {"token": new_access_token}

@router.post("/logout/")
def logout(db: Session = Depends(deps.get_db), token: str = Depends(deps.oauth2_scheme)):
    if token:
        try:
            session = db.query(models.UserSession).filter(models.UserSession.token == token).first()
            if session:
                db.delete(session)
                db.commit()
        except Exception as e:
            db.rollback()
            logger.warning(f"Aviso en logout (no crítico): {e}")
    return {"detail": "Sesión cerrada correctamente"}
