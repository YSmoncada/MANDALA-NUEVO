from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import os

current_dir = os.path.dirname(os.path.abspath(__file__))
# Ruta absoluta siempre en MANDALA_FASTAPI/mandala_v2.db sin importar desde dónde se inicie Python
default_sqlite_path = os.path.abspath(os.path.join(current_dir, "..", "mandala_v2.db"))
SQLALCHEMY_DATABASE_URL = os.getenv("DATABASE_URL", f"sqlite:///{default_sqlite_path}")

# Corregir URL de Render/Heroku (postgres:// -> postgresql://)
if SQLALCHEMY_DATABASE_URL.startswith("postgres://"):
    SQLALCHEMY_DATABASE_URL = SQLALCHEMY_DATABASE_URL.replace("postgres://", "postgresql://", 1)

# ==============================================================================
# PILAR 1: CONECTIVIDAD BACKEND (ORM) & CONNECTION POOLING
# - pool_size: Conexiones persistentes en memoria para atender tráfico recurrente
# - max_overflow: Conexiones adicionales permitidas durante picos nocturnos del bar
# - pool_recycle: Reciclar conexiones cada 30 min para evitar desconexiones de socket
# - pool_pre_ping: Comprueba la salud de la conexión antes de entregarla al request
# ==============================================================================
is_sqlite = "sqlite" in SQLALCHEMY_DATABASE_URL
engine_kwargs = {
    "pool_pre_ping": True,
}

if is_sqlite:
    engine_kwargs["connect_args"] = {"check_same_thread": False}
else:
    # Configuración de Connection Pool para motores cliente-servidor (PostgreSQL / MySQL)
    engine_kwargs["pool_size"] = int(os.getenv("DB_POOL_SIZE", "10"))
    engine_kwargs["max_overflow"] = int(os.getenv("DB_MAX_OVERFLOW", "20"))
    engine_kwargs["pool_recycle"] = int(os.getenv("DB_POOL_RECYCLE", "1800"))

engine = create_engine(SQLALCHEMY_DATABASE_URL, **engine_kwargs)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
