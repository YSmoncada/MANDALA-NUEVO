"""
WebSocket Manager — Mandala
Gestiona conexiones en tiempo real para notificaciones entre roles.

Rooms disponibles:
  - "bartender" : recibe avisos de pedidos nuevos/actualizados
  - "mesera"    : recibe confirmación de despacho
  - "admin"     : recibe todo
"""
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from typing import Dict, List
import json
import logging

logger = logging.getLogger("mandala.ws")
router = APIRouter()


class ConnectionManager:
    def __init__(self):
        # Diccionario: room -> lista de conexiones activas
        self._rooms: Dict[str, List[WebSocket]] = {}

    def _get_room(self, room: str) -> List[WebSocket]:
        if room not in self._rooms:
            self._rooms[room] = []
        return self._rooms[room]

    async def connect(self, websocket: WebSocket, room: str):
        await websocket.accept()
        self._get_room(room).append(websocket)
        logger.info(f"WS: nueva conexión en room '{room}'. Total en room: {len(self._rooms[room])}")

    def disconnect(self, websocket: WebSocket, room: str):
        connections = self._get_room(room)
        if websocket in connections:
            connections.remove(websocket)
        logger.info(f"WS: desconexión de room '{room}'. Quedan: {len(connections)}")

    async def broadcast(self, room: str, message: dict):
        """Envía un mensaje a todos los clientes conectados en un room."""
        connections = self._get_room(room)
        dead_connections = []
        for ws in connections:
            try:
                await ws.send_text(json.dumps(message, ensure_ascii=False))
            except Exception as e:
                logger.warning(f"WS: error al enviar a conexión en '{room}': {e}")
                dead_connections.append(ws)

        # Limpiar conexiones muertas
        for dead in dead_connections:
            self.disconnect(dead, room)

    async def broadcast_all(self, message: dict):
        """Envía un mensaje a todos los rooms activos."""
        for room in list(self._rooms.keys()):
            await self.broadcast(room, message)


# Instancia global — importada por pedidos.py para emitir eventos
manager = ConnectionManager()

VALID_ROOMS = {"bartender", "mesera", "admin"}


@router.websocket("/ws/{room}")
async def websocket_endpoint(websocket: WebSocket, room: str):
    """
    Endpoint WebSocket.
    Uso: ws://<host>/api/ws/<room>
    Rooms válidos: bartender, mesera, admin
    """
    if room not in VALID_ROOMS:
        await websocket.close(code=4004, reason=f"Room '{room}' no válido")
        return

    await manager.connect(websocket, room)
    try:
        # Mantener la conexión viva — el cliente puede enviar pings
        while True:
            data = await websocket.receive_text()
            # Por ahora solo aceptamos pings del cliente para keepalive
            if data == "ping":
                await websocket.send_text("pong")
    except WebSocketDisconnect:
        manager.disconnect(websocket, room)
