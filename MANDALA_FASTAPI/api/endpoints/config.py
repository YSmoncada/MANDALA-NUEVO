from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from db import database, models
from schemas import schemas
from api import deps
from typing import List
import logging

logger = logging.getLogger("mandala.config")
router = APIRouter()

@router.get("/", response_model=List[schemas.EmpresaConfig])
def get_config(
    db: Session = Depends(deps.get_db),
    current_user: models.Usuario = Depends(deps.get_current_active_user)
):
    return db.query(models.EmpresaConfig).all()

@router.post("/", response_model=schemas.EmpresaConfig)
def create_config(
    config: schemas.EmpresaConfigBase, 
    db: Session = Depends(deps.get_db),
    current_user: models.Usuario = Depends(deps.check_admin_role)
):
    db_config = models.EmpresaConfig(**config.dict())
    db.add(db_config)
    db.commit()
    db.refresh(db_config)
    logger.info(f"Configuración de empresa creada por {current_user.username}")
    return db_config

@router.put("/{config_id}/", response_model=schemas.EmpresaConfig)
@router.patch("/{config_id}/", response_model=schemas.EmpresaConfig)
def update_config(
    config_id: int, 
    config: schemas.EmpresaConfigUpdate, 
    db: Session = Depends(deps.get_db),
    current_user: models.Usuario = Depends(deps.check_admin_role)
):
    db_config = db.query(models.EmpresaConfig).filter(models.EmpresaConfig.id == config_id).first()
    if not db_config:
        raise HTTPException(status_code=404, detail="Configuración no encontrada")
    for key, value in config.dict(exclude_unset=True).items():
        setattr(db_config, key, value)
    db.commit()
    db.refresh(db_config)
    logger.info(f"Configuración {config_id} actualizada por {current_user.username}")
    return db_config
