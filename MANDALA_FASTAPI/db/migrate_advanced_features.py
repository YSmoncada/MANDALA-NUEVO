"""
Migración Avanzada de Base de Datos - NoxOS
Implementa las 5 Mejoras Arquitectónicas + Gestión Integral de Caja:
1. Tabla 'pagos': Soporte para pagos divididos, propinas y métodos de pago (Efectivo, Tarjeta, Nequi).
2. Tabla 'auditoria_eventos': Log inmutable anti-fraude para anulaciones, ajustes y cambios sensibles.
3. Tablas 'insumos' y 'recetas_producto': Control de escandallos y recetas para coctelería / tragos.
4. Tabla 'movimientos_caja': Control de entradas y salidas de efectivo menor durante el turno.
5. Columnas 'updated_at', 'is_deleted', 'deleted_at' para sincronización móvil y Soft Delete.
"""

import os
import sqlite3
import sys

def run_advanced_migration():
    db_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "mandala_v2.db"))
    if not os.path.exists(db_path):
        print(f"Error: Base de datos no encontrada en {db_path}")
        return False

    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    try:
        # 1. Tabla PAGOS (Múltiples métodos de pago, propinas, transacciones)
        print("1. Creando tabla 'pagos'...")
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS pagos (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            pedido_id INTEGER NOT NULL REFERENCES pedidos(id),
            metodo_pago VARCHAR(50) NOT NULL, -- Efectivo, Tarjeta, Nequi, Daviplata, Transferencia
            monto NUMERIC(12, 2) NOT NULL,
            propina NUMERIC(12, 2) DEFAULT 0,
            referencia VARCHAR(100),
            creado_por INTEGER REFERENCES usuarios(id),
            fecha_hora DATETIME DEFAULT CURRENT_TIMESTAMP
        );
        """)
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_pagos_pedido ON pagos(pedido_id);")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_pagos_fecha ON pagos(fecha_hora);")

        # 2. Tabla AUDITORIA_EVENTOS (Anti-fraude y trazabilidad inmutable)
        print("2. Creando tabla 'auditoria_eventos'...")
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS auditoria_eventos (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            usuario_id INTEGER REFERENCES usuarios(id),
            accion VARCHAR(100) NOT NULL, -- ANULACION_PEDIDO, CAMBIO_PRECIO, REAPERTURA_MESA, AJUSTE_STOCK, CIERRE_CAJA
            tabla_afectada VARCHAR(50) NOT NULL,
            registro_id INTEGER,
            valor_anterior TEXT,
            valor_nuevo TEXT,
            motivo TEXT,
            ip_address VARCHAR(50),
            fecha_hora DATETIME DEFAULT CURRENT_TIMESTAMP
        );
        """)
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_audit_accion_fecha ON auditoria_eventos(accion, fecha_hora);")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_audit_usuario ON auditoria_eventos(usuario_id);")

        # 3. Tablas INSUMOS y RECETAS_PRODUCTO (Escandallos y coctelería)
        print("3. Creando tablas 'insumos' y 'recetas_producto'...")
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS insumos (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nombre VARCHAR(150) NOT NULL UNIQUE,
            unidad_medida VARCHAR(20) NOT NULL, -- ml, oz, gr, unidad
            stock_actual NUMERIC(12, 2) DEFAULT 0,
            stock_minimo NUMERIC(12, 2) DEFAULT 0,
            costo_unitario NUMERIC(12, 2) DEFAULT 0,
            activo BOOLEAN DEFAULT 1,
            is_deleted BOOLEAN DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
        """)

        cursor.execute("""
        CREATE TABLE IF NOT EXISTS recetas_producto (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            producto_id INTEGER NOT NULL REFERENCES productos(id),
            insumo_id INTEGER NOT NULL REFERENCES insumos(id),
            cantidad_requerida NUMERIC(10, 2) NOT NULL, -- ej: 50 ml de ron para un mojito
            UNIQUE(producto_id, insumo_id)
        );
        """)
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_recetas_lookup ON recetas_producto(producto_id, insumo_id);")

        # 4. Tabla MOVIMIENTOS_CAJA (Entradas y Salidas de caja chica durante el turno)
        print("4. Creando tabla 'movimientos_caja'...")
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS movimientos_caja (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            turno_id INTEGER NOT NULL REFERENCES turnos(id),
            tipo VARCHAR(20) NOT NULL, -- 'entrada' (ingreso adicional) o 'salida' (gasto/egreso)
            concepto VARCHAR(255) NOT NULL, -- 'Compra hielo', 'Pago taxi mesera', 'Cambio monedas'
            monto NUMERIC(12, 2) NOT NULL,
            autorizado_por INTEGER REFERENCES usuarios(id),
            fecha_hora DATETIME DEFAULT CURRENT_TIMESTAMP
        );
        """)
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_mov_caja_turno ON movimientos_caja(turno_id);")

        # 5. Agregar columnas updated_at, is_deleted, deleted_at a tablas clave
        print("5. Agregando columnas 'updated_at' y 'is_deleted'...")
        
        def add_column_if_not_exists(table, column, col_type):
            cursor.execute(f"PRAGMA table_info({table})")
            cols = {col[1] for col in cursor.fetchall()}
            if column not in cols:
                print(f"  + Agregando {column} a {table}...")
                cursor.execute(f"ALTER TABLE {table} ADD COLUMN {column} {col_type}")

        # Productos
        add_column_if_not_exists("productos", "updated_at", "DATETIME")
        cursor.execute("UPDATE productos SET updated_at = CURRENT_TIMESTAMP WHERE updated_at IS NULL")
        add_column_if_not_exists("productos", "is_deleted", "BOOLEAN DEFAULT 0")
        add_column_if_not_exists("productos", "deleted_at", "DATETIME")

        # Categorías
        add_column_if_not_exists("categorias", "is_deleted", "BOOLEAN DEFAULT 0")

        # Mesas
        add_column_if_not_exists("mesas", "updated_at", "DATETIME")
        cursor.execute("UPDATE mesas SET updated_at = CURRENT_TIMESTAMP WHERE updated_at IS NULL")
        add_column_if_not_exists("mesas", "is_deleted", "BOOLEAN DEFAULT 0")

        # Pedidos
        add_column_if_not_exists("pedidos", "updated_at", "DATETIME")
        cursor.execute("UPDATE pedidos SET updated_at = CURRENT_TIMESTAMP WHERE updated_at IS NULL")

        # Turnos: columnas financieras para desglose exacto
        add_column_if_not_exists("turnos", "total_efectivo", "NUMERIC(12, 2) DEFAULT 0")
        add_column_if_not_exists("turnos", "total_tarjeta", "NUMERIC(12, 2) DEFAULT 0")
        add_column_if_not_exists("turnos", "total_transferencia", "NUMERIC(12, 2) DEFAULT 0")
        add_column_if_not_exists("turnos", "total_propinas", "NUMERIC(12, 2) DEFAULT 0")
        add_column_if_not_exists("turnos", "diferencia", "NUMERIC(12, 2) DEFAULT 0") # Sobrante (+) o Faltante (-)

        conn.commit()
        print("✅ Migración avanzada aplicada exitosamente!")
        return True

    except Exception as e:
        conn.rollback()
        print(f"❌ Error durante la migración avanzada: {e}")
        return False
    finally:
        conn.close()

if __name__ == "__main__":
    success = run_advanced_migration()
    sys.exit(0 if success else 1)
