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
