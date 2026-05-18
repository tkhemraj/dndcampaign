from __future__ import annotations
from contextlib import asynccontextmanager
from pathlib import Path
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
import backend.db as db
from backend.routers import campaigns, npcs, quests, encounters, maps, lore

FRONTEND = Path(__file__).parent.parent / "frontend"

@asynccontextmanager
async def lifespan(app: FastAPI):
    db.init("./dndcampaign.db")
    yield

app = FastAPI(title="D&D Campaign Generator", lifespan=lifespan)

for router in (campaigns.router, npcs.router, quests.router, encounters.router, maps.router, lore.router):
    app.include_router(router)

app.mount("/static", StaticFiles(directory=str(FRONTEND)), name="static")

@app.get("/", include_in_schema=False)
async def index():
    return FileResponse(str(FRONTEND / "index.html"))
