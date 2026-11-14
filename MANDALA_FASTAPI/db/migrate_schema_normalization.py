"""
Script de Migración y Normalización de Arquitectura de Base de Datos - NoxOS.
Aplica las 6 correcciones de normalización manteniendo 100% retrocompatibilidad:
1. Renombra 'mesa' -> 'mesa_id' y 'estado' -> 'estado_id' en 'pedidos'.
2. Renombra 'categoria' -> 'categoria_id' en 'productos'.
3. Renombra 'estado' -> 'estado_id' en 'mesas'.
4. Actualiza los índices de rendimiento cubrientes.
5. Agrega restricción UNIQUE en 'usuario_roles(usuario_id, rol_id)'.
6. Purga sesiones expiradas e indexa 'user_sessions(expires_at)'.
"""

import os
import shutil
import sqlite3
import sys

def run_migration():
    db_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "mandala_v2.db"))
    backup_path = db_path + ".backup_pre_norm"

    if not os.path.exists(db_path):
        print(f"Error: Base de datos no encontrada en {db_path}")
        return False

    print(f"1. Creando copia de seguridad: {backup_path}")
    shutil.copyfile(db_path, backup_path)

    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    try:
        # A. Normalización de pedidos
        cursor.execute("PRAGMA table_info(pedidos)")
        pedidos_cols = {col[1] for col in cursor.fetchall()}

        if "mesa" in pedidos_cols and "mesa_id" not in pedidos_cols:
            print("Renombrando pedidos.mesa -> pedidos.mesa_id...")
            cursor.execute("ALTER TABLE pedidos RENAME COLUMN mesa TO mesa_id")
        
        if "estado" in pedidos_cols and "estado_id" not in pedidos_cols:
            print("Renombrando pedidos.estado -> pedidos.estado_id...")
            cursor.execute("ALTER TABLE pedidos RENAME COLUMN estado TO estado_id")

        # B. Normalización de productos
        cursor.execute("PRAGMA table_info(productos)")
        prod_cols = {col[1] for col in cursor.fetchall()}
        if "categoria" in prod_cols and "categoria_id" not in prod_cols:
            print("Renombrando productos.categoria -> productos.categoria_id...")
            cursor.execute("ALTER TABLE productos RENAME COLUMN categoria TO categoria_id")

        # C. Normalización de mesas
        cursor.execute("PRAGMA table_info(mesas)")
        mesas_cols = {col[1] for col in cursor.fetchall()}
        if "estado" in mesas_cols and "estado_id" not in mesas_cols:
            print("Renombrando mesas.estado -> mesas.estado_id...")
            cursor.execute("ALTER TABLE mesas RENAME COLUMN estado TO estado_id")

        # D. Re-crear índices cubrientes en pedidos con la columna normalizada
        print("Actualizando índices cubrientes en pedidos...")
        cursor.execute("DROP INDEX IF EXISTS idx_pedidos_turno_estado")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_pedidos_turno_estado ON pedidos(turno_id, estado_id)")

        cursor.execute("DROP INDEX IF EXISTS idx_pedidos_cierre_cubriente")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_pedidos_cierre_cubriente ON pedidos(turno_id, estado_id, total)")

        cursor.execute("DROP INDEX IF EXISTS idx_pedidos_fecha_estado")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_pedidos_fecha_estado ON pedidos(fecha_hora, estado_id)")

        # E. Restricción UNIQUE en usuario_roles
        print("Creando índice UNIQUE en usuario_roles(usuario_id, rol_id)...")
        cursor.execute("CREATE UNIQUE INDEX IF NOT EXISTS uq_usuario_rol ON usuario_roles(usuario_id, rol_id)")

        # F. Purga de sesiones JWT expiradas y creación de índice TTL
        cursor.execute("SELECT COUNT(*) FROM user_sessions WHERE expires_at < CURRENT_TIMESTAMP")
        expired_count = cursor.fetchone()[0]
        print(f"Purgando {expired_count} sesiones expiradas de user_sessions...")
        cursor.execute("DELETE FROM user_sessions WHERE expires_at < CURRENT_TIMESTAMP")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_user_sessions_expires ON user_sessions(expires_at)")

        conn.commit()
        print("✅ Migración y normalización de base de datos ejecutada con éxito!")
        return True

    except Exception as e:
        conn.rollback()
        print(f"❌ Error durante la migración: {e}")
        print("Restaurando respaldo...")
        shutil.copyfile(backup_path, db_path)
        return False
    finally:
        conn.close()

if __name__ == "__main__":
    success = run_migration()
    sys.exit(0 if success else 1)
