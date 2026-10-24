from sqlalchemy import inspect, text
from db.database import engine
import logging

logger = logging.getLogger("mandala.migration")

def migrate():
    inspector = inspect(engine)
    try:
        tables = inspector.get_table_names()
        
        # 1. Migraciones para tabla 'pedidos'
        if 'pedidos' in tables:
            columns = [c['name'] for c in inspector.get_columns('pedidos')]
            with engine.connect() as conn:
                if 'turno_id' not in columns:
                    print("Añadiendo columna 'turno_id' a 'pedidos'...")
                    conn.execute(text("ALTER TABLE pedidos ADD COLUMN turno_id INTEGER"))
                    conn.commit()
                if 'origen_cliente' not in columns:
                    print("Añadiendo columna 'origen_cliente' a 'pedidos'...")
                    conn.execute(text("ALTER TABLE pedidos ADD COLUMN origen_cliente BOOLEAN DEFAULT FALSE"))
                    conn.commit()

        # 2. Migraciones para tabla 'mesas'
        if 'mesas' in tables:
            m_columns = [c['name'] for c in inspector.get_columns('mesas')]
            with engine.connect() as conn:
                if 'pidiendo_cuenta' not in m_columns:
                    print("Añadiendo columna 'pidiendo_cuenta' a 'mesas'...")
                    conn.execute(text("ALTER TABLE mesas ADD COLUMN pidiendo_cuenta BOOLEAN DEFAULT FALSE"))
                    conn.commit()
                if 'mesero_id' not in m_columns:
                    print("Añadiendo columna 'mesero_id' a 'mesas'...")
                    conn.execute(text("ALTER TABLE mesas ADD COLUMN mesero_id INTEGER"))
                    conn.commit()
                # Limpiar solicitud residual de cuenta en mesa 3
                conn.execute(text("UPDATE mesas SET pidiendo_cuenta = FALSE WHERE numero = 3"))
                conn.commit()

        # 3. Soporte para imágenes largas / base64 en 'productos'
        if 'productos' in tables:
            with engine.connect() as conn:
                try:
                    # Compatible con PostgreSQL
                    conn.execute(text("ALTER TABLE productos ALTER COLUMN imagen TYPE TEXT"))
                    conn.commit()
                except Exception:
                    pass

        # 4. Asegurar Kardex / Movimientos iniciales para todos los productos
        if 'movimientos_inventario' in tables and 'productos' in tables and 'tipos_movimiento' in tables:
            with engine.connect() as conn:
                try:
                    # Garantizar tipo 'Entrada'
                    r_tipo = conn.execute(text("SELECT id FROM tipos_movimiento WHERE LOWER(nombre) = 'entrada'")).fetchone()
                    if r_tipo:
                        entrada_id = r_tipo[0]
                    else:
                        conn.execute(text("INSERT INTO tipos_movimiento (nombre) VALUES ('Entrada')"))
                        conn.commit()
                        entrada_id = conn.execute(text("SELECT id FROM tipos_movimiento WHERE LOWER(nombre) = 'entrada'")).fetchone()[0]

                    # Productos sin movimiento inicial
                    prods = conn.execute(text("SELECT id, stock_actual FROM productos WHERE stock_actual > 0")).fetchall()
                    for p_id, p_stock in prods:
                        m_exist = conn.execute(text("SELECT id FROM movimientos_inventario WHERE producto_id = :pid"), {"pid": p_id}).fetchone()
                        if not m_exist:
                            conn.execute(text("""
                                INSERT INTO movimientos_inventario (producto_id, tipo_id, cantidad, motivo, fecha, usuario_id)
                                VALUES (:pid, :tid, :cant, 'Inventario Inicial', CURRENT_TIMESTAMP, 1)
                            """), {"pid": p_id, "tid": entrada_id, "cant": p_stock})
                    conn.commit()
                except Exception as kardex_err:
                    print(f"Nota Kardex: {kardex_err}")

        print("Migraciones de esquema verificadas correctamente.")
    except Exception as e:
        print(f"Verificación de migración omitida o error: {e}")

if __name__ == "__main__":
    migrate()
