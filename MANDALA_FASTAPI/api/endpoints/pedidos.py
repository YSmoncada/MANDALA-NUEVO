from fastapi import APIRouter, Depends, HTTPException, status, Body
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import or_
from db import database, models
from schemas import schemas
from api import deps
from api.endpoints.ws import manager as ws_manager
from typing import List, Optional
from decimal import Decimal
import logging

logger = logging.getLogger("mandala.pedidos")
router = APIRouter()

@router.get("/")
def read_pedidos(
    skip: int = 0, 
    limit: int = 100, 
    estado: Optional[str] = None, 
    usuario: Optional[int] = None, 
    mesa: Optional[int] = None, 
    db: Session = Depends(deps.get_db),
    current_user: Optional[models.Usuario] = Depends(deps.get_optional_user)
):
    if not current_user and not mesa:
        raise HTTPException(status_code=401, detail="Debe especificar una mesa o iniciar sesión")
    query = db.query(models.Pedido).options(
        joinedload(models.Pedido.detalles).joinedload(models.PedidoProducto.producto)
    )
    
    if estado:
        query = query.join(models.EstadoPedido, models.Pedido.estado == models.EstadoPedido.id).filter(models.EstadoPedido.nombre.ilike(estado))
    target_waiter = usuario
    if not target_waiter and current_user and not mesa:
        roles = [r.rol.nombre.lower() for r in current_user.roles_asignados] if current_user.roles_asignados else []
        if any("meser" in r for r in roles):
            target_waiter = current_user.id

    if target_waiter:
        query = query.outerjoin(models.Mesa, models.Pedido.mesa == models.Mesa.id).filter(
            or_(models.Pedido.creado_por == target_waiter, models.Mesa.mesero_id == target_waiter)
        )
    if mesa:
        query = query.filter(models.Pedido.mesa == mesa)
        if not usuario:
            turno_actual = db.query(models.Turno).filter(models.Turno.estado == "abierto").first()
            if turno_actual:
                query = query.filter(models.Pedido.turno_id == turno_actual.id)
        
    pedidos_list = query.order_by(models.Pedido.fecha_hora.desc()).offset(skip).limit(limit).all()
    
    for p in pedidos_list:
        est = db.query(models.EstadoPedido).filter(models.EstadoPedido.id == p.estado).first()
        if est: p.estado_nombre = est.nombre
        ms = db.query(models.Mesa).filter(models.Mesa.id == p.mesa).first()
        if ms: 
            p.mesa_numero = ms.numero
            p.pidiendo_cuenta = ms.pidiendo_cuenta
        p.origen_cliente = bool(getattr(p, 'origen_cliente', False))
        
        u = db.query(models.Usuario).filter(models.Usuario.id == p.creado_por).first() if p.creado_por else None
        if u:
            p.usuario_nombre = u.nombre_completo or u.username
        elif ms and ms.rel_mesero:
            p.usuario_nombre = ms.rel_mesero.nombre_completo or ms.rel_mesero.username
        else:
            p.usuario_nombre = "Barra"
        p.mesera_nombre = p.usuario_nombre
        
        for d in p.detalles:
            if d.producto:
                d.producto_nombre = d.producto.nombre
                d.producto_precio = d.producto.precio
        
        p.productos_detalle = p.detalles
        
    return pedidos_list

