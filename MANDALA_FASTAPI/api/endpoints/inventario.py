from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from db import database, models
from schemas import schemas
from api import deps
from typing import List, Optional
import logging

logger = logging.getLogger("mandala.inventario")
router = APIRouter()

# --- CATEGORIAS ---

@router.get("/categorias/", response_model=List[schemas.Categoria])
def get_categorias(db: Session = Depends(deps.get_db)):
    cats = db.query(models.Categoria).all()
    if not cats:
        for c_nombre in ["Cervezas", "Licores", "Whisky", "Vinos", "Cócteles", "Bebidas"]:
            db.add(models.Categoria(nombre=c_nombre))
        db.commit()
        cats = db.query(models.Categoria).all()
    return cats

@router.post("/categorias/", response_model=schemas.Categoria)
def create_categoria(
    categoria: schemas.CategoriaBase, 
    db: Session = Depends(deps.get_db),
    current_user: models.Usuario = Depends(deps.check_admin_role)
):
    db_cat = models.Categoria(**categoria.dict())
    db.add(db_cat)
    db.commit()
    db.refresh(db_cat)
    logger.info(f"Categoría {db_cat.nombre} creada por {current_user.username}")
    return db_cat

@router.patch("/categorias/{categoria_id}/", response_model=schemas.Categoria)
def update_categoria(
    categoria_id: int, 
    categoria: schemas.CategoriaUpdate, 
    db: Session = Depends(deps.get_db),
    current_user: models.Usuario = Depends(deps.check_admin_role)
):
    db_cat = db.query(models.Categoria).filter(models.Categoria.id == categoria_id).first()
    if not db_cat:
        raise HTTPException(status_code=404, detail="Categoría no encontrada")
    for key, value in categoria.dict(exclude_unset=True).items():
        setattr(db_cat, key, value)
    db.commit()
    db.refresh(db_cat)
    return db_cat

@router.delete("/categorias/{categoria_id}/")
def delete_categoria(
    categoria_id: int, 
    db: Session = Depends(deps.get_db),
    current_user: models.Usuario = Depends(deps.check_admin_role)
):
    db_cat = db.query(models.Categoria).filter(models.Categoria.id == categoria_id).first()
    if not db_cat:
        raise HTTPException(status_code=404, detail="Categoría no encontrada")
    db.delete(db_cat)
    db.commit()
    logger.info(f"Categoría {categoria_id} eliminada por {current_user.username}")
    return {"detail": "Categoría eliminada"}

# --- PRODUCTOS ---

@router.get("/productos/", response_model=List[schemas.Producto])
def get_productos(
    categoria: Optional[int] = None, 
    db: Session = Depends(deps.get_db)
):
    query = db.query(models.Producto).filter(models.Producto.activo == True)
    if categoria:
        query = query.filter(models.Producto.categoria == categoria)

    
    productos_list = query.all()
    for p in productos_list:
        cat = db.query(models.Categoria).filter(models.Categoria.id == p.categoria).first()
        if cat:
            p.categoria_nombre = cat.nombre
            
    return productos_list

@router.post("/productos/", response_model=schemas.Producto)
def create_producto(
    producto: schemas.ProductoBase, 
    db: Session = Depends(deps.get_db),
    current_user: models.Usuario = Depends(deps.check_admin_role)
):
    data = producto.dict()
    data.pop('categoria_nombre', None)
    db_prod = models.Producto(**data)
    db.add(db_prod)
    db.commit()
    db.refresh(db_prod)
    logger.info(f"Producto {db_prod.nombre} creado por {current_user.username}")
    return db_prod

@router.patch("/productos/{producto_id}/", response_model=schemas.Producto)
@router.put("/productos/{producto_id}/", response_model=schemas.Producto)
def update_producto(
    producto_id: int, 
    producto: schemas.ProductoUpdate, 
    db: Session = Depends(deps.get_db),
    current_user: models.Usuario = Depends(deps.check_admin_role)
):
    db_prod = db.query(models.Producto).filter(models.Producto.id == producto_id).first()
    if not db_prod:
        raise HTTPException(status_code=404, detail="Producto no encontrado")
    for key, value in producto.dict(exclude_unset=True).items():
        setattr(db_prod, key, value)
    db.commit()
    db.refresh(db_prod)
    logger.info(f"Producto {producto_id} actualizado por {current_user.username}")
    return db_prod

