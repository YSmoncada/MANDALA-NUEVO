from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import HTMLResponse
from sqlalchemy.orm import Session, joinedload
from typing import List, Optional
import os
import time
import json
import logging

from db import models
from db.mongo import get_mongo_db, is_mongo_connected
from api import deps
from api.endpoints.mesas import assign_waiter

logger = logging.getLogger("mandala.menu_cliente")
router = APIRouter()

@router.get("/menu/{mesa_id}", response_class=HTMLResponse)
@router.get("/menu/{mesa_id}/", response_class=HTMLResponse)
def render_menu_cliente(mesa_id: int, db: Session = Depends(deps.get_db)):
    mesa = db.query(models.Mesa).filter(models.Mesa.id == mesa_id).first()
    if not mesa:
        return HTMLResponse(
            content="""
            <!DOCTYPE html>
            <html lang="es">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Mesa no encontrada - NoxOS</title>
                <style>
                    body {
                        background-color: #080511;
                        color: #FFFFFF;
                        font-family: system-ui, -apple-system, sans-serif;
                        display: flex;
                        flex-direction: column;
                        align-items: center;
                        justify-content: center;
                        height: 100vh;
                        margin: 0;
                        text-align: center;
                        padding: 20px;
                    }
                    .icon { font-size: 54px; margin-bottom: 16px; }
                    h1 { font-size: 24px; font-weight: 800; margin-bottom: 8px; }
                    p { color: #8A7BAF; font-size: 14px; max-width: 320px; }
                </style>
            </head>
            <body>
                <div class="icon">🔍</div>
                <h1>Mesa no encontrada</h1>
                <p>El código QR escaneado no corresponde a una mesa activa del establecimiento.</p>
            </body>
            </html>
            """,
            status_code=404
        )
    
    # Asignar mesero de forma uniforme si aún no tiene asignado
    if not mesa.mesero_id:
        assign_waiter(db, mesa)
        
    mesero_nombre = "Equipo Mandala"
    if mesa.rel_mesero:
        if mesa.rel_mesero.nombre_completo:
            mesero_nombre = mesa.rel_mesero.nombre_completo
        else:
            mesero_nombre = mesa.rel_mesero.username.capitalize()
        
    # Cargar template HTML
    current_dir = os.path.dirname(os.path.abspath(__file__))
    base_dir = os.path.dirname(os.path.dirname(current_dir))
    template_path = os.path.join(base_dir, "templates", "menu_cliente.html")
    
    if not os.path.exists(template_path):
        raise HTTPException(status_code=500, detail="Plantilla de menú digital no encontrada en el servidor")
        
    with open(template_path, "r", encoding="utf-8") as f:
        html = f.read()
        
    # Reemplazar variables del template
    html = html.replace("{{MESA_ID}}", str(mesa.id))
    html = html.replace("{{MESA_NUMERO}}", str(mesa.numero))
    html = html.replace("{{MESERO_NOMBRE}}", mesero_nombre)
    
    return HTMLResponse(content=html, status_code=200)

# ==============================================================================
# PILAR 3: ENDPOINT HÍBRIDO POLÍGLOTA - CATÁLOGO DESNORMALIZADO EN MONGODB
# ==============================================================================
@router.get("/menu/digital/catalogo/")
def get_catalogo_digital_hibrido(
    q: Optional[str] = Query(None, description="Búsqueda de texto completo (reemplaza LIKE con $text)"),
    tag: Optional[str] = Query(None, description="Filtrado por etiqueta multikey"),
    categoria: Optional[str] = Query(None, description="Filtrar por categoría"),
    db_sql: Session = Depends(deps.get_db)
):
    """
    Retorna el menú digital enriquecido para la app móvil y clientes QR.
    - Si MongoDB está disponible: resuelve la carta en 1 sola lectura sin JOINs (BASE).
    - Si MongoDB no está corriendo: utiliza fallback relacional con Eager Loading.
    """
    t_start = time.perf_counter()
    mongo_db = get_mongo_db()

    # RUTA A: Lectura desde NoSQL Documental (MongoDB)
    if mongo_db is not None:
        try:
            filtro = {"activo": True}
            if q:
                filtro["$text"] = {"$search": q}
            if tag:
                filtro["tags"] = tag.lower()
            if categoria:
                filtro["categoria"] = {"$regex": f"^{categoria}$", "$options": "i"}

            docs = list(mongo_db["menu_digital"].find(filtro))
            # Normalizar _id a entero o string para respuesta JSON
            for d in docs:
                d["id"] = d.get("_id")

            duracion_ms = round((time.perf_counter() - t_start) * 1000, 3)
            return {
                "status": "success",
                "motor": "MongoDB (NoSQL Documental)",
                "latencia_ms": duracion_ms,
                "arquitectura": "Persistencia Políglota - Catálogo Desnormalizado",
                "total_productos": len(docs),
                "productos": docs
            }
        except Exception as e:
            logger.warning(f"Error consultando MongoDB: {e}. Activando fallback relacional.")

    # RUTA B: Fallback Relacional (SQL)
    query = db_sql.query(models.Producto).options(
        joinedload(models.Producto.rel_categoria)
    ).filter(models.Producto.activo == True)

    if categoria:
        query = query.join(models.Categoria).filter(models.Categoria.nombre.ilike(categoria))

    prods_sql = query.all()
    # Enriquecer con archivo exportado si existe
    export_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "db", "mongo_menu_export.json")
    meta_cache = {}
    if os.path.exists(export_path):
        try:
            with open(export_path, "r", encoding="utf-8") as f:
                meta_cache = {d["_id"]: d for d in json.load(f)}
        except Exception:
            pass

    resultado = []
    for p in prods_sql:
        enriched = meta_cache.get(p.id, {
            "id": p.id,
            "nombre": p.nombre,
            "precio": float(p.precio or 0),
            "categoria": p.rel_categoria.nombre if p.rel_categoria else "General",
            "detalles_bebida": {},
            "tags": [],
            "ingredientes": []
        })
        resultado.append(enriched)

    duracion_ms = round((time.perf_counter() - t_start) * 1000, 3)
    return {
        "status": "success",
        "motor": "SQL Relacional (Fallback Activo)",
        "latencia_ms": duracion_ms,
        "arquitectura": "Persistencia Políglota - Modo Resiliencia",
        "total_productos": len(resultado),
        "productos": resultado
    }

