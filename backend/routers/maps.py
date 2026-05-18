import json
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from typing import Optional
import backend.db as db
from backend.generators import map_gen

router = APIRouter(prefix="/api/maps", tags=["maps"])

class MapIn(BaseModel):
    campaign_id: Optional[int] = None; name: str
    map_type: str; subtype: Optional[str] = None
    width: int = 60; height: int = 40
    data: Optional[str] = None

@router.get("/")
def list_maps(campaign_id: Optional[int] = Query(None)):
    if campaign_id:
        return db.fetchall("SELECT id,campaign_id,name,map_type,subtype,width,height,created_at FROM maps WHERE campaign_id=? ORDER BY created_at DESC", (campaign_id,))
    return db.fetchall("SELECT id,campaign_id,name,map_type,subtype,width,height,created_at FROM maps ORDER BY created_at DESC")

@router.post("/generate", status_code=201)
def generate_map(
    campaign_id: Optional[int] = Query(None),
    name: str = Query("New Map"),
    map_type: str = Query("dungeon"),
    subtype: Optional[str] = Query(None),
    width: int = Query(60),
    height: int = Query(40),
    seed: Optional[int] = Query(None),
):
    result = map_gen.generate(map_type, subtype, width, height, seed)
    data_json = json.dumps(result.to_dict())
    id_ = db.execute(
        "INSERT INTO maps (campaign_id,name,map_type,subtype,width,height,data) VALUES (?,?,?,?,?,?,?)",
        (campaign_id, name, map_type, subtype or "", width, height, data_json))
    row = db.fetchone("SELECT * FROM maps WHERE id=?", (id_,))
    row["data"] = json.loads(row["data"])
    return row

@router.get("/types")
def map_types():
    return {
        "dungeon":    ["generic", "cave", "temple", "ruins_aeor"],
        "outdoor":    ["forest", "plains", "tundra", "badlands", "coastal", "jungle"],
        "interior":   ["tavern", "castle", "ship", "temple", "mansion"],
        "wildemount": ["xhorhas_wastes", "aeor_ruins", "rosohna_streets", "dwendalian_keep",
                       "menagerie_port", "savalirwood", "eiselcross_tundra",
                       "kryn_temple", "cerberus_lab", "cavern_bazzoxan"],
    }

@router.get("/{mid}")
def get_map(mid: int):
    row = db.fetchone("SELECT * FROM maps WHERE id=?", (mid,))
    if not row: raise HTTPException(404)
    row["data"] = json.loads(row["data"])
    return row

@router.delete("/{mid}", status_code=204)
def delete_map(mid: int):
    db.execute("DELETE FROM maps WHERE id=?", (mid,))
