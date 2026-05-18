from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
import backend.db as db

router = APIRouter(prefix="/api/campaigns", tags=["campaigns"])

class CampaignIn(BaseModel):
    name: str
    setting: str = "Wildemount"
    description: Optional[str] = None

@router.get("/")
def list_campaigns():
    return db.fetchall("SELECT * FROM campaigns ORDER BY created_at DESC")

@router.post("/", status_code=201)
def create_campaign(body: CampaignIn):
    id_ = db.execute("INSERT INTO campaigns (name, setting, description) VALUES (?,?,?)",
                     (body.name, body.setting, body.description))
    return db.fetchone("SELECT * FROM campaigns WHERE id=?", (id_,))

@router.get("/{cid}")
def get_campaign(cid: int):
    row = db.fetchone("SELECT * FROM campaigns WHERE id=?", (cid,))
    if not row:
        raise HTTPException(404, "Campaign not found")
    return row

@router.put("/{cid}")
def update_campaign(cid: int, body: CampaignIn):
    db.execute("UPDATE campaigns SET name=?, setting=?, description=? WHERE id=?",
               (body.name, body.setting, body.description, cid))
    return db.fetchone("SELECT * FROM campaigns WHERE id=?", (cid,))

@router.delete("/{cid}", status_code=204)
def delete_campaign(cid: int):
    db.execute("DELETE FROM campaigns WHERE id=?", (cid,))
