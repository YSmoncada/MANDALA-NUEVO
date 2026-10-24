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
    configs = db.query(models.EmpresaConfig).all()
    if not configs:
        # Auto-inicializar configuración base si la tabla está vacía
        default_config = models.EmpresaConfig(
            nombre="Mandala Disco Club",
            nit="901.482.391-4",
            direccion="Calle 7 # 14-22, Melgar, Tolima",
            telefono="+57 312 456 7890",
            mensaje_footer="¡Gracias por su visita a Mandala! Síguenos en @mandala_melgar",
            moneda="$",
            impuesto_porcentaje=0
        )
        db.add(default_config)
        db.commit()
        db.refresh(default_config)
        configs = [default_config]
    return configs

@router.post("/", response_model=schemas.EmpresaConfig)
def create_config(
    config: schemas.EmpresaConfigBase, 
    db: Session = Depends(deps.get_db),
    current_user: models.Usuario = Depends(deps.check_admin_role)
):
    # Si ya existe una configuración, actualizarla en lugar de duplicar
    existing = db.query(models.EmpresaConfig).first()
    if existing:
        for key, value in config.dict(exclude_unset=True).items():
            setattr(existing, key, value)
        db.commit()
        db.refresh(existing)
        logger.info(f"Configuración de empresa actualizada por {current_user.username}")
        return existing

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
        # Upsert: si no existe el ID específico, actualizar el primero o crear uno nuevo
        db_config = db.query(models.EmpresaConfig).first()
        if not db_config:
            db_config = models.EmpresaConfig(**config.dict(exclude_unset=True))
            db.add(db_config)
            db.commit()
            db.refresh(db_config)
            logger.info(f"Configuración inicial creada en update por {current_user.username}")
            return db_config

    for key, value in config.dict(exclude_unset=True).items():
        setattr(db_config, key, value)
    db.commit()
    db.refresh(db_config)
    logger.info(f"Configuración {config_id} actualizada por {current_user.username}")
    return db_config