@router.post("/", status_code=status.HTTP_201_CREATED)
def create_pedido(
    pedido: schemas.PedidoCreate, 
    db: Session = Depends(deps.get_db),
    current_user: Optional[models.Usuario] = Depends(deps.get_optional_user)
):
    try:
        # 1. Obtener estado inicial 'Pendiente'
        est_obj = db.query(models.EstadoPedido).filter(models.EstadoPedido.nombre == "Pendiente").first()
        if not est_obj:
            est_obj = models.EstadoPedido(nombre="Pendiente")
            db.add(est_obj)
            db.commit()
            db.refresh(est_obj)
        
        # --- VALIDACIÓN DE TURNO ---
        turno_actual = db.query(models.Turno).filter(models.Turno.estado == "abierto").first()
        if not turno_actual:
            raise HTTPException(status_code=400, detail="VENTAS BLOQUEADAS: No hay un turno abierto en caja.")

        # 2. Verificar y actualizar estado de la mesa
        mesa_obj = db.query(models.Mesa).filter(models.Mesa.id == pedido.mesa).first()
        if not mesa_obj:
            raise HTTPException(status_code=404, detail="Mesa no encontrada")
        
        # Obtener el estado 'Ocupada'
        estado_ocupada = db.query(models.EstadoMesa).filter(models.EstadoMesa.nombre == "Ocupada").first()
        if not estado_ocupada:
            # Si no existe el estado Ocupada, lo creamos
            estado_ocupada = models.EstadoMesa(nombre="Ocupada")
            db.add(estado_ocupada)
            db.commit()
            db.refresh(estado_ocupada)

        if mesa_obj.estado == estado_ocupada.id and not pedido.force_append:
            raise HTTPException(status_code=400, detail="Esta mesa ya se encuentra ocupada")

        # Marcar mesa como ocupada
        mesa_obj.estado = estado_ocupada.id
        db.commit()

        # 3. Extraer data y mapear usuario
        data = pedido.dict(exclude={'productos', 'detalles', 'estado_nombre', 'mesa_numero', 'usuario', 'force_append', 'pidiendo_cuenta'})
        # Si viene un usuario autenticado (mesera/personal), registramos quién tomó el pedido,
        # pero NO se le auto-asigna la mesa (la asignación está reservada para el cliente vía QR).
        if current_user:
            data['creado_por'] = current_user.id
            data['origen_cliente'] = False
        elif pedido.usuario:
            data['creado_por'] = pedido.usuario
            data['origen_cliente'] = False
        elif pedido.creado_por:
            data['creado_por'] = pedido.creado_por
            data['origen_cliente'] = False
        else:
            # Pedido realizado directamente por el cliente desde el QR
            data['origen_cliente'] = True
            if mesa_obj and mesa_obj.mesero_id:
                data['creado_por'] = mesa_obj.mesero_id
            else:
                from api.endpoints.mesas import assign_waiter
                assigned = assign_waiter(db, mesa_obj)
                if assigned:
                    data['creado_por'] = assigned.id
                else:
                    admin = db.query(models.Usuario).first()
                    data['creado_por'] = admin.id if admin else None
        data['estado'] = est_obj.id
        data['turno_id'] = turno_actual.id
        
        db_pedido = models.Pedido(**data)
        db.add(db_pedido)
        db.commit()
        db.refresh(db_pedido)

        items = pedido.productos if pedido.productos else pedido.detalles
        total_acumulado = Decimal(0)

        if items:
            for item in items:
                if not item.producto_id: continue
                
                # Obtener precio del producto desde la DB para seguridad
                prod_obj = db.query(models.Producto).filter(models.Producto.id == item.producto_id).first()
                if not prod_obj: continue
                
                precio = prod_obj.precio
                total_acumulado += precio * item.cantidad

                db_detalle = models.PedidoProducto(
                    pedido_id=db_pedido.id,
                    producto_id=item.producto_id,
                    cantidad=item.cantidad,
                    precio_unitario=precio
                )
                db.add(db_detalle)
            
            # Actualizar el total del pedido
            db_pedido.total = total_acumulado
            db.commit()
            db.refresh(db_pedido)

        # Poblar extras para respuesta inmediata
        ms = db.query(models.Mesa).filter(models.Mesa.id == db_pedido.mesa).first()
        db_pedido.estado_nombre = est_obj.nombre
        db_pedido.mesa_numero = ms.numero if ms else 0
        u = db.query(models.Usuario).filter(models.Usuario.id == db_pedido.creado_por).first() if db_pedido.creado_por else None
        if u:
            db_pedido.usuario_nombre = u.nombre_completo or u.username
        elif ms and ms.rel_mesero:
            db_pedido.usuario_nombre = ms.rel_mesero.nombre_completo or ms.rel_mesero.username
        else:
            db_pedido.usuario_nombre = "Barra"
        db_pedido.mesera_nombre = db_pedido.usuario_nombre
        
        for d in db_pedido.detalles:
            if d.producto:
                d.producto_nombre = d.producto.nombre
                d.producto_precio = d.producto.precio
        db_pedido.productos_detalle = db_pedido.detalles
        
        creador = current_user.username if current_user else "Cliente QR"
        logger.info(f"Pedido {db_pedido.id} creado por {creador}")
        return db_pedido
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error creando pedido: {str(e)}")
        raise HTTPException(status_code=500, detail="Error interno al crear pedido")

@router.get("/{pedido_id}/")
def get_pedido(
    pedido_id: int, 
    db: Session = Depends(deps.get_db),
    current_user: Optional[models.Usuario] = Depends(deps.get_optional_user)
):
    pedido = db.query(models.Pedido).options(
        joinedload(models.Pedido.detalles).joinedload(models.PedidoProducto.producto)
    ).filter(models.Pedido.id == pedido_id).first()
    
    if not pedido:
        raise HTTPException(status_code=404, detail="Pedido no encontrado")
        
    est = db.query(models.EstadoPedido).filter(models.EstadoPedido.id == pedido.estado).first()
    if est: pedido.estado_nombre = est.nombre
    ms = db.query(models.Mesa).filter(models.Mesa.id == pedido.mesa).first()
    if ms: pedido.mesa_numero = ms.numero
    pedido.usuario_nombre = db.query(models.Usuario.username).filter(models.Usuario.id == pedido.creado_por).scalar() or "Anónimo"
    pedido.mesera_nombre = pedido.usuario_nombre
    
    for d in pedido.detalles:
        if d.producto:
            d.producto_nombre = d.producto.nombre
            d.producto_precio = d.producto.precio
    
    pedido.productos_detalle = pedido.detalles
    return pedido

