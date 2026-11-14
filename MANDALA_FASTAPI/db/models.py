from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Numeric, Text, Index, UniqueConstraint, CheckConstraint
from sqlalchemy.orm import relationship, synonym
from sqlalchemy.sql import func
from .database import Base

class Usuario(Base):
    __tablename__ = "usuarios"
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(150), unique=True, index=True)
    email = Column(String(150), unique=True, index=True)
    password = Column(String(255))
    nombre_completo = Column(String(150))
    activo = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    roles_asignados = relationship("UsuarioRol", back_populates="usuario")

class Rol(Base):
    __tablename__ = "roles"
    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String(50), unique=True)
    
class UsuarioRol(Base):
    __tablename__ = "usuario_roles"
    __table_args__ = (
        UniqueConstraint("usuario_id", "rol_id", name="uq_usuario_rol"),
    )
    id = Column(Integer, primary_key=True, index=True)
    usuario_id = Column(Integer, ForeignKey("usuarios.id"))
    rol_id = Column(Integer, ForeignKey("roles.id"))

    usuario = relationship("Usuario", back_populates="roles_asignados")
    rol = relationship("Rol")

class Categoria(Base):
    __tablename__ = "categorias"
    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String(100), unique=True)
    descripcion = Column(Text, nullable=True)
    is_deleted = Column(Boolean, default=False)
    
    productos = relationship("Producto", back_populates="rel_categoria")

class Producto(Base):
    __tablename__ = "productos"
    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String(150))
    precio = Column(Numeric(10, 2))
    stock_actual = Column(Integer, default=0)
    activo = Column(Boolean, default=True)
    categoria_id = Column(Integer, ForeignKey("categorias.id"), nullable=True)
    categoria = synonym("categoria_id")
    imagen = Column(Text, nullable=True)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    is_deleted = Column(Boolean, default=False)
    deleted_at = Column(DateTime(timezone=True), nullable=True)

    rel_categoria = relationship("Categoria", back_populates="productos")

class EstadoMesa(Base):
    __tablename__ = "estados_mesa"
    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String(50), unique=True)

class Mesa(Base):
    __tablename__ = "mesas"
    id = Column(Integer, primary_key=True, index=True)
    numero = Column(Integer, unique=True)
    capacidad = Column(Integer, default=1)
    estado_id = Column(Integer, ForeignKey("estados_mesa.id"))
    estado = synonym("estado_id")

    rel_estado = relationship("EstadoMesa")
    mesero_id = Column(Integer, ForeignKey("usuarios.id"), nullable=True)
    pidiendo_cuenta = Column(Boolean, default=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    is_deleted = Column(Boolean, default=False)

    rel_mesero = relationship("Usuario")

class EstadoPedido(Base):
    __tablename__ = "estados_pedido"
    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String(50), unique=True)

class Pedido(Base):
    __tablename__ = "pedidos"
    __table_args__ = (
        # PILAR 2: INDEXACIÓN AVANZADA
        # 1. Índice compuesto respetando la Regla del Prefijo Izquierdo (Leftmost Prefix Rule)
        Index("idx_pedidos_turno_estado", "turno_id", "estado_id"),
        # 2. Índice Cubriente (Covering Index): resuelve SUM(total) de caja con Using index / Heap Fetches: 0
        Index("idx_pedidos_cierre_cubriente", "turno_id", "estado_id", "total"),
        # 3. Índice para filtrado temporal SARGable en analítica y reportes
        Index("idx_pedidos_fecha_estado", "fecha_hora", "estado_id"),
    )
    id = Column(Integer, primary_key=True, index=True)
    fecha_hora = Column(DateTime(timezone=True), server_default=func.now())
    estado_id = Column(Integer, ForeignKey("estados_pedido.id"))
    estado = synonym("estado_id")
    total = Column(Numeric(12, 2), default=0)
    mesa_id = Column(Integer, ForeignKey("mesas.id"))
    mesa = synonym("mesa_id")
    creado_por = Column(Integer, ForeignKey("usuarios.id"), nullable=True)
    turno_id = Column(Integer, ForeignKey("turnos.id"), nullable=True)
    origen_cliente = Column(Boolean, default=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    rel_estado = relationship("EstadoPedido")
    rel_mesa = relationship("Mesa")
    detalles = relationship("PedidoProducto", back_populates="pedido")
    turno = relationship("Turno")
    pagos = relationship("Pago", back_populates="pedido")

class PedidoProducto(Base):
    __tablename__ = "pedido_productos"
    __table_args__ = (
        Index("idx_pedido_prod_lookup", "pedido_id", "producto_id"),
    )
    id = Column(Integer, primary_key=True, index=True)
    pedido_id = Column(Integer, ForeignKey("pedidos.id"))
    producto_id = Column(Integer, ForeignKey("productos.id"))
    cantidad = Column(Integer, default=1)
    cantidad_despachada = Column(Integer, default=0)
    precio_unitario = Column(Numeric(10, 2))

    pedido = relationship("Pedido", back_populates="detalles")
    producto = relationship("Producto")

class TipoMovimiento(Base):
    __tablename__ = "tipos_movimiento"
    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String(50), unique=True)

