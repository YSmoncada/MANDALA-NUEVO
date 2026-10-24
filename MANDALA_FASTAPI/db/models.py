from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Numeric, Text
from sqlalchemy.orm import relationship
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
    
    productos = relationship("Producto", back_populates="rel_categoria")

class Producto(Base):
    __tablename__ = "productos"
    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String(150))
    precio = Column(Numeric(10, 2))
    stock_actual = Column(Integer, default=0)
    activo = Column(Boolean, default=True)
    categoria = Column(Integer, ForeignKey("categorias.id"), nullable=True)
    imagen = Column(Text, nullable=True)

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
    estado = Column(Integer, ForeignKey("estados_mesa.id"))

    rel_estado = relationship("EstadoMesa")
    mesero_id = Column(Integer, ForeignKey("usuarios.id"), nullable=True)
    pidiendo_cuenta = Column(Boolean, default=False)

    rel_mesero = relationship("Usuario")

class EstadoPedido(Base):
    __tablename__ = "estados_pedido"
    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String(50), unique=True)

class Pedido(Base):
    __tablename__ = "pedidos"
    id = Column(Integer, primary_key=True, index=True)
    fecha_hora = Column(DateTime(timezone=True), server_default=func.now())
    estado = Column(Integer, ForeignKey("estados_pedido.id"))
    total = Column(Numeric(12, 2), default=0)
    mesa = Column(Integer, ForeignKey("mesas.id"))
    creado_por = Column(Integer, ForeignKey("usuarios.id"), nullable=True)
    turno_id = Column(Integer, ForeignKey("turnos.id"), nullable=True)
    origen_cliente = Column(Boolean, default=False)

    rel_estado = relationship("EstadoPedido")
    rel_mesa = relationship("Mesa")
    detalles = relationship("PedidoProducto", back_populates="pedido")
    turno = relationship("Turno")

class PedidoProducto(Base):
    __tablename__ = "pedido_productos"
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

class EmpresaConfig(Base):
    __tablename__ = "empresa_config"
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
    estado = Column(String(20), default="abierto") # abierto, cerrado
    observaciones = Column(Text, nullable=True)

    usuario_apertura = relationship("Usuario", foreign_keys=[abierto_por])
    usuario_cierre = relationship("Usuario", foreign_keys=[cerrado_por])

    @property
    def usuario_apertura_nombre(self):
        return self.usuario_apertura.username if self.usuario_apertura else None

    @property
    def usuario_cierre_nombre(self):
        return self.usuario_cierre.username if self.usuario_cierre else None

class UserSession(Base):
    __tablename__ = "user_sessions"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("usuarios.id"))
    token = Column(String(500), unique=True, index=True)
    expires_at = Column(DateTime(timezone=True))
    created_at = Column(DateTime(timezone=True), server_default=func.now())