@router.patch("/{pedido_id}/")
@router.put("/{pedido_id}/")
def update_pedido(
    pedido_id: int, 
    pedido: schemas.PedidoUpdate, 
    db: Session = Depends(deps.get_db),
    current_user: models.Usuario = Depends(deps.get_current_active_user)
):
    db_pedido = db.query(models.Pedido).filter(models.Pedido.id == pedido_id).first()
    if not db_pedido:
        raise HTTPException(status_code=404, detail="Pedido no encontrado")

    logger.debug(f"Pedido {pedido_id}: actualización recibida por {current_user.username}")
    update_data = pedido.dict(exclude_unset=True)
    
    # Manejar cambio de estado y liberación de mesa
    nuevo_estado_id = None
    if 'estado_name' in update_data or 'estado_nombre' in update_data:
        nombre_est = update_data.pop('estado_nombre', update_data.pop('estado_name', None))
        if nombre_est:
            nombre_est = nombre_est.strip()
            est_obj = db.query(models.EstadoPedido).filter(models.EstadoPedido.nombre.ilike(nombre_est)).first()
            if not est_obj:
                # CREACIÓN AUTOMÁTICA si no existe
                est_obj = models.EstadoPedido(nombre=nombre_est)
                db.add(est_obj)
                db.commit()
                db.refresh(est_obj)
            
            nuevo_estado_id = est_obj.id
            db_pedido.estado = est_obj.id

    # Si mandan el ID directamente
    if 'estado' in update_data:
        val = update_data.get('estado')
        if isinstance(val, str):
            val = val.strip()
            est_obj = db.query(models.EstadoPedido).filter(models.EstadoPedido.nombre.ilike(val)).first()
            if not est_obj:
                est_obj = models.EstadoPedido(nombre=val)
                db.add(est_obj)
                db.commit()
                db.refresh(est_obj)
            nuevo_estado_id = est_obj.id
            db_pedido.estado = est_obj.id
        else:
            nuevo_estado_id = val
            db_pedido.estado = val

    # Lógica para LIBERAR MESA automáticamente
    if nuevo_estado_id:
        est_final = db.query(models.EstadoPedido).filter(models.EstadoPedido.id == nuevo_estado_id).first()
        if est_final:
            nombre_lower = est_final.nombre.lower()
            if nombre_lower in ["pagado", "cancelado"]:
                mesa_obj = db.query(models.Mesa).filter(models.Mesa.id == db_pedido.mesa).first()
                if mesa_obj:
                    est_libre = db.query(models.EstadoMesa).filter(models.EstadoMesa.nombre == "Libre").first()
                    if est_libre:
                        mesa_obj.estado = est_libre.id
                        mesa_obj.mesero_id = None
                        mesa_obj.pidiendo_cuenta = False
            
            # SI SE DESPACHA EL PEDIDO COMPLETO, MARCAR TODOS LOS PRODUCTOS COMO ENTREGADOS Y DESCONTAR STOCK
            if nombre_lower == "despachado" or nombre_lower == "aceptado":
                logger.info(f"Pedido {pedido_id}: cambio a {nombre_lower.upper()} — descontando stock")
                
                # Obtener el ID del tipo de movimiento "Venta" o "Salida"
                tipo_venta = db.query(models.TipoMovimiento).filter(models.TipoMovimiento.nombre.ilike("Venta")).first()
                if not tipo_venta:
                    tipo_venta = db.query(models.TipoMovimiento).filter(models.TipoMovimiento.nombre.ilike("Salida")).first()
                if not tipo_venta:
                    tipo_venta = models.TipoMovimiento(nombre="Venta")
                    db.add(tipo_venta)
                    db.commit()
                    db.refresh(tipo_venta)
                tipo_venta_id = tipo_venta.id if tipo_venta else None

                for det in db_pedido.detalles:
                    # Solo descontar lo que no se ha despachado todavía para evitar descuentos duplicados
                    pendiente = det.cantidad - det.cantidad_despachada
                    if pendiente > 0:
                        prod = db.query(models.Producto).filter(models.Producto.id == det.producto_id).first()
                        if prod:
                            prod.stock_actual -= pendiente
                            
                            # Registrar el movimiento en el historial de inventario
                            if tipo_venta_id:
                                nuevo_mov = models.MovimientoInventario(
                                    producto_id=prod.id,
                                    tipo_id=tipo_venta_id,
                                    cantidad=pendiente,
                                    motivo=f"Venta Pedido #{pedido_id}",
                                    usuario_id=current_user.id
                                )
                                db.add(nuevo_mov)
                    
                    det.cantidad_despachada = det.cantidad
                    db.add(det)


    for key, value in update_data.items():
        if key not in ['estado', 'estado_nombre', 'pidiendo_cuenta']:
            setattr(db_pedido, key, value)
            
    db.commit()
    db.refresh(db_pedido)
    logger.info(f"Pedido {pedido_id} actualizado por {current_user.username}")

    # Notificar en tiempo real a bartender y mesera
    estado_actual = db.query(models.EstadoPedido).filter(models.EstadoPedido.id == db_pedido.estado).first()
    ms = db.query(models.Mesa).filter(models.Mesa.id == db_pedido.mesa).first()
    ws_event = {
        "type": "pedido_actualizado",
        "pedido_id": db_pedido.id,
        "estado": estado_actual.nombre if estado_actual else None,
        "mesa_numero": ms.numero if ms else None,
        "actualizado_por": current_user.username,
    }
    import asyncio
    try:
        loop = asyncio.get_event_loop()
        if loop.is_running():
            asyncio.ensure_future(ws_manager.broadcast_all(ws_event))
    except Exception as ws_err:
        logger.warning(f"WS broadcast fallido (no crítico): {ws_err}")

    if estado_actual:
        db_pedido.estado_nombre = estado_actual.nombre

    return db_pedido