class MovimientoInventario(Base):
    __tablename__ = "movimientos_inventario"
    id = Column(Integer, primary_key=True, index=True)
    producto_id = Column(Integer, ForeignKey("productos.id"))
    tipo_id = Column(Integer, ForeignKey("tipos_movimiento.id"))
    cantidad = Column(Integer)
    motivo = Column(String(255), nullable=True)
    fecha = Column(DateTime(timezone=True), server_default=func.now())
    usuario_id = Column(Integer, ForeignKey("usuarios.id"), nullable=True)

    producto = relationship("Producto")
    tipo = relationship("TipoMovimiento")
    usuario = relationship("Usuario")

class EmpresaConfig(Base):
    __tablename__ = "empresa_config"
    __table_args__ = (
        CheckConstraint("id = 1", name="chk_empresa_config_singleton"),
    )
    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String(150))
    nit = Column(String(50), nullable=True)
    direccion = Column(String(255), nullable=True)
    telefono = Column(String(50), nullable=True)
    mensaje_footer = Column(Text, default="¡Gracias por su visita!")
    moneda = Column(String(10), default="$")
    impuesto_porcentaje = Column(Numeric(5, 2), default=0)

class Turno(Base):
    __tablename__ = "turnos"
    id = Column(Integer, primary_key=True, index=True)
    abierto_por = Column(Integer, ForeignKey("usuarios.id"))
    cerrado_por = Column(Integer, ForeignKey("usuarios.id"), nullable=True)
    fecha_apertura = Column(DateTime(timezone=True), server_default=func.now())
    fecha_cierre = Column(DateTime(timezone=True), nullable=True)
    base_inicial = Column(Numeric(12, 2), default=0)
    total_ventas = Column(Numeric(12, 2), default=0)
    efectivo_real = Column(Numeric(12, 2), nullable=True)
    total_efectivo = Column(Numeric(12, 2), default=0)
    total_tarjeta = Column(Numeric(12, 2), default=0)
    total_transferencia = Column(Numeric(12, 2), default=0)
    total_propinas = Column(Numeric(12, 2), default=0)
    diferencia = Column(Numeric(12, 2), default=0)
    estado = Column(String(20), default="abierto") # abierto, cerrado
    observaciones = Column(Text, nullable=True)

    usuario_apertura = relationship("Usuario", foreign_keys=[abierto_por])
    usuario_cierre = relationship("Usuario", foreign_keys=[cerrado_por])
    movimientos_caja = relationship("MovimientoCaja", back_populates="turno")

    @property
    def usuario_apertura_nombre(self):
        return self.usuario_apertura.username if self.usuario_apertura else None

    @property
    def usuario_cierre_nombre(self):
        return self.usuario_cierre.username if self.usuario_cierre else None

class UserSession(Base):
    __tablename__ = "user_sessions"
    __table_args__ = (
        Index("idx_user_sessions_expires", "expires_at"),
    )
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("usuarios.id"))
    token = Column(String(500), unique=True, index=True)
    expires_at = Column(DateTime(timezone=True))
    created_at = Column(DateTime(timezone=True), server_default=func.now())

