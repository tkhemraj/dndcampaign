from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from typing import Optional
import backend.db as db
from backend.generators import npc_gen

router = APIRouter(prefix="/api/npcs", tags=["npcs"])

class NpcIn(BaseModel):
    campaign_id: Optional[int] = None
    name: str; race: Optional[str] = None; npc_class: Optional[str] = None
    level: int = 1; faction: Optional[str] = None; region: Optional[str] = None
    alignment: Optional[str] = None; personality: Optional[str] = None
    ideal: Optional[str] = None; bond: Optional[str] = None; flaw: Optional[str] = None
    backstory: Optional[str] = None; hp: Optional[int] = None; ac: Optional[int] = None
    str_score: Optional[int] = None; dex_score: Optional[int] = None
    con_score: Optional[int] = None; int_score: Optional[int] = None
    wis_score: Optional[int] = None; cha_score: Optional[int] = None
    notes: Optional[str] = None; status: str = "alive"

_COLS = ("campaign_id","name","race","npc_class","level","faction","region","alignment",
         "personality","ideal","bond","flaw","backstory","hp","ac",
         "str_score","dex_score","con_score","int_score","wis_score","cha_score","notes","status")

@router.get("/")
def list_npcs(campaign_id: Optional[int] = Query(None)):
    if campaign_id:
        return db.fetchall("SELECT * FROM npcs WHERE campaign_id=? ORDER BY name", (campaign_id,))
    return db.fetchall("SELECT * FROM npcs ORDER BY name")

@router.post("/", status_code=201)
def create_npc(body: NpcIn):
    vals = tuple(getattr(body, c) for c in _COLS)
    ph = ",".join(["?"] * len(_COLS))
    id_ = db.execute(f"INSERT INTO npcs ({','.join(_COLS)}) VALUES ({ph})", vals)
    return db.fetchone("SELECT * FROM npcs WHERE id=?", (id_,))

@router.get("/generate")
def generate_npc(
    campaign_id: Optional[int] = Query(None),
    region: Optional[str] = Query(None),
    faction: Optional[str] = Query(None),
):
    return npc_gen.generate(campaign_id, region, faction)

@router.get("/{nid}")
def get_npc(nid: int):
    row = db.fetchone("SELECT * FROM npcs WHERE id=?", (nid,))
    if not row: raise HTTPException(404, "NPC not found")
    return row

@router.put("/{nid}")
def update_npc(nid: int, body: NpcIn):
    sets = ", ".join(f"{c}=?" for c in _COLS)
    vals = tuple(getattr(body, c) for c in _COLS) + (nid,)
    db.execute(f"UPDATE npcs SET {sets} WHERE id=?", vals)
    return db.fetchone("SELECT * FROM npcs WHERE id=?", (nid,))

@router.delete("/{nid}", status_code=204)
def delete_npc(nid: int):
    db.execute("DELETE FROM npcs WHERE id=?", (nid,))
