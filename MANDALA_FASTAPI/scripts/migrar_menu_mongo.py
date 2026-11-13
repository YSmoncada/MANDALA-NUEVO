"""
PILAR 3 & CASO DE ESTUDIO SAKILA / STREAMING:
Script de Migración y Sincronización Idempotente desde PostgreSQL/SQLite hacia MongoDB.

Transforma filas relacionales normalizadas (productos + categorías) en Documentos BSON
desnormalizados enriquecidos con datos no estructurados de coctelería y maridaje.
"""
import sys
import os
import json
from decimal import Decimal

# Asegurar path de importación
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy.orm import joinedload
from db.database import SessionLocal
from db import models
from db.mongo import get_mongo_db, is_mongo_connected

# Diccionario de enriquecimiento de datos no estructurados (Atributos flexibles NoSQL)
METADATOS_COCTELERIA = {
    "Cerveza Corona": {
        "descripcion": "Cerveza clara tipo Pilsner de origen mexicano, suave y refrescante.",
        "detalles_bebida": {"grados_alcohol": 4.5, "temperatura_ideal": "3°C - 5°C", "presentacion": "Botella 355ml"},
        "ingredientes": ["Cebada malteada", "Lúpulo", "Agua purificada", "Maíz"],
        "maridaje": ["Nachos con queso", "Ceviche de camarón", "Alitas BBQ"],
        "tags": ["cerveza", "importada", "refrescante", "corona", "suave"],
        "reviews_destacadas": [{"usuario": "carlos_m", "estrellas": 5, "comentario": "Siempre fría y con limón, perfecta."}]
    },
    "Cerveza Aguila": {
        "descripcion": "La cerveza clásica tradicional de Colombia, balanceada y con cuerpo medio.",
        "detalles_bebida": {"grados_alcohol": 4.0, "temperatura_ideal": "2°C - 4°C", "presentacion": "Botella 330ml"},
        "ingredientes": ["Cebada malteada", "Lúpulo", "Arroz", "Agua purificada"],
        "maridaje": ["Picadas mixtas", "Empanaditas de carne", "Chicharrón"],
        "tags": ["cerveza", "nacional", "popular", "clasica", "aguila"],
        "reviews_destacadas": [{"usuario": "andres_b", "estrellas": 4, "comentario": "Infaltable en toda noche de rumba."}]
    },
    "Aguila Light": {
        "descripcion": "Cerveza baja en calorías, ligera y fácil de tomar durante toda la noche.",
        "detalles_bebida": {"grados_alcohol": 3.4, "temperatura_ideal": "2°C - 4°C", "presentacion": "Botella 330ml"},
        "ingredientes": ["Cebada malteada", "Lúpulo seleccionado", "Agua purificada"],
        "maridaje": ["Tacos ligeros", "Papas bravas"],
        "tags": ["cerveza", "light", "baja en calorias", "nacional"],
        "reviews_destacadas": [{"usuario": "valen_g", "estrellas": 5, "comentario": "Mi favorita para no embriagarme rápido."}]
    },
    "Aguardiente Amarillo": {
        "descripcion": "El legendario pionero de Manizales desde 1885. Fórmula tradicional sin azúcar y con anís suave.",
        "detalles_bebida": {"grados_alcohol": 24.0, "temperatura_ideal": "Shot frío", "presentacion": "Botella 750ml"},
        "ingredientes": ["Alcohol extraneutro de caña", "Anís natural sembrado", "Agua de cordillera"],
        "maridaje": ["Picada criolla", "Ceviche de chicharrón", "Frutas cítricas"],
        "tags": ["aguardiente", "licor", "nacional", "popular", "shots", "amarillo", "sin azucar"],
        "reviews_destacadas": [
            {"usuario": "yoiner_l", "estrellas": 5, "comentario": "Pasa suave y no da guayabo, el mejor para la mesa."}
        ]
    },
    "Aguardiente Néctar": {
        "descripcion": "Aguardiente tradicional de Cundinamarca, notas secas y anisadas.",
        "detalles_bebida": {"grados_alcohol": 24.0, "temperatura_ideal": "Temperatura ambiente o frío", "presentacion": "Botella 750ml"},
        "ingredientes": ["Alcohol de caña", "Esencia de anís verde", "Agua purificada"],
        "maridaje": ["Carnes frías", "Chicharrón"],
        "tags": ["aguardiente", "licor", "cundinamarca", "nectar", "tradicional"],
        "reviews_destacadas": [{"usuario": "maria_j", "estrellas": 4, "comentario": "Clásico de la casa."}]
    },
    "Buchanans Deluxe": {
        "descripcion": "Whisky escocés añejado por un mínimo de 12 años en barricas de roble europeo y americano.",
        "detalles_bebida": {"grados_alcohol": 40.0, "temperatura_ideal": "En las rocas o con agua mineral", "presentacion": "Botella 750ml"},
        "ingredientes": ["Cebada malteada escocesa", "Granos seleccionados", "Agua pura de manantial"],
        "maridaje": ["Cortes de carne madurados", "Chocolates amargos 70%", "Quesos fuertes"],
        "tags": ["whisky", "scotch", "premium", "buchanans", "12 años", "vip"],
        "reviews_destacadas": [{"usuario": "kemer_g", "estrellas": 5, "comentario": "Elegante y con notas ahumadas perfectas para celebrar."}]
    },
    "Bacardi Limón": {
        "descripcion": "Ron blanco infusionado con notas naturales de limón italiano, toronja y lima.",
        "detalles_bebida": {"grados_alcohol": 32.0, "temperatura_ideal": "Con hielo y gaseosa de lima-limón", "presentacion": "Botella 750ml"},
        "ingredientes": ["Ron Bacardi Carta Blanca", "Esencia natural de cítricos"],
        "maridaje": ["Alitas picantes", "Dips de queso crema"],
        "tags": ["ron", "citrico", "cocteles", "bacardi", "refrescante"],
        "reviews_destacadas": [{"usuario": "camila_t", "estrellas": 5, "comentario": "Sabe a verano, me encanta en cóctel."}]
    }
}