@router.delete("/productos/{producto_id}/")
def delete_producto(
    producto_id: int, 
    db: Session = Depends(deps.get_db),
    current_user: models.Usuario = Depends(deps.check_admin_role)
):
    from sqlalchemy.exc import IntegrityError
    
    db_prod = db.query(models.Producto).filter(models.Producto.id == producto_id).first()
    if not db_prod:
        raise HTTPException(status_code=404, detail="Producto no encontrado")
    
    nombre = db_prod.nombre
    try:
        # Intentar borrado físico
        db.delete(db_prod)
        db.commit()
        logger.info(f"Producto {nombre} eliminado físicamente por {current_user.username}")
        return {"detail": f"Producto '{nombre}' eliminado permanentemente"}
    except IntegrityError:
        # Si tiene dependencias (pedidos o movimientos históricos), hacemos borrado lógico (desactivar)
        db.rollback()
        db_prod = db.query(models.Producto).filter(models.Producto.id == producto_id).first()
        if db_prod:
            db_prod.activo = False
            db.commit()
        logger.info(f"Producto {nombre} desactivado (borrado lógico) por tener historial de ventas")
        return {"detail": f"Producto '{nombre}' desactivado del inventario"}


# --- MOVIMIENTOS ---

@router.get("/tipos-movimiento/", response_model=List[schemas.TipoMovimiento])
def get_tipos_movimiento(db: Session = Depends(deps.get_db)):
    # Solo "Entrada" y "Salida" para modificación manual de stock
    tipos = db.query(models.TipoMovimiento).filter(models.TipoMovimiento.nombre.in_(["Entrada", "Salida"])).all()
    nombres_existentes = {t.nombre for t in tipos}
    for t_nombre in ["Entrada", "Salida"]:
        if t_nombre not in nombres_existentes:
            nuevo = models.TipoMovimiento(nombre=t_nombre)
            db.add(nuevo)
            db.commit()
    return db.query(models.TipoMovimiento).filter(models.TipoMovimiento.nombre.in_(["Entrada", "Salida"])).all()

@router.get("/movimientos/", response_model=List[schemas.MovimientoInventario])
def get_movimientos(producto_id: Optional[int] = None, db: Session = Depends(deps.get_db)):
    query = db.query(models.MovimientoInventario)
    if producto_id:
        query = query.filter(models.MovimientoInventario.producto_id == producto_id)
    
    movs = query.order_by(models.MovimientoInventario.fecha.desc()).limit(200).all()
    for m in movs:
        m.producto_nombre = db.query(models.Producto.nombre).filter(models.Producto.id == m.producto_id).scalar() or "Producto eliminado"
        m.tipo_nombre = db.query(models.TipoMovimiento.nombre).filter(models.TipoMovimiento.id == m.tipo_id).scalar() or "Movimiento"
        m.usuario_nombre = db.query(models.Usuario.username).filter(models.Usuario.id == m.usuario_id).scalar() or "Admin"
    return movs

@router.post("/movimientos/", response_model=schemas.MovimientoInventario)
def create_movimiento(
    mov: schemas.MovimientoInventarioCreate, 
    db: Session = Depends(deps.get_db),
    current_user: models.Usuario = Depends(deps.check_admin_role)
):
    if mov.cantidad <= 0:
        raise HTTPException(status_code=400, detail="La cantidad debe ser mayor a 0")

    # 1. Verificar producto
    product = db.query(models.Producto).filter(models.Producto.id == mov.producto_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Producto no encontrado")
        
    # 2. Verificar tipo
    tipo = db.query(models.TipoMovimiento).filter(models.TipoMovimiento.id == mov.tipo_id).first()
    if not tipo:
        raise HTTPException(status_code=404, detail="Tipo de movimiento no válido")

    # 3. Crear registro
    db_mov = models.MovimientoInventario(
        producto_id=mov.producto_id,
        tipo_id=mov.tipo_id,
        cantidad=mov.cantidad,
        motivo=mov.motivo,
        usuario_id=current_user.id
    )
    db.add(db_mov)
    
    # 4. Actualizar stock físico (Solo Entrada y Salida)
    if "Entrada" in tipo.nombre:
        product.stock_actual += mov.cantidad
    elif "Salida" in tipo.nombre or "Venta" in tipo.nombre:
        product.stock_actual = max(0, product.stock_actual - mov.cantidad)
    elif "Ajuste" in tipo.nombre:
        product.stock_actual = mov.cantidad 
        
    db.commit()
    db.refresh(db_mov)
    
    db_mov.producto_nombre = product.nombre
    db_mov.tipo_nombre = tipo.nombre
    db_mov.usuario_nombre = current_user.username
    
    logger.info(f"Movimiento de inventario ({tipo.nombre}) para {product.nombre}: {mov.cantidad} uds por {current_user.username}")
    return db_mov
