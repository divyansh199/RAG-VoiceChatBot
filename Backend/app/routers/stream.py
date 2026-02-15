import uuid
from typing import Dict, Any
from fastapi import APIRouter, WebSocket, Request, WebSocketDisconnect, HTTPException, status
from loguru import logger
from bson import ObjectId

from app.bot import bot
from pipecat.runner.types import WebSocketRunnerArguments

from app.database import get_database
from app.config import settings

router = APIRouter()

@router.post("/connect")
async def bot_connect(request: Request)-> Dict[str, Any]:
    logger.info(f"Recived request connect from {request.client.host if request.client else 'unknown'}")

    try:
        body: Dict[str, Any] = await request.json()
        logger.info(f"Parsed request body: {body}, body keys: {list(body.keys())}")

    except Exception as e:

        try:
            body_content = await request.body()
            body_str = body_content.decode('utf-8', errors='ignore')[:200] if body_content else 'empty'
            logger.error(f"Faild to parse the request body: {e}, body content (first 200 chars): {body_str} ")

        except:
            logger.error(f"failed to parse request body: {e}, could not read the body content ")        


        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid json in request body: {str(e)}"
        )
    
    equipment_id: str = body.get("equipment_id", "")

    if not equipment_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid equipment_id format"
        )
    

    forwarded_host = request.headers.get("X-Forwarded-Host", "")
    if forwarded_host:
        host = forwarded_host
    else:
        host = request.url.netloc

    is_behind_alb = ".elb.amazonaws.com" in host or ".elb" in host

    forwarded_proto = request.headers.get("X-Forwarded-Proto", "")
    scheme = forwarded_proto if forwarded_proto else request.url.scheme
    if scheme == 'https':
        ws_scheme = "wss"
    else:
        ws_scheme = "ws"

    ws_url = f"{ws_scheme}://{host}/api/v1/stream/ws/{equipment_id}"
    
    return {"ws_url": ws_url, "equipment_id": equipment_id}


@router.websocket("/ws/{equipment_id}")
async def websocket_endpoint(websocket: WebSocket, equipment_id: str):
    await websocket.accept()

    logger.info(f"WebSocket connection accepted for equipment: {equipment_id}")

    try:
        db = get_database()
        equipment = await db.equipment.find_one({"_id": ObjectId(equipment_id)})

        if not equipment:

            logger.error(f"equipment {equipment_id} not found")
            await websocket.close(code=4004, reason="equipment not found")
            return   

        body = {

            "equipment_id": equipment_id,
            "tenant_id": settings.TENANT_ID,
            "session_id": str(uuid.uuid4()),
            "user_id": settings.USER_ID
        }   

        await bot(WebSocketRunnerArguments(
            websocket=websocket,
            body=body
        ))     


    except WebSocketDisconnect:
        logger.info("WebSocket disconnected")

    except Exception as e:
        logger.error(f"Error is stream handler: {e}")

        try:
            await websocket.close(code=1011, reason=str(e))

        except:
            pass


        

