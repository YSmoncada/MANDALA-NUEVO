from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from db import database, models
from schemas import schemas
from api import deps
from typing import List
import logging
import random

logger = logging.getLogger("mandala.mesas")
router = APIRouter()

def assign_waiter(db: Session, mesa: models.Mesa):
    # Buscar meseros activos
    waiters = db.query(models.Usuario).join(models.UsuarioRol).join(models.Rol).filter(
        models.Usuario.activo == True,
        models.Rol.nombre.ilike("%meser%")
    ).all()
    
    if not waiters:
        # Si no hay meseros, buscar admins activos como fallback
        waiters = db.query(models.Usuario).join(models.UsuarioRol).join(models.Rol).filter(
            models.Usuario.activo == True,
            models.Rol.nombre.ilike("%admin%")
        ).all()
        
    if not waiters:
        return None
        
    # Contar mesas ocupadas asignadas a cada mesero para distribuir el trabajo de forma uniforme
    estado_ocupada = db.query(models.EstadoMesa).filter(models.EstadoMesa.nombre.ilike("Ocupada")).first()
    ocupada_id = estado_ocupada.id if estado_ocupada else None
    
    waiter_loads = []
    for w in waiters:
        q = db.query(models.Mesa).filter(models.Mesa.mesero_id == w.id)
        if ocupada_id:
            q = q.filter(models.Mesa.estado == ocupada_id)
        load = q.count()
        waiter_loads.append((w, load))
        
    # Seleccionar quien tenga menos mesas ocupadas asignadas
    min_load = min(load for w, load in waiter_loads)
    candidates = [w for w, load in waiter_loads if load == min_load]
    
    selected = random.choice(candidates)
    mesa.mesero_id = selected.id
    db.commit()
    db.refresh(mesa)
    logger.info(f"Mesa {mesa.numero} asignada uniformemente a {selected.username} (carga actual: {min_load} mesas ocupadas)")
    return selected

@router.get("/")
def get_mesas(
    db: Session = Depends(deps.get_db),
    current_user: models.Usuario = Depends(deps.get_current_active_user)
):
    mesas_list = db.query(models.Mesa).all()
    for m in mesas_list:
        est = db.query(models.EstadoMesa).filter(models.EstadoMesa.id == m.estado).first()
        if est:
            m.estado_nombre = est.nombre
        if m.rel_mesero:
            m.mesero_nombre = m.rel_mesero.nombre_completo or m.rel_mesero.username
    return mesas_list

@router.get("/{mesa_id}/")
def get_mesa(
    mesa_id: int, 
    db: Session = Depends(deps.get_db)
):
    db_mesa = db.query(models.Mesa).filter(models.Mesa.id == mesa_id).first()
    if not db_mesa:
        raise HTTPException(status_code=404, detail="Mesa no encontrada")
    
    est = db.query(models.EstadoMesa).filter(models.EstadoMesa.id == db_mesa.estado).first()
    if est:
        db_mesa.estado_nombre = est.nombre
        
    # Asignación automática si la mesa aún no tiene mesero asignado
    if not db_mesa.mesero_id:
        assign_waiter(db, db_mesa)
        
    if db_mesa.rel_mesero:
        db_mesa.mesero_nombre = db_mesa.rel_mesero.nombre_completo or db_mesa.rel_mesero.username
        
    return db_mesa

@router.post("/{mesa_id}/pedir-cuenta/")
def pedir_cuenta(mesa_id: int, db: Session = Depends(deps.get_db)):
    db_mesa = db.query(models.Mesa).filter(models.Mesa.id == mesa_id).first()
    if not db_mesa:
        raise HTTPException(status_code=404, detail="Mesa no encontrada")
    
    # Validar que no haya pedidos pendientes de preparación o entrega
    pedidos_pendientes = db.query(models.Pedido).join(
        models.EstadoPedido, models.Pedido.estado == models.EstadoPedido.id
    ).filter(
        models.Pedido.mesa == mesa_id,
        (models.EstadoPedido.nombre.ilike("%pendiente%")) | 
        (models.EstadoPedido.nombre.ilike("%preparando%")) | 
        (models.EstadoPedido.nombre.ilike("%aceptado%"))
    ).count()
    
    if pedidos_pendientes > 0:
        raise HTTPException(
            status_code=400, 
            detail="No puedes pedir la cuenta mientras tengas pedidos en preparación o pendientes de entrega."
        )
    
    db_mesa.pidiendo_cuenta = True
    db.commit()
    logger.info(f"Mesa {db_mesa.numero} ha pedido la cuenta")
    return {"detail": "Cuenta solicitada exitosamente"}

@router.post("/{mesa_id}/limpiar-cuenta/")
def limpiar_cuenta(
    mesa_id: int, 
    db: Session = Depends(deps.get_db),
    current_user: models.Usuario = Depends(deps.get_current_active_user)
):
    db_mesa = db.query(models.Mesa).filter(models.Mesa.id == mesa_id).first()
    if not db_mesa:
        raise HTTPException(status_code=404, detail="Mesa no encontrada")
    
    db_mesa.pidiendo_cuenta = False
    db.commit()
    return {"detail": "Alerta de cuenta limpiada"}

@router.post("/")
def create_mesa(
    mesa: schemas.MesaBase, 
    db: Session = Depends(deps.get_db),
    current_user: models.Usuario = Depends(deps.check_admin_role)
):
    data = mesa.dict()
    data.pop('estado_nombre', None)
    
    if data.get('estado') is None:
        est_libre = db.query(models.EstadoMesa).filter(models.EstadoMesa.nombre == "Libre").first()
        if est_libre:
            data['estado'] = est_libre.id
            
    db_mesa = models.Mesa(**data)
    db.add(db_mesa)
    db.commit()
    db.refresh(db_mesa)
    logger.info(f"Mesa {db_mesa.numero} creada por {current_user.username}")
    return db_mesa

@router.patch("/{mesa_id}/")
@router.put("/{mesa_id}/")
def update_mesa(
    mesa_id: int, 
    mesa: schemas.MesaUpdate, 
    db: Session = Depends(deps.get_db),
    current_user: models.Usuario = Depends(deps.check_admin_role)
):
    db_mesa = db.query(models.Mesa).filter(models.Mesa.id == mesa_id).first()
    if not db_mesa:
        raise HTTPException(status_code=404, detail="Mesa no encontrada")
    
    for key, value in mesa.dict(exclude_unset=True).items():
        if key == 'estado_nombre': continue
        setattr(db_mesa, key, value)
        
    db.commit()
    db.refresh(db_mesa)
    logger.info(f"Mesa {db_mesa.numero} actualizada por {current_user.username}")
    return db_mesa

@router.delete("/{mesa_id}/")
def delete_mesa(
    mesa_id: int, 
    db: Session = Depends(deps.get_db),
    current_user: models.Usuario = Depends(deps.check_admin_role)
):
    db_mesa = db.query(models.Mesa).filter(models.Mesa.id == mesa_id).first()
    if not db_mesa:
        raise HTTPException(status_code=404, detail="Mesa no encontrada")
    numero = db_mesa.numero
    db.delete(db_mesa)
    db.commit()
    logger.info(f"Mesa {numero} eliminada por {current_user.username}")
    return {"detail": "Mesa eliminada"}

@router.get("/estados/")
def get_estados_mesa(
    db: Session = Depends(deps.get_db),
    current_user: models.Usuario = Depends(deps.get_current_active_user)
):
    return db.query(models.EstadoMesa).all()