@router.delete("/{pedido_id}")
def delete_pedido(
    pedido_id: int, 
    db: Session = Depends(deps.get_db),
    current_user: models.Usuario = Depends(deps.check_admin_role)
):
    db_pedido = db.query(models.Pedido).filter(models.Pedido.id == pedido_id).first()
    if not db_pedido:
        raise HTTPException(status_code=404, detail="Pedido no encontrado")
    db.delete(db_pedido)
    db.commit()
    logger.info(f"Pedido {pedido_id} eliminado por {current_user.username}")
    return {"detail": "Pedido eliminado"}

@router.post("/{pedido_id}/despachar_producto/")
def despachar_producto(
    pedido_id: int, 
    item_id: int = Body(..., embed=True), 
    db: Session = Depends(deps.get_db),
    current_user: models.Usuario = Depends(deps.get_current_active_user)
):
    item = db.query(models.PedidoProducto).filter(
        models.PedidoProducto.id == item_id, 
        models.PedidoProducto.pedido_id == pedido_id
    ).first()
    
    if not item:
        raise HTTPException(status_code=404, detail="Producto del pedido no encontrado")
    
    pendiente = item.cantidad - item.cantidad_despachada
    if pendiente > 0:
        prod = db.query(models.Producto).filter(models.Producto.id == item.producto_id).first()
        if prod:
            prod.stock_actual -= pendiente
            
            # Registrar Kardex de salida por venta
            tipo_salida = db.query(models.TipoMovimiento).filter(models.TipoMovimiento.nombre.ilike("Venta")).first()
            if not tipo_salida:
                tipo_salida = db.query(models.TipoMovimiento).filter(models.TipoMovimiento.nombre.ilike("Salida")).first()
            if tipo_salida:
                nuevo_mov = models.MovimientoInventario(
                    producto_id=prod.id,
                    tipo_id=tipo_salida.id,
                    cantidad=pendiente,
                    motivo=f"Venta Pedido #{pedido_id}",
                    usuario_id=current_user.id
                )
                db.add(nuevo_mov)
        
        item.cantidad_despachada = item.cantidad
        db.commit()
        logger.info(f"Producto {item.producto_id} del pedido {pedido_id} despachado por {current_user.username}")

        # Notificar a mesera que un producto fue despachado
        ws_event = {
            "type": "producto_despachado",
            "pedido_id": pedido_id,
            "item_id": item_id,
            "producto_id": item.producto_id,
            "despachado_por": current_user.username,
        }
        import asyncio
        try:
            loop = asyncio.get_event_loop()
            if loop.is_running():
                asyncio.ensure_future(ws_manager.broadcast("mesera", ws_event))
        except Exception as ws_err:
            logger.warning(f"WS broadcast fallido (no crítico): {ws_err}")

    logger.info(f"Producto {item_id} del pedido {pedido_id} procesado por {current_user.username}")
    return {"detail": "OK"}
