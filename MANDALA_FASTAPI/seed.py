from sqlalchemy.orm import Session
from db.database import SessionLocal, engine
from db import models
from core.security import get_password_hash
from decimal import Decimal

def seed():
    # Asegurar que las tablas existan antes de insertar
    models.Base.metadata.create_all(bind=engine)
    
    db = SessionLocal()
    
    # 1. Roles
    roles = ["admin", "bartender", "mesera", "usuario"]
    for rol_nombre in roles:
        if not db.query(models.Rol).filter(models.Rol.nombre == rol_nombre).first():
            db.add(models.Rol(nombre=rol_nombre))
    
    # 2. Estados de Mesa
    estados_mesa = ["Libre", "Ocupada", "Reservada"]
    for est in estados_mesa:
        if not db.query(models.EstadoMesa).filter(models.EstadoMesa.nombre == est).first():
            db.add(models.EstadoMesa(nombre=est))
            
    # 3. Estados de Pedido
    estados_pedido = ["Pendiente", "Preparando", "Despachado", "Finalizada", "Cancelado"]
    for est in estados_pedido:
        if not db.query(models.EstadoPedido).filter(models.EstadoPedido.nombre == est).first():
            db.add(models.EstadoPedido(nombre=est))

    # 4. Tipos de Movimiento
    tipos_mov = ["Entrada", "Salida", "Ajuste"]
    for t in tipos_mov:
        if not db.query(models.TipoMovimiento).filter(models.TipoMovimiento.nombre == t).first():
            db.add(models.TipoMovimiento(nombre=t))

    db.commit()

    # 5. Usuarios base por defecto
    usuarios_base = [
        {"user": "admin", "pass": "admin123", "email": "admin@mandala.com", "name": "Administrador", "rol": "admin"},
        {"user": "bartender", "pass": "bartender123", "email": "bartender@mandala.com", "name": "Bartender de Turno", "rol": "bartender"},
        {"user": "mesera", "pass": "mesera123", "email": "mesera@mandala.com", "name": "Carolina Martínez", "rol": "mesera"},
        {"user": "valentina", "pass": "valentina123", "email": "valentina@mandala.com", "name": "Valentina Gómez", "rol": "mesera"},
        {"user": "camila", "pass": "camila123", "email": "camila@mandala.com", "name": "Camila Torres", "rol": "mesera"}
    ]

    for u_data in usuarios_base:
        user = db.query(models.Usuario).filter(models.Usuario.username == u_data["user"]).first()
        if not user:
            hashed_password = get_password_hash(u_data["pass"])
            user = models.Usuario(
                username=u_data["user"],
                email=u_data["email"],
                password=hashed_password,
                nombre_completo=u_data["name"],
                activo=True
            )
            db.add(user)
            db.commit()
            db.refresh(user)
            
            rol = db.query(models.Rol).filter(models.Rol.nombre == u_data["rol"]).first()
            if rol:
                db.add(models.UsuarioRol(usuario_id=user.id, rol_id=rol.id))
                db.commit()
            print(f"- Usuario {u_data['user']} creado con éxito.")

    categorias_data = [
        {"nombre": "Cervezas", "desc": "Cervezas nacionales e importadas"},
        {"nombre": "Licores", "desc": "Licores, aguardientes y rones"},
        {"nombre": "Whisky", "desc": "Selección de whiskies premium"}
    ]
    
    cat_map = {}
    for c_data in categorias_data:
        cat = db.query(models.Categoria).filter(models.Categoria.nombre == c_data["nombre"]).first()
        if not cat:
            cat = models.Categoria(nombre=c_data["nombre"], descripcion=c_data["desc"])
            db.add(cat)
            db.commit()
            db.refresh(cat)
        cat_map[c_data["nombre"]] = cat.id

    productos_data = [
        {'nombre': 'Cerveza Corona', 'precio': "12000.00", 'cat': 'Cervezas', 'img': 'productos/corona.png', 'stock': 48},
        {'nombre': 'Cerveza Aguila', 'precio': "6000.00", 'cat': 'Cervezas', 'img': 'productos/aguila.png', 'stock': 120},
        {'nombre': 'Aguila Light', 'precio': "6500.00", 'cat': 'Cervezas', 'img': 'productos/aguila-light.png', 'stock': 96},
        {'nombre': 'Aguardiente Amarillo', 'precio': "110000.00", 'cat': 'Licores', 'img': 'productos/aguardiente-amarillo.png', 'stock': 12},
        {'nombre': 'Aguardiente Néctar', 'precio': "95000.00", 'cat': 'Licores', 'img': 'productos/aguardiente-nectar.png', 'stock': 15},
        {'nombre': 'Buchanans Deluxe', 'precio': "210000.00", 'cat': 'Whisky', 'img': 'productos/buchanas.png', 'stock': 8},
        {'nombre': 'Bacardi Limón', 'precio': "130000.00", 'cat': 'Licores', 'img': 'productos/bacardi-limon.png', 'stock': 6},
    ]

    for p in productos_data:
        if not db.query(models.Producto).filter(models.Producto.nombre == p['nombre']).first():
            db.add(models.Producto(
                nombre=p['nombre'],
                precio=Decimal(p['precio']),
                stock_actual=p['stock'],
                categoria=cat_map[p['cat']],
                imagen=p['img']
            ))
            print(f"- {p['nombre']} registrado.")

    # 7. Mesas (Crear 20 mesas en total)
    est_libre = db.query(models.EstadoMesa).filter(models.EstadoMesa.nombre == "Libre").first()
    for i in range(1, 21):
        if not db.query(models.Mesa).filter(models.Mesa.numero == i).first():
            db.add(models.Mesa(numero=i, capacidad=4, estado=est_libre.id))
    
    db.commit()
    print("Semillado de mesas (1-20) completado.")
    print("Semillado de inventario completado con éxito.")
    db.close()

if __name__ == "__main__":
    seed()
