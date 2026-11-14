from pydantic import BaseModel, model_validator
from typing import List, Optional, Union
from datetime import datetime
from decimal import Decimal

# Esquemas base
class UserBase(BaseModel):
    username: str
    email: Optional[str] = None
    nombre_completo: Optional[str] = None
    activo: bool = True

class UserCreate(UserBase):
    password: str
    role: Optional[str] = "usuario"
    remember_me: Optional[bool] = False

class UserUpdate(BaseModel):
    nombre_completo: Optional[str] = None
    email: Optional[str] = None
    password: Optional[str] = None
    activo: Optional[bool] = None

class User(UserBase):
    id: int
    created_at: Optional[datetime] = None
    user_role: Optional[str] = "usuario"
    class Config:
        from_attributes = True

# Esquemas de token
class Token(BaseModel):
    token: str
    refresh: str
    role: str
    username: str
    nombre: str
    user_id: int
    detail: str

class TokenData(BaseModel):
    username: Optional[str] = None

class TokenRefreshResponse(BaseModel):
    token: str

# Esquemas de rol
class RolBase(BaseModel):
    nombre: str

class RolCreate(RolBase):
    pass

class Rol(RolBase):
    id: int
    class Config:
        from_attributes = True

# Esquemas de categoría
class CategoriaBase(BaseModel):
    nombre: str
    descripcion: Optional[str] = None

class CategoriaUpdate(BaseModel):
    nombre: Optional[str] = None
    descripcion: Optional[str] = None

class Categoria(CategoriaBase):
    id: int
    class Config:
        from_attributes = True

# Esquemas de producto
class ProductoBase(BaseModel):
    nombre: str
    precio: Decimal
    stock_actual: int = 0
    activo: bool = True
    categoria_id: Optional[int] = None
    categoria: Optional[int] = None
    imagen: Optional[str] = None
    categoria_nombre: Optional[str] = None

    @model_validator(mode="before")
    @classmethod
    def sync_categoria(cls, data):
        if isinstance(data, dict):
            if "categoria" in data and ("categoria_id" not in data or data.get("categoria_id") is None):
                data["categoria_id"] = data["categoria"]
            elif "categoria_id" in data and ("categoria" not in data or data.get("categoria") is None):
                data["categoria"] = data["categoria_id"]
        return data

class ProductoUpdate(BaseModel):
    nombre: Optional[str] = None
    precio: Optional[Decimal] = None
    stock_actual: Optional[int] = None
    activo: Optional[bool] = None
    categoria_id: Optional[int] = None
    categoria: Optional[int] = None
    imagen: Optional[str] = None

    @model_validator(mode="before")
    @classmethod
    def sync_categoria(cls, data):
        if isinstance(data, dict):
            if "categoria" in data and ("categoria_id" not in data or data.get("categoria_id") is None):
                data["categoria_id"] = data["categoria"]
            elif "categoria_id" in data and ("categoria" not in data or data.get("categoria") is None):
                data["categoria"] = data["categoria_id"]
        return data

class Producto(ProductoBase):
    id: int
    class Config:
        from_attributes = True

# Esquemas de pedido
class PedidoProductoBase(BaseModel):
    producto_id: Optional[int] = None
    cantidad: int
    precio_unitario: Optional[Decimal] = None

class PedidoProductoCreate(PedidoProductoBase):
    pass

class PedidoProducto(PedidoProductoBase):
    id: int
    cantidad_despachada: int
    producto_nombre: Optional[str] = None
    producto_precio: Optional[Decimal] = None
    class Config:
        from_attributes = True

class PedidoBase(BaseModel):
    mesa_id: Optional[int] = None
    mesa: Optional[int] = None
    estado_id: Optional[Union[int, str]] = None
    estado: Optional[Union[int, str]] = None
    total: Decimal = Decimal(0)
    estado_nombre: Optional[str] = None
    mesa_numero: Optional[int] = None
    creado_por: Optional[int] = None
    pidiendo_cuenta: Optional[bool] = False
    origen_cliente: Optional[bool] = False

    @model_validator(mode="before")
    @classmethod
    def sync_pedido_fields(cls, data):
        if isinstance(data, dict):
            if "mesa" in data and ("mesa_id" not in data or data.get("mesa_id") is None):
                data["mesa_id"] = data["mesa"]
            elif "mesa_id" in data and ("mesa" not in data or data.get("mesa") is None):
                data["mesa"] = data["mesa_id"]
            if "estado" in data and ("estado_id" not in data or data.get("estado_id") is None):
                data["estado_id"] = data["estado"]
            elif "estado_id" in data and ("estado" not in data or data.get("estado") is None):
                data["estado"] = data["estado_id"]
        return data

