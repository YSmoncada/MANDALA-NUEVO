from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload
from db import database, models
from schemas import schemas
from core import security
from api import deps
from typing import List
import logging

logger = logging.getLogger("mandala.usuarios")
router = APIRouter()

def validate_secure_password(password: str):
    if not password or len(password) < 6:
        raise HTTPException(status_code=400, detail="La contraseña debe tener al menos 6 caracteres")
    has_letter = any(c.isalpha() for c in password)
    has_digit = any(c.isdigit() for c in password)
    if not (has_letter and has_digit):
        raise HTTPException(status_code=400, detail="La contraseña debe ser segura: incluye letras y al menos un número")

@router.get("/")
def get_usuarios(
    db: Session = Depends(deps.get_db), 
    current_user: models.Usuario = Depends(deps.check_admin_role)
):
    users = db.query(models.Usuario).options(joinedload(models.Usuario.roles_asignados)).all()
    results = []
    for user in users:
        # Convertir a dict para manipular o usar el objeto directamente
        # Pydantic con from_attributes=True leerá las propiedades que añadamos
        role_name = "usuario"
        if user.roles_asignados:
            rol_rel = db.query(models.Rol).filter(models.Rol.id == user.roles_asignados[0].rol_id).first()
            if rol_rel:
                role_name = rol_rel.nombre
        
        # Añadir el atributo dinámico que el esquema espera
        user.user_role = role_name
        results.append(user)
        
    return results

@router.post("/", response_model=schemas.User)
def create_usuario(
    usuario: schemas.UserCreate, 
    db: Session = Depends(deps.get_db),
    current_user: models.Usuario = Depends(deps.check_admin_role)
):
    db_user = db.query(models.Usuario).filter(models.Usuario.username == usuario.username).first()
    if db_user:
        raise HTTPException(status_code=400, detail="El nombre de usuario ya está registrado")
    
    validate_secure_password(usuario.password)
    hashed_password = security.get_password_hash(usuario.password)
    db_user = models.Usuario(
        username=usuario.username,
        email=usuario.email,
        password=hashed_password,
        nombre_completo=usuario.nombre_completo,
        activo=usuario.activo
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    
    if usuario.role:
        rol = db.query(models.Rol).filter(models.Rol.nombre.ilike(usuario.role)).first()
        if rol:
            db.add(models.UsuarioRol(usuario_id=db_user.id, rol_id=rol.id))
            db.commit()
    
    logger.info(f"Usuario {db_user.username} creado por {current_user.username}")
    return db_user

@router.put("/{user_id}/", response_model=schemas.User)
def update_usuario(
    user_id: int, 
    usuario: schemas.UserUpdate, 
    db: Session = Depends(deps.get_db),
    current_user: models.Usuario = Depends(deps.check_admin_role)
):
    db_user = db.query(models.Usuario).filter(models.Usuario.id == user_id).first()
    if not db_user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    
    data = usuario.dict(exclude_unset=True)
    if "password" in data:
        data["password"] = security.get_password_hash(data["password"])
        
    for key, value in data.items():
        setattr(db_user, key, value)
        
    db.commit()
    db.refresh(db_user)
    logger.info(f"Usuario {db_user.username} actualizado por {current_user.username}")
    return db_user

@router.delete("/{user_id}/")
def delete_usuario(
    user_id: int, 
    db: Session = Depends(deps.get_db),
    current_user: models.Usuario = Depends(deps.check_admin_role)
):
    db_user = db.query(models.Usuario).filter(models.Usuario.id == user_id).first()
    if not db_user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    
    username = db_user.username
    db.delete(db_user)
    db.commit()
    logger.info(f"Usuario {username} eliminado por {current_user.username}")
    return {"detail": "Usuario eliminado"}

@router.get("/roles/", response_model=List[schemas.Rol])
def get_roles(
    db: Session = Depends(deps.get_db),
    current_user: models.Usuario = Depends(deps.get_current_active_user)
):
    return db.query(models.Rol).all()

@router.post("/{user_id}/cambiar-password/")
def change_password(
    user_id: int, 
    data: dict, 
    db: Session = Depends(deps.get_db),
    current_user: models.Usuario = Depends(deps.check_admin_role)
):
    db_user = db.query(models.Usuario).filter(models.Usuario.id == user_id).first()
    if not db_user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    
    new_password = data.get("password")
    if not new_password:
        raise HTTPException(status_code=400, detail="Contraseña requerida")
        
    validate_secure_password(new_password)
    db_user.password = security.get_password_hash(new_password)
    db.commit()
    logger.info(f"Contraseña de {db_user.username} cambiada por {current_user.username}")
    return {"detail": "Contraseña actualizada"}
