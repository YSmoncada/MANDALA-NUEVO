from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from db.database import get_db
from db import models
from schemas import schemas
from api.deps import get_db, get_current_active_user, check_admin_role
from datetime import datetime
from decimal import Decimal
from sqlalchemy.sql import func

router = APIRouter()

@router.get("/turno/actual/")
def get_turno_actual(db: Session = Depends(get_db)):
    turno = db.query(models.Turno).filter(models.Turno.estado == "abierto").first()
    if not turno:
        return None
    
    # Excluir pedidos cancelados usando el catálogo o ID normalizado
    est_cancelado = db.query(models.EstadoPedido).filter(models.EstadoPedido.nombre.ilike("%cancelad%")).first()
    cancelado_id = est_cancelado.id if est_cancelado else 5

    # 1. Total ventas de pedidos activos del turno
    total_ventas = db.query(func.sum(models.Pedido.total)).filter(
        models.Pedido.turno_id == turno.id,
        models.Pedido.estado_id != cancelado_id
    ).scalar() or Decimal(0)
    
    # 2. Desglose por método de pago a través de la tabla 'pagos'
    pagos_turno = db.query(
        models.Pago.metodo_pago,
        func.sum(models.Pago.monto).label("monto"),
        func.sum(models.Pago.propina).label("propina")
    ).join(models.Pedido, models.Pago.pedido_id == models.Pedido.id)\
     .filter(models.Pedido.turno_id == turno.id)\
     .group_by(models.Pago.metodo_pago).all()

    ventas_efectivo = Decimal(0)
    ventas_tarjeta = Decimal(0)
    ventas_transferencia = Decimal(0)
    total_propinas = Decimal(0)

    for p in pagos_turno:
        metodo = (p.metodo_pago or "").lower()
        monto = Decimal(p.monto or 0)
        total_propinas += Decimal(p.propina or 0)

        if "efectivo" in metodo:
            ventas_efectivo += monto
        elif "tarjeta" in metodo or "datafono" in metodo or "debito" in metodo or "credito" in metodo:
            ventas_tarjeta += monto
        else:
            ventas_transferencia += monto

    # Si aún no hay pagos desglosados pero hay ventas totales, asumir efectivo por defecto
    if not pagos_turno and total_ventas > 0:
        ventas_efectivo = total_ventas

    # 3. Entradas y Salidas de caja menor durante el turno
    movimientos = db.query(
        models.MovimientoCaja.tipo,
        func.sum(models.MovimientoCaja.monto).label("monto")
    ).filter(models.MovimientoCaja.turno_id == turno.id)\
     .group_by(models.MovimientoCaja.tipo).all()

    entradas_caja = Decimal(0)
    salidas_caja = Decimal(0)

    for m in movimientos:
        if m.tipo == "entrada":
            entradas_caja += Decimal(m.monto or 0)
        elif m.tipo == "salida":
            salidas_caja += Decimal(m.monto or 0)

    # 4. Efectivo esperado en cajón
    efectivo_esperado = Decimal(turno.base_inicial or 0) + ventas_efectivo + entradas_caja - salidas_caja

    turno.total_ventas = total_ventas
    turno.total_efectivo = ventas_efectivo
    turno.total_tarjeta = ventas_tarjeta
    turno.total_transferencia = ventas_transferencia
    turno.total_propinas = total_propinas

    return {
        "id": turno.id,
        "abierto_por": turno.abierto_por,
        "usuario_apertura_nombre": turno.usuario_apertura_nombre,
        "fecha_apertura": turno.fecha_apertura,
        "base_inicial": float(turno.base_inicial or 0),
        "total_ventas": float(total_ventas),
        "ventas_efectivo": float(ventas_efectivo),
        "ventas_tarjeta": float(ventas_tarjeta),
        "ventas_transferencia": float(ventas_transferencia),
        "total_propinas": float(total_propinas),
        "entradas_caja": float(entradas_caja),
        "salidas_caja": float(salidas_caja),
        "efectivo_esperado": float(efectivo_esperado),
        "estado": turno.estado,
        "observaciones": turno.observaciones
    }

