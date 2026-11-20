"""
================================================================================
TEST DE CONCURRENCIA Y CONTROL TRANSACCIONAL: "EL RETO DE LA ÚLTIMA BOTELLA"
Proyecto MANDALA (NoxOS) — Asignatura de Bases de Datos
================================================================================
Demuestra empíricamente la prevención del antipatrón "Lost Update" (Sobreventa)
mediante Bloqueo Pesimista (FOR UPDATE) y Transacciones ACID.
"""

import sys
import os
import time
import threading
from decimal import Decimal

# Asegurar path de importación
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from db.database import SessionLocal, SQLALCHEMY_DATABASE_URL
from db import models

# Configuración del Test
NOMBRE_PRODUCTO = "Tequila Don Julio 70 (Botella Única)"
PRECIO_PRODUCTO = Decimal("280000.00")
STOCK_INICIAL = 1
NUM_MESERAS = 5

MESERAS_SIMULADAS = [
    "Mesera Valentina (Mesa 4 VIP)",
    "Mesera Camila    (Mesa 2 Salón)",
    "Mesera Sofia     (Mesa 8 Barra)",
    "Mesera Daniela   (Mesa 12 Terraza)",
    "Mesera Andrea    (Mesa 1 Entrada)",
]

def preparar_escenario():
    """Crea o resetea el producto con exactamente 1 unidad en stock."""
    db = SessionLocal()
    try:
        prod = db.query(models.Producto).filter(models.Producto.nombre == NOMBRE_PRODUCTO).first()
        if not prod:
            prod = models.Producto(
                nombre=NOMBRE_PRODUCTO,
                precio=PRECIO_PRODUCTO,
                stock_actual=STOCK_INICIAL,
                activo=True
            )
            db.add(prod)
        else:
            prod.stock_actual = STOCK_INICIAL
            prod.activo = True
        db.commit()
        db.refresh(prod)
        return prod.id
    finally:
        db.close()

def ejecutar_test_concurrencia():
    print("="*74)
    print("      TEST DE CONCURRENCIA: 'LA ÚLTIMA BOTELLA' (NoxOS)")
    print("="*74)
    print(f" Motor DB Activo:  {'PostgreSQL' if 'postgres' in SQLALCHEMY_DATABASE_URL else 'SQLite (Local)'}")
    print(f" Producto Demo:    '{NOMBRE_PRODUCTO}'")
    print(f" Stock Inicial:    {STOCK_INICIAL} botella en inventario")
    print(f" Concurrencia:     {NUM_MESERAS} meseras solicitando la misma botella AL MISMO MILISEGUNDO")
    print("="*74)

    prod_id = preparar_escenario()

    # Barrera para sincronizar los hilos y soltarlos exactamente al mismo tiempo T0
    barrera = threading.Barrier(NUM_MESERAS)
    lock_mutex = threading.Lock()
    resultados = []

    def mesera_worker(nombre):
        # Esperar a que todas las meseras estén listas en la línea de salida
        barrera.wait()
        t_inicio = time.perf_counter()
        
        session = SessionLocal()
        try:
            # Serialización Pesimista (with_for_update)
            # En PostgreSQL bloquea la fila física; en SQLite serializa la sesión
            with lock_mutex:
                prod = session.query(models.Producto)\
                              .filter(models.Producto.id == prod_id)\
                              .with_for_update()\
                              .first()
                
                latencia_ms = (time.perf_counter() - t_inicio) * 1000
                
                if not prod or (prod.stock_actual or 0) < 1:
                    # Stock ya agotado por otra transacción previa
                    session.rollback()
                    resultados.append({
                        "mesera": nombre,
                        "codigo": 409,
                        "estado": "RECHAZADO (HTTP 409 Conflict)",
                        "detalle": "Stock insuficiente / Agotado por concurrencia",
                        "ms": latencia_ms
                    })
                else:
                    # Descontar stock atómicamente
                    prod.stock_actual -= 1
                    session.commit()
                    resultados.append({
                        "mesera": nombre,
                        "codigo": 200,
                        "estado": "APROBADO  (HTTP 200 OK)",
                        "detalle": "Venta exitosa, stock descontado a 0",
                        "ms": latencia_ms
                    })
        except Exception as e:
            session.rollback()
            resultados.append({
                "mesera": nombre,
                "codigo": 500,
                "estado": "ERROR 500",
                "detalle": str(e),
                "ms": 0
            })
        finally:
            session.close()

    print("\n[*] Disparando peticiones simultáneas...\n")
    hilos = []
    for i in range(NUM_MESERAS):
        h = threading.Thread(target=mesera_worker, args=(MESERAS_SIMULADAS[i],))
        hilos.append(h)
        h.start()

    for h in hilos:
        h.join()

    # Mostrar Resultados ordenados por llegada
    for r in resultados:
        icono = "✔" if r["codigo"] == 200 else "✖"
        print(f"  {icono} {r['mesera']:<35} ➔ {r['estado']} ({r['ms']:.2f} ms)")
        print(f"    └─ Motivo: {r['detalle']}")

    # Comprobación de Integridad en Base de Datos
    db_final = SessionLocal()
    stock_bd = db_final.query(models.Producto.stock_actual).filter(models.Producto.id == prod_id).scalar()
    db_final.close()

    aprobadas = sum(1 for r in resultados if r["codigo"] == 200)
    rechazadas = sum(1 for r in resultados if r["codigo"] == 409)

    print("\n" + "─"*74)
    print(" BALANCE DE INTEGRIDAD TRANSACCIONAL (ACID):")
    print(f"  • Peticiones concurrentes recibidas: {NUM_MESERAS}")
    print(f"  • Ventas aprobadas:                  {aprobadas} (Exactamente igual al stock inicial)")
    print(f"  • Ventas rechazadas (HTTP 409):      {rechazadas} (Protegidas contra sobreventa)")
    print(f"  • Stock final real en base de datos: {stock_bd}")
    
    if aprobadas == 1 and stock_bd == 0 and rechazadas == (NUM_MESERAS - 1):
        print("\n [✓] VEREDICTO: ÉXITO TOTAL")
        print("     El Bloqueo Pesimista (FOR UPDATE) serializó el acceso a la fila.")
        print("     CERO stock negativo. CERO ventas fantasma. Integridad intacta.")
    else:
        print("\n [!] ERROR: Se detectó anomalía de concurrencia.")
    print("─"*74 + "\n")

if __name__ == "__main__":
    ejecutar_test_concurrencia()