class PedidoCreate(PedidoBase):
    productos: Optional[List[PedidoProductoCreate]] = None
    detalles: Optional[List[PedidoProductoCreate]] = None
    usuario: Optional[int] = None # Alias para creado_por enviado por el móvil
    force_append: Optional[bool] = False

class Pedido(PedidoBase):
    id: int
    fecha_hora: datetime
    creado_por: Optional[int] = None
    usuario_nombre: Optional[str] = None
    mesera_nombre: Optional[str] = None
    detalles: List[PedidoProducto]
    productos_detalle: Optional[List[PedidoProducto]] = None # Alias para el móvil
    class Config:
        from_attributes = True

class PedidoSimplified(PedidoBase):
    pass

class PedidoUpdate(BaseModel):
    mesa_id: Optional[int] = None
    mesa: Optional[int] = None
    estado_id: Optional[Union[int, str]] = None
    estado: Optional[Union[int, str]] = None
    estado_nombre: Optional[str] = None
    total: Optional[Decimal] = None

    @model_validator(mode="before")
    @classmethod
    def sync_pedido_fields(cls, data):
        if isinstance(data, dict):
            if "mesa" in data and ("mesa_id" not in data or data.get("mesa_id") is None):
                data["mesa_id"] = data["mesa"]
            elif "mesa_id" in data and ("mesa" not in data or data.get("mesa") is None):
                data["mesa"] = data["mesa_id"]
            if "estado" in data and ("estado_id" not in data or data.get("estado_id") is None):
                data["estado_id"] = data["estado"]
            elif "estado_id" in data and ("estado" not in data or data.get("estado") is None):
                data["estado"] = data["estado_id"]
        return data

# Esquemas de mesa
class MesaBase(BaseModel):
    numero: int
    capacidad: Optional[int] = 1
    estado_id: Optional[int] = None
    estado: Optional[int] = None
    estado_nombre: Optional[str] = None
    mesero_id: Optional[int] = None
    mesero_nombre: Optional[str] = None
    pidiendo_cuenta: Optional[bool] = False

    @model_validator(mode="before")
    @classmethod
    def sync_estado(cls, data):
        if isinstance(data, dict):
            if "estado" in data and ("estado_id" not in data or data.get("estado_id") is None):
                data["estado_id"] = data["estado"]
            elif "estado_id" in data and ("estado" not in data or data.get("estado") is None):
                data["estado"] = data["estado_id"]
        return data

class MesaUpdate(BaseModel):
    numero: Optional[int] = None
    capacidad: Optional[int] = None
    estado_id: Optional[int] = None
    estado: Optional[int] = None
    mesero_id: Optional[int] = None
    pidiendo_cuenta: Optional[bool] = None

    @model_validator(mode="before")
    @classmethod
    def sync_estado(cls, data):
        if isinstance(data, dict):
            if "estado" in data and ("estado_id" not in data or data.get("estado_id") is None):
                data["estado_id"] = data["estado"]
            elif "estado_id" in data and ("estado" not in data or data.get("estado") is None):
                data["estado"] = data["estado_id"]
        return data

class Mesa(MesaBase):
    id: int
    class Config:
        from_attributes = True

# Esquemas de estado
class EstadoBase(BaseModel):
    nombre: str

class Estado(EstadoBase):
    id: int
    class Config:
        from_attributes = True

# Esquemas de configuración
class EmpresaConfigUpdate(BaseModel):
    nombre: Optional[str] = None
    nit: Optional[str] = None
    direccion: Optional[str] = None
    telefono: Optional[str] = None
    mensaje_footer: Optional[str] = None
    moneda: Optional[str] = None
    impuesto_porcentaje: Optional[Decimal] = None

class EmpresaConfigBase(BaseModel):
    nombre: str
    nit: Optional[str] = None
    direccion: Optional[str] = None
    telefono: Optional[str] = None
    mensaje_footer: str = "¡Gracias por su visita!"
    moneda: str = "$"
    impuesto_porcentaje: Decimal = Decimal(0)

class EmpresaConfig(EmpresaConfigBase):
    id: int
    class Config:
        from_attributes = True

# Esquemas de movimiento de inventario
class TipoMovimientoBase(BaseModel):
    nombre: str

