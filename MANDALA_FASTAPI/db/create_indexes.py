"""
Script para asegurar la creación de índices avanzados y cubrientes en la base de datos de Mandala.
Alineado con el PILAR 2: Indexación Avanzada y Optimización de Consultas.
"""
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import text
from db.database import engine

def aplicar_indices():
    indices = [
        # 1. Índice compuesto respetando la Regla del Prefijo Izquierdo (Leftmost Prefix Rule)
        # Optimiza: WHERE turno_id = :t AND estado = :e  (y también consultas que solo filtren por turno_id)
        ("idx_pedidos_turno_estado", "CREATE INDEX IF NOT EXISTS idx_pedidos_turno_estado ON pedidos (turno_id, estado);"),
        
        # 2. Índice Cubriente (Covering Index) para Arqueo de Caja
        # Optimiza: SELECT SUM(total) FROM pedidos WHERE turno_id = :t AND estado != :e
        # Permite responder la consulta 100% en memoria B-Tree sin tocar el archivo de datos (Heap Fetches: 0)
        ("idx_pedidos_cierre_cubriente", "CREATE INDEX IF NOT EXISTS idx_pedidos_cierre_cubriente ON pedidos (turno_id, estado, total);"),
        
        # 3. Índice para filtrado temporal SARGable en Analítica y Dashboard
        # Optimiza: WHERE fecha_hora >= :inicio AND fecha_hora < :fin AND estado != 5
        ("idx_pedidos_fecha_estado", "CREATE INDEX IF NOT EXISTS idx_pedidos_fecha_estado ON pedidos (fecha_hora, estado);"),
        
        # 4. Índice de búsqueda de detalles de pedidos
        ("idx_pedido_prod_lookup", "CREATE INDEX IF NOT EXISTS idx_pedido_prod_lookup ON pedido_productos (pedido_id, producto_id);"),
        
        # 5. Índice de Kardex de movimientos de inventario por producto y fecha
        ("idx_mov_inv_prod_fecha", "CREATE INDEX IF NOT EXISTS idx_mov_inv_prod_fecha ON movimientos_inventario (producto_id, fecha);")
    ]
    
    with engine.begin() as conn:
        print("[*] Aplicando índices avanzados en la base de datos...")
        for nombre, ddl in indices:
            try:
                conn.execute(text(ddl))
                print(f"  [OK] Índice '{nombre}' verificado/creado con éxito.")
            except Exception as e:
                print(f"  [AVISO] No se pudo crear '{nombre}': {e}")
        print("[✓] Proceso de indexación completado exitosamente.\n")

if __name__ == "__main__":
    aplicar_indices()
