from __future__ import annotations
from fastapi import APIRouter, Request
from fastapi.responses import StreamingResponse
import json, asyncio

router = APIRouter(prefix="/api/live", tags=["live"])

_state: dict = {"map": None, "encounter": None}
_queues: list[asyncio.Queue] = []


@router.get("/state")
async def get_state():
    return _state


@router.get("/stream")
async def sse_stream(request: Request):
    q: asyncio.Queue = asyncio.Queue()
    _queues.append(q)

    async def gen():
        try:
            yield f"data: {json.dumps(_state)}\n\n"
            while True:
                if await request.is_disconnected():
                    break
                try:
                    msg = await asyncio.wait_for(q.get(), timeout=25)
                    yield msg
                except asyncio.TimeoutError:
                    yield ": keepalive\n\n"
        finally:
            if q in _queues:
                _queues.remove(q)

    return StreamingResponse(
        gen(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


@router.post("/broadcast")
async def broadcast(payload: dict):
    for k, v in payload.items():
        _state[k] = v
    msg = f"data: {json.dumps(_state)}\n\n"
    for q in list(_queues):
        q.put_nowait(msg)
    return {"ok": True, "subscribers": len(_queues)}