@router.post("/turno/abrir/")
def abrir_turno(
    turno_in: schemas.TurnoCreate, 
    db: Session = Depends(get_db),
    current_user: models.Usuario = Depends(get_current_active_user)
):
    existe = db.query(models.Turno).filter(models.Turno.estado == "abierto").first()
    if existe:
        raise HTTPException(status_code=400, detail="Ya hay un turno abierto")
    
    db_turno = models.Turno(
        abierto_por=current_user.id,
        base_inicial=turno_in.base_inicial,
        observaciones=turno_in.observaciones,
        estado="abierto"
    )
    db.add(db_turno)
    db.commit()
    db.refresh(db_turno)

    # Auditoría
    audit = models.AuditoriaEvento(
        usuario_id=current_user.id,
        accion="APERTURA_TURNO",
        tabla_afectada="turnos",
        registro_id=db_turno.id,
        valor_nuevo=f"Base Inicial: {turno_in.base_inicial}",
        motivo=turno_in.observaciones
    )
    db.add(audit)
    db.commit()

    return db_turno

@router.post("/turno/movimiento-caja/", response_model=schemas.MovimientoCaja)
def registrar_movimiento_caja(
    mov_in: schemas.MovimientoCajaCreate,
    db: Session = Depends(get_db),
    current_user: models.Usuario = Depends(get_current_active_user)
):
    """Registra una entrada (ingreso) o salida (gasto menor) de efectivo del turno actual."""
    turno = db.query(models.Turno).filter(models.Turno.estado == "abierto").first()
    if not turno:
        raise HTTPException(status_code=400, detail="No hay un turno de caja abierto para registrar movimientos")
    
    tipo_clean = mov_in.tipo.lower()
    if tipo_clean not in ["entrada", "salida"]:
        raise HTTPException(status_code=400, detail="El tipo debe ser 'entrada' o 'salida'")

    nuevo_mov = models.MovimientoCaja(
        turno_id=turno.id,
        tipo=tipo_clean,
        concepto=mov_in.concepto,
        monto=mov_in.monto,
        autorizado_por=current_user.id
    )
    db.add(nuevo_mov)
    db.commit()
    db.refresh(nuevo_mov)

    # Auditoría
    audit = models.AuditoriaEvento(
        usuario_id=current_user.id,
        accion="MOVIMIENTO_CAJA_CHICA",
        tabla_afectada="movimientos_caja",
        registro_id=nuevo_mov.id,
        valor_nuevo=f"{tipo_clean.upper()} ${mov_in.monto}: {mov_in.concepto}"
    )
    db.add(audit)
    db.commit()

    return nuevo_mov

@router.get("/turno/movimientos/", response_model=List[schemas.MovimientoCaja])
def get_movimientos_caja_turno(
    turno_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: models.Usuario = Depends(get_current_active_user)
):
    """Devuelve la lista de entradas y salidas de efectivo del turno."""
    if not turno_id:
        turno = db.query(models.Turno).filter(models.Turno.estado == "abierto").first()
        if not turno:
            return []
        turno_id = turno.id
    
    return db.query(models.MovimientoCaja).filter(
        models.MovimientoCaja.turno_id == turno_id
    ).order_by(models.MovimientoCaja.fecha_hora.desc()).all()

