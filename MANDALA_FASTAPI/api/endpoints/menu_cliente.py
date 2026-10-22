from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import HTMLResponse
from sqlalchemy.orm import Session
import os
import logging

from db import models
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
    
    # Asignar mesero de forma uniforme si aún no tiene asignado o si la mesa estaba libre
    estado_ocupada = db.query(models.EstadoMesa).filter(models.EstadoMesa.nombre.ilike("Ocupada")).first()
    ocupada_id = estado_ocupada.id if estado_ocupada else None
    
    if not mesa.mesero_id or (ocupada_id and mesa.estado != ocupada_id):
        assign_waiter(db, mesa)
        
    mesero_nombre = "Equipo Mandala"
    if mesa.rel_mesero:
        if mesa.rel_mesero.nombre_completo and mesa.rel_mesero.nombre_completo != "Mesera de Turno":
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
