from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from typing import Optional
import backend.db as db
from backend.generators import quest_gen

router = APIRouter(prefix="/api/quests", tags=["quests"])

class QuestIn(BaseModel):
    campaign_id: Optional[int] = None; title: str
    description: Optional[str] = None; faction: Optional[str] = None
    region: Optional[str] = None; difficulty: str = "medium"
    status: str = "active"; reward: Optional[str] = None; notes: Optional[str] = None

_COLS = ("campaign_id","title","description","faction","region","difficulty","status","reward","notes")

@router.get("/")
def list_quests(campaign_id: Optional[int] = Query(None), status: Optional[str] = Query(None)):
    if campaign_id and status:
        return db.fetchall("SELECT * FROM quests WHERE campaign_id=? AND status=? ORDER BY created_at DESC", (campaign_id, status))
    if campaign_id:
        return db.fetchall("SELECT * FROM quests WHERE campaign_id=? ORDER BY created_at DESC", (campaign_id,))
    return db.fetchall("SELECT * FROM quests ORDER BY created_at DESC")

@router.post("/", status_code=201)
def create_quest(body: QuestIn):
    vals = tuple(getattr(body, c) for c in _COLS)
    id_ = db.execute(f"INSERT INTO quests ({','.join(_COLS)}) VALUES ({','.join(['?']*len(_COLS))})", vals)
    return db.fetchone("SELECT * FROM quests WHERE id=?", (id_,))

@router.get("/generate")
def generate_quest(campaign_id: Optional[int] = Query(None), region: Optional[str] = Query(None), faction: Optional[str] = Query(None)):
    return quest_gen.generate(campaign_id, region, faction)

@router.get("/{qid}")
def get_quest(qid: int):
    row = db.fetchone("SELECT * FROM quests WHERE id=?", (qid,))
    if not row: raise HTTPException(404)
    return row

@router.put("/{qid}")
def update_quest(qid: int, body: QuestIn):
    sets = ", ".join(f"{c}=?" for c in _COLS)
    db.execute(f"UPDATE quests SET {sets} WHERE id=?", tuple(getattr(body, c) for c in _COLS) + (qid,))
    return db.fetchone("SELECT * FROM quests WHERE id=?", (qid,))

@router.delete("/{qid}", status_code=204)
def delete_quest(qid: int):
    db.execute("DELETE FROM quests WHERE id=?", (qid,))