def construir_documento_menu(prod: models.Producto) -> dict:
    nombre_limpio = prod.nombre.strip() if prod.nombre else "Producto"
    cat_nombre = prod.rel_categoria.nombre if prod.rel_categoria else "General"
    
    # Buscar metadatos enriquecidos o generar plantilla por defecto
    meta = METADATOS_COCTELERIA.get(nombre_limpio, {
        "descripcion": f"Producto selecto de nuestra categoría {cat_nombre}.",
        "detalles_bebida": {"presentacion": "Porción estándar"},
        "ingredientes": ["Ingredientes seleccionados de la casa"],
        "maridaje": ["Pregunte a su mesero por las mejores sugerencias"],
        "tags": [cat_nombre.lower(), "gastrobar", "mandala"],
        "reviews_destacadas": []
    })

    doc = {
        "_id": prod.id,  # Unificación de llaves: El mismo ID relacional une SQL y MongoDB
        "nombre": nombre_limpio,
        "precio": float(prod.precio or 0.0),
        "categoria": cat_nombre,
        "categoria_id": prod.categoria,
        "activo": bool(prod.activo),
        "imagen": prod.imagen,
        "descripcion": meta.get("descripcion", ""),
        "detalles_bebida": meta.get("detalles_bebida", {}),
        "ingredientes": meta.get("ingredientes", []),
        "maridaje": meta.get("maridaje", []),
        "tags": meta.get("tags", []),
        "reviews_destacadas": meta.get("reviews_destacadas", [])
    }
    return doc

def ejecutar_migracion():
    print("="*70)
    print(" 🚀 PILAR 3: MIGRACIÓN Y SINCRONIZACIÓN POLÍGLOTA SQL ➔ MONGODB")
    print("="*70)
    
    db_sql = SessionLocal()
    try:
        # 1. Leer catálogo completo desde SQL relacional con joinedload (Cero N+1)
        productos = db_sql.query(models.Producto).options(
            joinedload(models.Producto.rel_categoria)
        ).all()
        print(f"[*] Extraídos {len(productos)} productos desde la base de datos relacional.")

        documentos = [construir_documento_menu(p) for p in productos]

        # 2. Guardar backup en formato JSON local para inspección académica
        export_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "db", "mongo_menu_export.json")
        os.makedirs(os.path.dirname(export_path), exist_ok=True)
        with open(export_path, "w", encoding="utf-8") as f:
            json.dump(documentos, f, indent=2, ensure_ascii=False)
        print(f"[✓] Documentos exportados a archivo BSON/JSON en: {os.path.relpath(export_path)}")

        # 3. Sincronizar hacia MongoDB si el motor está disponible
        mongo_db = get_mongo_db()
        if mongo_db is not None:
            from pymongo import UpdateOne
            coleccion = mongo_db["menu_digital"]
            
            # Operaciones bulk con upsert garantizando Idempotencia estricta
            operaciones = [
                UpdateOne({"_id": doc["_id"]}, {"$set": doc}, upsert=True)
                for doc in documentos
            ]
            resultado = coleccion.bulk_write(operaciones)
            print(f"[✓] Sincronización exitosa con MongoDB: {resultado.upserted_count} insertados, {resultado.modified_count} actualizados.")

            # 4. Crear Índices de Texto y Multikey en MongoDB
            coleccion.create_index([("nombre", "text"), ("tags", "text"), ("descripcion", "text")])
            coleccion.create_index("categoria")
            coleccion.create_index("tags")
            print("[✓] Índices de texto ($text) y multikey creados exitosamente en colección 'menu_digital'.")
        else:
            print("[i] MongoDB no está activo localmente en el puerto 27017.")
            print("    Los documentos BSON quedaron generados y listos en 'db/mongo_menu_export.json'.")
            print("    La API FastAPI utilizará fallback relacional automático sin interrupciones.")

        print("="*70)
        print(" [✓] PROCESO DE MIGRACIÓN COMPLETADO CON ÉXITO")
        print("="*70)
    finally:
        db_sql.close()

if __name__ == "__main__":
    ejecutar_migracion()