@router.post("/turno/cerrar/")
def cerrar_turno(
    cierre: schemas.TurnoCierre,
    db: Session = Depends(get_db),
    current_user: models.Usuario = Depends(get_current_active_user)
):
    turno = db.query(models.Turno).filter(models.Turno.estado == "abierto").first()
    if not turno:
        raise HTTPException(status_code=404, detail="No hay un turno abierto para cerrar")
    
    est_cancelado = db.query(models.EstadoPedido).filter(models.EstadoPedido.nombre.ilike("%cancelad%")).first()
    cancelado_id = est_cancelado.id if est_cancelado else 5

    total_ventas = db.query(func.sum(models.Pedido.total)).filter(
        models.Pedido.turno_id == turno.id,
        models.Pedido.estado_id != cancelado_id
    ).scalar() or Decimal(0)

    # Calcular desglose
    pagos_turno = db.query(
        models.Pago.metodo_pago,
        func.sum(models.Pago.monto).label("monto"),
        func.sum(models.Pago.propina).label("propina")
    ).join(models.Pedido, models.Pago.pedido_id == models.Pedido.id)\
     .filter(models.Pedido.turno_id == turno.id)\
     .group_by(models.Pago.metodo_pago).all()

    ventas_efectivo = Decimal(0)
    ventas_tarjeta = Decimal(0)
    ventas_transferencia = Decimal(0)
    total_propinas = Decimal(0)

    for p in pagos_turno:
        met = (p.metodo_pago or "").lower()
        mon = Decimal(p.monto or 0)
        total_propinas += Decimal(p.propina or 0)
        if "efectivo" in met:
            ventas_efectivo += mon
        elif "tarjeta" in met or "datafono" in met:
            ventas_tarjeta += mon
        else:
            ventas_transferencia += mon

    if not pagos_turno and total_ventas > 0:
        ventas_efectivo = total_ventas

    # Movimientos de caja menor
    movimientos = db.query(
        models.MovimientoCaja.tipo,
        func.sum(models.MovimientoCaja.monto).label("monto")
    ).filter(models.MovimientoCaja.turno_id == turno.id)\
     .group_by(models.MovimientoCaja.tipo).all()

    entradas_caja = Decimal(0)
    salidas_caja = Decimal(0)

    for m in movimientos:
        if m.tipo == "entrada":
            entradas_caja += Decimal(m.monto or 0)
        elif m.tipo == "salida":
            salidas_caja += Decimal(m.monto or 0)

    efectivo_esperado = Decimal(turno.base_inicial or 0) + ventas_efectivo + entradas_caja - salidas_caja
    diferencia = Decimal(cierre.efectivo_real or 0) - efectivo_esperado

    turno.cerrado_por = current_user.id
    turno.fecha_cierre = datetime.now()
    turno.total_ventas = total_ventas
    turno.total_efectivo = ventas_efectivo
    turno.total_tarjeta = ventas_tarjeta
    turno.total_transferencia = ventas_transferencia
    turno.total_propinas = total_propinas
    turno.efectivo_real = cierre.efectivo_real
    turno.diferencia = diferencia
    
    estado_diferencia = "CUADRE EXACTO"
    if diferencia > 0:
        estado_diferencia = f"SOBRANTE: +${diferencia}"
    elif diferencia < 0:
        estado_diferencia = f"FALTANTE: -${abs(diferencia)}"

    turno.observaciones = f"{turno.observaciones or ''}\n--- ARQUEO DE CIERRE ---\nEsperado: ${efectivo_esperado} | Contado: ${cierre.efectivo_real} ({estado_diferencia})\nNotas: {cierre.observaciones or 'Sin notas'}"
    turno.estado = "cerrado"
    
    db.commit()
    db.refresh(turno)

    # Auditoría de cierre
    audit = models.AuditoriaEvento(
        usuario_id=current_user.id,
        accion="CIERRE_TURNO",
        tabla_afectada="turnos",
        registro_id=turno.id,
        valor_anterior=f"Esperado: {efectivo_esperado}",
        valor_nuevo=f"Real: {cierre.efectivo_real} ({estado_diferencia})",
        motivo=cierre.observaciones
    )
    db.add(audit)
    db.commit()

    return turno

@router.get("/turnos/historial/")
def get_historial_turnos(
    skip: int = 0, 
    limit: int = 50, 
    db: Session = Depends(get_db),
    current_user: models.Usuario = Depends(check_admin_role)
):
    turnos = db.query(models.Turno).order_by(models.Turno.fecha_apertura.desc()).offset(skip).limit(limit).all()
    return turnos
