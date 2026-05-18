from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from typing import Optional
import backend.db as db
from backend.data.wildemount import FACTIONS, REGIONS, DEITIES, PLOT_SEEDS, SUBCLASSES

router = APIRouter(prefix="/api/lore", tags=["lore"])

class LoreIn(BaseModel):
    campaign_id: Optional[int] = None; title: str
    category: str = "misc"; content: Optional[str] = None; tags: str = ""

@router.get("/")
def list_lore(campaign_id: Optional[int] = Query(None), category: Optional[str] = Query(None)):
    if campaign_id and category:
        return db.fetchall("SELECT * FROM lore_entries WHERE campaign_id=? AND category=? ORDER BY title", (campaign_id, category))
    if campaign_id:
        return db.fetchall("SELECT * FROM lore_entries WHERE campaign_id=? ORDER BY category,title", (campaign_id,))
    return db.fetchall("SELECT * FROM lore_entries ORDER BY category,title")

@router.post("/", status_code=201)
def create_lore(body: LoreIn):
    id_ = db.execute("INSERT INTO lore_entries (campaign_id,title,category,content,tags) VALUES (?,?,?,?,?)",
                     (body.campaign_id, body.title, body.category, body.content, body.tags))
    return db.fetchone("SELECT * FROM lore_entries WHERE id=?", (id_,))

@router.get("/wildemount")
def wildemount_reference():
    """Return the canonical Wildemount reference data."""
    return {
        "factions":    FACTIONS,
        "regions":     REGIONS,
        "deities":     DEITIES,
        "subclasses":  SUBCLASSES,
        "plot_seeds":  PLOT_SEEDS,
    }

@router.get("/{lid}")
def get_lore(lid: int):
    row = db.fetchone("SELECT * FROM lore_entries WHERE id=?", (lid,))
    if not row: raise HTTPException(404)
    return row

@router.put("/{lid}")
def update_lore(lid: int, body: LoreIn):
    db.execute("UPDATE lore_entries SET title=?,category=?,content=?,tags=? WHERE id=?",
               (body.title, body.category, body.content, body.tags, lid))
    return db.fetchone("SELECT * FROM lore_entries WHERE id=?", (lid,))

@router.delete("/{lid}", status_code=204)
def delete_lore(lid: int):
    db.execute("DELETE FROM lore_entries WHERE id=?", (lid,))
