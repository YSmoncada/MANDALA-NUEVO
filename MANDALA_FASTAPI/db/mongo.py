"""
PILAR 3: BASES DE DATOS NOSQL Y PERSISTENCIA POLÍGLOTA
Módulo de integración con MongoDB para el catálogo desnormalizado del Menú Digital.

Ventajas del modelo NoSQL en este caso:
- Desnormalización: Ingredientes, notas de coctelería, alérgenos y maridajes viven en 1 solo documento.
- Cero JOINs: Lecturas ultra rápidas para comensales concurrentes escaneando el QR.
- Aislamiento de carga: La navegación del menú no compite por conexiones con la caja registradora en SQL.
"""
import os
import logging
from typing import Optional

logger = logging.getLogger("mandala.mongo")

# Cargar automáticamente variables de entorno desde .env si existe
_env_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), ".env")
if os.path.exists(_env_path):
    try:
        with open(_env_path, "r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith("#") and "=" in line:
                    k, v = line.split("=", 1)
                    k = k.strip()
                    v = v.strip().strip('"').strip("'")
                    if k not in os.environ:
                        os.environ[k] = v
    except Exception as e:
        logger.debug(f"No se pudo parsear .env: {e}")

# URI configurable vía variable de entorno (soporta local o MongoDB Atlas en la nube)
MONGODB_URI = os.getenv("MONGODB_URI", "mongodb://localhost:27017")
DB_NAME = os.getenv("MONGODB_DB_NAME", "mandala_nosql")

_client = None
_db = None
_mongo_available = None

def get_mongo_client():
    global _client, _mongo_available
    if _client is not None:
        return _client
    try:
        from pymongo import MongoClient
        # Timeout corto (1.5 segundos) para no congelar la app si MongoDB no está corriendo
        client = MongoClient(MONGODB_URI, serverSelectionTimeoutMS=1500)
        client.admin.command('ping')
        _client = client
        _mongo_available = True
        logger.info(f"[MongoDB] Conexión establecida exitosamente con {MONGODB_URI}/{DB_NAME}")
        return _client
    except Exception as e:
        _mongo_available = False
        logger.warning(f"[MongoDB] No se pudo conectar a MongoDB ({e}). Modo fallback relacional activo.")
        return None

def get_mongo_db():
    global _db
    if _db is not None:
        return _db
    client = get_mongo_client()
    if client:
        _db = client[DB_NAME]
        return _db
    return None

def is_mongo_connected() -> bool:
    global _mongo_available
    if _mongo_available is None:
        get_mongo_client()
    return bool(_mongo_available)
