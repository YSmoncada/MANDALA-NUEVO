from sqlalchemy import inspect, text
from db.database import engine

def migrate():
    inspector = inspect(engine)
    
    # Verificación de la tabla 'turnos'
    # Base.metadata.create_all(engine) ya crea la tabla si no existe, 
    # pero para mayor seguridad lo dejamos así.
    
    print("Verificando tabla 'pedidos' para columna 'turno_id'...")
    try:
        tables = inspector.get_table_names()
        if 'pedidos' not in tables:
            print("Tabla 'pedidos' aún no existe, se creará con create_all.")
            return

        columns = [c['name'] for c in inspector.get_columns('pedidos')]
        
        if 'turno_id' not in columns:
            print("Añadiendo columna 'turno_id' a 'pedidos'...")
            with engine.connect() as conn:
                # SQL compatible con SQLite y PostgreSQL para añadir columna básica
                conn.execute(text("ALTER TABLE pedidos ADD COLUMN turno_id INTEGER"))
                conn.commit()
                print("Columna 'turno_id' añadida exitosamente.")
        else:
            print("La columna 'turno_id' ya existe en 'pedidos'.")
    except Exception as e:
        print(f"Verificación de migración omitida: {e}")

if __name__ == "__main__":
    migrate()
