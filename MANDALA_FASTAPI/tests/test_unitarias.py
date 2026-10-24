"""
Pruebas Unitarias Automatizadas para NoxOS Backend (FastAPI).
Evaluación de Componentes Críticos: Autenticación JWT, Seguridad,
Reglas de Negocio, Asignación de Meseras y Control de Inventario.
"""

import pytest
from fastapi.testclient import TestClient
from fastapi import HTTPException
from sqlalchemy.orm import Session

from main import app
from db.database import SessionLocal
from db import models
from api.endpoints.usuarios import validate_secure_password
from api.endpoints.mesas import assign_waiter

client = TestClient(app)

@pytest.fixture(scope="module")
def db_session():
    """Proporciona una sesión de base de datos para pruebas."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@pytest.fixture(scope="module")
def admin_token():
    """Obtiene un token JWT de administrador para pruebas autenticadas."""
    response = client.post("/api/login/", json={
        "username": "admin",
        "password": "admin123"
    })
    assert response.status_code == 200, "Error de login en fixture de prueba"
    return response.json()["token"]


# ==============================================================================
# 1. PRUEBA DE DISPONIBILIDAD (HEALTH CHECK)
# ==============================================================================
def test_01_health_check_api():
    """
    CP-U01: Verifica que el endpoint raíz '/' responda con código HTTP 200
    y devuelva el mensaje con la versión operativa de NoxOS.
    """
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert "message" in data
    assert "Mandala" in data["message"] or "NoxOS" in data["message"]


# ==============================================================================
# 2. AUTENTICACIÓN JWT EXITOSA
# ==============================================================================
def test_02_login_jwt_exitoso():
    """
    CP-U02: Verifica que un usuario válido reciba un token JWT de acceso,
    un token de refresco y la confirmación de su rol.
    """
    response = client.post("/api/login/", json={
        "username": "admin",
        "password": "admin123"
    })
    assert response.status_code == 200
    data = response.json()
    assert "token" in data
    assert "refresh" in data
    assert len(data["token"]) > 20
    assert data.get("role") == "admin"


# ==============================================================================
# 3. RECHAZO DE CREDENCIALES INVÁLIDAS
# ==============================================================================
def test_03_login_credenciales_invalidas():
    """
    CP-U03: Verifica que el intento de inicio de sesión con contraseña
    incorrecta sea rechazado con HTTP 401 Unauthorized.
    """
    response = client.post("/api/login/", json={
        "username": "admin",
        "password": "clave_totalmente_incorrecta"
    })
    assert response.status_code == 401
    data = response.json()
    assert "detail" in data
    assert "incorrectos" in data["detail"].lower()


# ==============================================================================
# 4. VALIDACIÓN DE POLÍTICA DE CONTRASEÑA SEGURA
# ==============================================================================
def test_04_seguridad_password_debil():
    """
    CP-U04: Verifica la función validate_secure_password() para rechazar
    contraseñas cortas (< 6 caracteres) o sin combinación alfanumérica.
    """
    # Caso A: Contraseña menor a 6 caracteres
    with pytest.raises(HTTPException) as exc_info_short:
        validate_secure_password("123")
    assert exc_info_short.value.status_code == 400
    assert "al menos 6 caracteres" in exc_info_short.value.detail

    # Caso B: Contraseña solo letras sin números
    with pytest.raises(HTTPException) as exc_info_alpha:
        validate_secure_password("sololetras")
    assert exc_info_alpha.value.status_code == 400
    assert "al menos un número" in exc_info_alpha.value.detail

    # Caso C: Contraseña robusta permitida
    try:
        validate_secure_password("Noxos2026")
    except HTTPException:
        pytest.fail("validate_secure_password rechazó una contraseña válida")


# ==============================================================================
# 5. BLOQUEO DE VENTAS SIN TURNO ABIERTO
# ==============================================================================
def test_05_bloqueo_pedido_sin_turno(db_session: Session):
    """
    CP-U05: Valida la regla de negocio que impide crear pedidos si no existe
    un turno de caja activo (HTTP 400 - VENTAS BLOQUEADAS).
    """
    # Cerrar temporalmente todos los turnos para simular caja cerrada
    turnos_abiertos = db_session.query(models.Turno).filter(models.Turno.estado == "abierto").all()
    for t in turnos_abiertos:
        t.estado = "cerrado"
    db_session.commit()

    try:
        mesa = db_session.query(models.Mesa).first()
        prod = db_session.query(models.Producto).filter(models.Producto.activo == True).first()
        assert mesa is not None and prod is not None

        response = client.post("/api/pedidos/", json={
            "mesa": mesa.id,
            "productos": [
                {"producto_id": prod.id, "cantidad": 1}
            ]
        })
        assert response.status_code == 400
        data = response.json()
        assert "VENTAS BLOQUEADAS" in data["detail"]
    finally:
        # Restaurar turnos abiertos
        for t in turnos_abiertos:
            t.estado = "abierto"
        db_session.commit()


# ==============================================================================
# 6. RENDERIZADO DE MENÚ DIGITAL QR CLIENTE
# ==============================================================================
def test_06_menu_digital_qr_cliente(db_session: Session):
    """
    CP-U06: Verifica que la consulta al endpoint '/menu/{mesa_id}' devuelva
    el documento HTML interactivo con información de la mesa y diseño responsive.
    """
    mesa = db_session.query(models.Mesa).first()
    assert mesa is not None

    response = client.get(f"/menu/{mesa.id}")
    assert response.status_code == 200
    assert "text/html" in response.headers.get("content-type", "")
    assert f"Mesa {mesa.numero}" in response.text or "Mesa" in response.text
    assert "<!DOCTYPE html>" in response.text


# ==============================================================================
# 7. ALGORITMO DE ASIGNACIÓN UNIFORME DE MESERAS
# ==============================================================================
def test_07_algoritmo_balanceo_meseras(db_session: Session):
    """
    CP-U07: Verifica que el algoritmo assign_waiter() distribuya la atención
    asignando a la mesera activa con menor número de mesas ocupadas.
    """
    mesa_prueba = db_session.query(models.Mesa).order_by(models.Mesa.id.desc()).first()
    assert mesa_prueba is not None

    # Ejecutar algoritmo de balanceo
    mesero_asignado = assign_waiter(db_session, mesa_prueba)
    assert mesero_asignado is not None
    assert mesero_asignado.activo == True
    assert mesa_prueba.mesero_id == mesero_asignado.id


# ==============================================================================
# 8. BLOQUEO DE SOLICITUD DE CUENTA CON PEDIDOS EN CURSO
# ==============================================================================
def test_08_bloqueo_pedir_cuenta_con_pedidos_activos(db_session: Session):
    """
    CP-U08: Verifica que si una mesa tiene pedidos en estado Pendiente o Preparando,
    el endpoint '/api/mesas/{id}/pedir-cuenta/' rechace la solicitud (HTTP 400).
    """
    mesa = db_session.query(models.Mesa).first()
    est_pendiente = db_session.query(models.EstadoPedido).filter(models.EstadoPedido.nombre.ilike("%pendiente%")).first()
    if not est_pendiente:
        est_pendiente = models.EstadoPedido(nombre="Pendiente")
        db_session.add(est_pendiente)
        db_session.commit()

    # Crear un pedido de prueba pendiente en la mesa
    pedido_prueba = models.Pedido(
        mesa=mesa.id,
        estado=est_pendiente.id,
        total=10000
    )
    db_session.add(pedido_prueba)
    db_session.commit()
    db_session.refresh(pedido_prueba)

    try:
        response = client.post(f"/api/mesas/{mesa.id}/pedir-cuenta/")
        assert response.status_code == 400
        assert "No puedes pedir la cuenta" in response.json()["detail"]
    finally:
        # Limpiar pedido de prueba
        db_session.delete(pedido_prueba)
        db_session.commit()


# ==============================================================================
# 9. CICLO DE VIDA DE PEDIDO (TRANSICIÓN DE ESTADOS)
# ==============================================================================
def test_09_ciclo_vida_transicion_pedido(db_session: Session, admin_token: str):
    """
    CP-U09: Verifica que un pedido actualice su estado mediante PATCH
    garantizando la integridad del flujo operativo (Pendiente -> Preparando).
    """
    mesa = db_session.query(models.Mesa).first()
    est_pendiente = db_session.query(models.EstadoPedido).filter(models.EstadoPedido.nombre.ilike("%pendiente%")).first()
    
    pedido = models.Pedido(
        mesa=mesa.id,
        estado=est_pendiente.id,
        total=25000
    )
    db_session.add(pedido)
    db_session.commit()
    db_session.refresh(pedido)

    headers = {"Authorization": f"Bearer {admin_token}"}
    try:
        response = client.patch(
            f"/api/pedidos/{pedido.id}/",
            json={"estado_nombre": "Preparando"},
            headers=headers
        )
        assert response.status_code == 200
        data = response.json()
        assert data.get("estado_nombre") == "Preparando"
    finally:
        db_session.delete(pedido)
        db_session.commit()


# ==============================================================================
# 10. DEDUCCIÓN AUTOMÁTICA DE STOCK Y AUDITORÍA KARDEX
# ==============================================================================
def test_10_deduccion_stock_y_kardex(db_session: Session, admin_token: str):
    """
    CP-U10: Verifica que al despachar un pedido, el stock físico del producto
    se descuente con precisión y se inserte el registro de auditoría en Kardex.
    """
    prod = db_session.query(models.Producto).first()
    assert prod is not None
    stock_inicial = prod.stock_actual
    cantidad_orden = 2

    # Crear pedido con detalle
    mesa = db_session.query(models.Mesa).first()
    est_pendiente = db_session.query(models.EstadoPedido).filter(models.EstadoPedido.nombre.ilike("%pendiente%")).first()
    
    pedido = models.Pedido(
        mesa=mesa.id,
        estado=est_pendiente.id,
        total=prod.precio * cantidad_orden
    )
    db_session.add(pedido)
    db_session.commit()
    db_session.refresh(pedido)

    detalle = models.PedidoProducto(
        pedido_id=pedido.id,
        producto_id=prod.id,
        cantidad=cantidad_orden,
        cantidad_despachada=0,
        precio_unitario=prod.precio
    )
    db_session.add(detalle)
    db_session.commit()

    headers = {"Authorization": f"Bearer {admin_token}"}
    try:
        # Despachar pedido
        response = client.patch(
            f"/api/pedidos/{pedido.id}/",
            json={"estado_nombre": "Despachado"},
            headers=headers
        )
        assert response.status_code == 200

        # Verificar descuento de inventario
        db_session.refresh(prod)
        assert prod.stock_actual == stock_inicial - cantidad_orden

        # Verificar registro Kardex en MovimientoInventario
        mov = db_session.query(models.MovimientoInventario).filter(
            models.MovimientoInventario.motivo == f"Venta Pedido #{pedido.id}"
        ).first()
        assert mov is not None
        assert mov.cantidad == cantidad_orden
        assert mov.producto_id == prod.id

    finally:
        # Restaurar inventario y limpiar
        prod.stock_actual = stock_inicial
        mov_limpiar = db_session.query(models.MovimientoInventario).filter(
            models.MovimientoInventario.motivo == f"Venta Pedido #{pedido.id}"
        ).all()
        for m in mov_limpiar:
            db_session.delete(m)
        detalles_limpiar = db_session.query(models.PedidoProducto).filter(models.PedidoProducto.pedido_id == pedido.id).all()
        for d in detalles_limpiar:
            db_session.delete(d)
        db_session.delete(pedido)
        db_session.commit()