class TipoMovimiento(TipoMovimientoBase):
    id: int
    class Config:
        from_attributes = True

class MovimientoInventarioBase(BaseModel):
    producto_id: int
    tipo_id: int
    cantidad: int
    motivo: Optional[str] = None

class MovimientoInventarioCreate(MovimientoInventarioBase):
    pass

class MovimientoInventario(MovimientoInventarioBase):
    id: int
    fecha: datetime
    usuario_id: Optional[int] = None
    producto_nombre: Optional[str] = None
    tipo_nombre: Optional[str] = None
    usuario_nombre: Optional[str] = None
    class Config:
        from_attributes = True

# Esquemas de turno
class TurnoBase(BaseModel):
    base_inicial: Decimal = Decimal(0)
    observaciones: Optional[str] = None

class TurnoCreate(TurnoBase):
    abierto_por: Optional[int] = None

class TurnoCierre(BaseModel):
    efectivo_real: Decimal
    observaciones: Optional[str] = None

class Turno(TurnoBase):
    id: int
    abierto_por: int
    cerrado_por: Optional[int] = None
    fecha_apertura: Optional[datetime] = None
    fecha_cierre: Optional[datetime] = None
    total_ventas: Optional[Decimal] = Decimal(0)
    efectivo_real: Optional[Decimal] = None
    total_efectivo: Optional[Decimal] = Decimal(0)
    total_tarjeta: Optional[Decimal] = Decimal(0)
    total_transferencia: Optional[Decimal] = Decimal(0)
    total_propinas: Optional[Decimal] = Decimal(0)
    diferencia: Optional[Decimal] = Decimal(0)
    estado: str
    usuario_apertura_nombre: Optional[str] = None
    usuario_cierre_nombre: Optional[str] = None
    class Config:
        from_attributes = True

# ==============================================================================
# ESQUEMAS AVANZADOS: PAGOS, AUDITORÍA, INSUMOS & CAJA
# ==============================================================================

class PagoBase(BaseModel):
    pedido_id: int
    metodo_pago: str # Efectivo, Tarjeta, Nequi, Daviplata, Transferencia
    monto: Decimal
    propina: Optional[Decimal] = Decimal(0)
    referencia: Optional[str] = None

class PagoCreate(PagoBase):
    pass

class Pago(PagoBase):
    id: int
    creado_por: Optional[int] = None
    fecha_hora: datetime
    class Config:
        from_attributes = True

class AuditoriaEventoCreate(BaseModel):
    accion: str
    tabla_afectada: str
    registro_id: Optional[int] = None
    valor_anterior: Optional[str] = None
    valor_nuevo: Optional[str] = None
    motivo: Optional[str] = None

class AuditoriaEvento(AuditoriaEventoCreate):
    id: int
    usuario_id: Optional[int] = None
    ip_address: Optional[str] = None
    fecha_hora: datetime
    class Config:
        from_attributes = True

class InsumoBase(BaseModel):
    nombre: str
    unidad_medida: str
    stock_actual: Decimal = Decimal(0)
    stock_minimo: Decimal = Decimal(0)
    costo_unitario: Decimal = Decimal(0)
    activo: bool = True

class InsumoCreate(InsumoBase):
    pass

class InsumoUpdate(BaseModel):
    nombre: Optional[str] = None
    unidad_medida: Optional[str] = None
    stock_actual: Optional[Decimal] = None
    stock_minimo: Optional[Decimal] = None
    costo_unitario: Optional[Decimal] = None
    activo: Optional[bool] = None

class Insumo(InsumoBase):
    id: int
    created_at: datetime
    updated_at: datetime
    class Config:
        from_attributes = True

class RecetaProductoBase(BaseModel):
    producto_id: int
    insumo_id: int
    cantidad_requerida: Decimal

class RecetaProductoCreate(RecetaProductoBase):
    pass

class RecetaProducto(RecetaProductoBase):
    id: int
    insumo_nombre: Optional[str] = None
    insumo_unidad: Optional[str] = None
    class Config:
        from_attributes = True

class MovimientoCajaBase(BaseModel):
    tipo: str # 'entrada' o 'salida'
    concepto: str
    monto: Decimal

class MovimientoCajaCreate(MovimientoCajaBase):
    turno_id: Optional[int] = None

class MovimientoCaja(MovimientoCajaBase):
    id: int
    turno_id: int
    autorizado_por: Optional[int] = None
    fecha_hora: datetime
    class Config:
        from_attributes = True