# ==============================================================================
# PILAR AVANZADO: MÉTODOS DE PAGO, AUDITORÍA, INSUMOS & CAJA CHICA
# ==============================================================================

class Pago(Base):
    __tablename__ = "pagos"
    __table_args__ = (
        Index("idx_pagos_pedido", "pedido_id"),
        Index("idx_pagos_fecha", "fecha_hora"),
    )
    id = Column(Integer, primary_key=True, index=True)
    pedido_id = Column(Integer, ForeignKey("pedidos.id"))
    metodo_pago = Column(String(50), nullable=False) # Efectivo, Tarjeta, Nequi, Daviplata, Transferencia
    monto = Column(Numeric(12, 2), nullable=False)
    propina = Column(Numeric(12, 2), default=0)
    referencia = Column(String(100), nullable=True)
    creado_por = Column(Integer, ForeignKey("usuarios.id"), nullable=True)
    fecha_hora = Column(DateTime(timezone=True), server_default=func.now())

    pedido = relationship("Pedido", back_populates="pagos")
    usuario = relationship("Usuario")

class AuditoriaEvento(Base):
    __tablename__ = "auditoria_eventos"
    __table_args__ = (
        Index("idx_audit_accion_fecha", "accion", "fecha_hora"),
        Index("idx_audit_usuario", "usuario_id"),
    )
    id = Column(Integer, primary_key=True, index=True)
    usuario_id = Column(Integer, ForeignKey("usuarios.id"), nullable=True)
    accion = Column(String(100), nullable=False) # ANULACION_PEDIDO, CAMBIO_PRECIO, REAPERTURA_MESA, AJUSTE_STOCK, CIERRE_CAJA
    tabla_afectada = Column(String(50), nullable=False)
    registro_id = Column(Integer, nullable=True)
    valor_anterior = Column(Text, nullable=True)
    valor_nuevo = Column(Text, nullable=True)
    motivo = Column(Text, nullable=True)
    ip_address = Column(String(50), nullable=True)
    fecha_hora = Column(DateTime(timezone=True), server_default=func.now())

    usuario = relationship("Usuario")

class Insumo(Base):
    __tablename__ = "insumos"
    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String(150), unique=True, nullable=False)
    unidad_medida = Column(String(20), nullable=False) # ml, oz, gr, unidad
    stock_actual = Column(Numeric(12, 2), default=0)
    stock_minimo = Column(Numeric(12, 2), default=0)
    costo_unitario = Column(Numeric(12, 2), default=0)
    activo = Column(Boolean, default=True)
    is_deleted = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    recetas = relationship("RecetaProducto", back_populates="insumo")

class RecetaProducto(Base):
    __tablename__ = "recetas_producto"
    __table_args__ = (
        UniqueConstraint("producto_id", "insumo_id", name="uq_receta_prod_insumo"),
        Index("idx_recetas_lookup", "producto_id", "insumo_id"),
    )
    id = Column(Integer, primary_key=True, index=True)
    producto_id = Column(Integer, ForeignKey("productos.id"))
    insumo_id = Column(Integer, ForeignKey("insumos.id"))
    cantidad_requerida = Column(Numeric(10, 2), nullable=False) # ej: 50 ml

    producto = relationship("Producto")
    insumo = relationship("Insumo", back_populates="recetas")

class MovimientoCaja(Base):
    __tablename__ = "movimientos_caja"
    __table_args__ = (
        Index("idx_mov_caja_turno", "turno_id"),
    )
    id = Column(Integer, primary_key=True, index=True)
    turno_id = Column(Integer, ForeignKey("turnos.id"))
    tipo = Column(String(20), nullable=False) # 'entrada' o 'salida'
    concepto = Column(String(255), nullable=False) # 'Compra hielo', 'Pago taxi', 'Cambio monedas'
    monto = Column(Numeric(12, 2), nullable=False)
    autorizado_por = Column(Integer, ForeignKey("usuarios.id"), nullable=True)
    fecha_hora = Column(DateTime(timezone=True), server_default=func.now())

    turno = relationship("Turno", back_populates="movimientos_caja")
    usuario = relationship("Usuario")

