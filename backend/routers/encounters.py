from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from typing import Optional
import json
import backend.db as db
from backend.generators import encounter_gen

router = APIRouter(prefix="/api/encounters", tags=["encounters"])

class EncounterIn(BaseModel):
    campaign_id: Optional[int] = None; name: str
    difficulty: str = "medium"; status: str = "planned"
    map_id: Optional[int] = None; notes: Optional[str] = None

class CombatantIn(BaseModel):
    name: str; combatant_type: str = "monster"
    initiative: int = 0; hp: int = 1; max_hp: int = 1; ac: int = 10
    conditions: str = "[]"; notes: Optional[str] = None; sort_order: int = 0

class InitiativeUpdate(BaseModel):
    combatant_id: int; initiative: int

class HpUpdate(BaseModel):
    combatant_id: int; delta: int  # positive = heal, negative = damage

class ConditionUpdate(BaseModel):
    combatant_id: int; conditions: list[str]

@router.get("/")
def list_encounters(campaign_id: Optional[int] = Query(None)):
    if campaign_id:
        return db.fetchall("SELECT * FROM encounters WHERE campaign_id=? ORDER BY created_at DESC", (campaign_id,))
    return db.fetchall("SELECT * FROM encounters ORDER BY created_at DESC")

@router.post("/", status_code=201)
def create_encounter(body: EncounterIn):
    id_ = db.execute(
        "INSERT INTO encounters (campaign_id,name,difficulty,status,map_id,notes) VALUES (?,?,?,?,?,?)",
        (body.campaign_id, body.name, body.difficulty, body.status, body.map_id, body.notes))
    return db.fetchone("SELECT * FROM encounters WHERE id=?", (id_,))

@router.get("/generate")
def generate_encounter(
    campaign_id: Optional[int] = Query(None),
    party_size: int = Query(4),
    party_level: int = Query(5),
    difficulty: str = Query("medium"),
    wildemount_only: bool = Query(False),
):
    return encounter_gen.generate(campaign_id, party_size, party_level, difficulty, wildemount_only)

@router.get("/{eid}")
def get_encounter(eid: int):
    enc = db.fetchone("SELECT * FROM encounters WHERE id=?", (eid,))
    if not enc: raise HTTPException(404)
    enc["combatants"] = db.fetchall("SELECT * FROM combatants WHERE encounter_id=? ORDER BY sort_order DESC, initiative DESC", (eid,))
    return enc

@router.put("/{eid}")
def update_encounter(eid: int, body: EncounterIn):
    db.execute("UPDATE encounters SET name=?,difficulty=?,status=?,map_id=?,notes=? WHERE id=?",
               (body.name, body.difficulty, body.status, body.map_id, body.notes, eid))
    return get_encounter(eid)

@router.delete("/{eid}", status_code=204)
def delete_encounter(eid: int):
    db.execute("DELETE FROM encounters WHERE id=?", (eid,))

# --- Combatants ---

@router.post("/{eid}/combatants", status_code=201)
def add_combatant(eid: int, body: CombatantIn):
    id_ = db.execute(
        "INSERT INTO combatants (encounter_id,name,combatant_type,initiative,hp,max_hp,ac,conditions,notes,sort_order) VALUES (?,?,?,?,?,?,?,?,?,?)",
        (eid, body.name, body.combatant_type, body.initiative, body.hp, body.max_hp, body.ac, body.conditions, body.notes, body.sort_order))
    return db.fetchone("SELECT * FROM combatants WHERE id=?", (id_,))

@router.delete("/{eid}/combatants/{cid}", status_code=204)
def remove_combatant(eid: int, cid: int):
    db.execute("DELETE FROM combatants WHERE id=? AND encounter_id=?", (cid, eid))

@router.patch("/{eid}/initiative")
def set_initiative(eid: int, body: InitiativeUpdate):
    db.execute("UPDATE combatants SET initiative=? WHERE id=? AND encounter_id=?",
               (body.initiative, body.combatant_id, eid))
    return get_encounter(eid)

@router.patch("/{eid}/hp")
def update_hp(eid: int, body: HpUpdate):
    row = db.fetchone("SELECT * FROM combatants WHERE id=? AND encounter_id=?", (body.combatant_id, eid))
    if not row: raise HTTPException(404)
    new_hp = max(0, row["hp"] + body.delta)
    db.execute("UPDATE combatants SET hp=? WHERE id=?", (new_hp, body.combatant_id))
    return get_encounter(eid)

@router.patch("/{eid}/conditions")
def set_conditions(eid: int, body: ConditionUpdate):
    db.execute("UPDATE combatants SET conditions=? WHERE id=? AND encounter_id=?",
               (json.dumps(body.conditions), body.combatant_id, eid))
    return get_encounter(eid)

@router.post("/{eid}/roll-initiative")
def roll_initiative(eid: int):
    import random
    combatants = db.fetchall("SELECT * FROM combatants WHERE encounter_id=?", (eid,))
    for c in combatants:
        roll = random.randint(1, 20) + (c.get("dex_mod") or 0)
        db.execute("UPDATE combatants SET initiative=? WHERE id=?", (roll, c["id"]))
    return get_encounter(eid)
