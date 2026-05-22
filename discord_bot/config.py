"""Per-guild configuration stored in guild_config.json."""
from __future__ import annotations
import json
import os
from pathlib import Path

_CONFIG_PATH = Path(__file__).parent / "guild_config.json"

_DEFAULT: dict = {
    "dm_role_id": None,       # Role ID that grants DM access
    "dm_channel_id": None,    # Channel ID restricted to DM commands
    "player_channel_id": None, # Channel where player feed is posted
    "active_campaign_id": None,
}


def _load() -> dict:
    if _CONFIG_PATH.exists():
        with open(_CONFIG_PATH) as f:
            return json.load(f)
    return {}


def _save(data: dict) -> None:
    with open(_CONFIG_PATH, "w") as f:
        json.dump(data, f, indent=2)


def get(guild_id: int) -> dict:
    data = _load()
    gid = str(guild_id)
    if gid not in data:
        data[gid] = dict(_DEFAULT)
        _save(data)
    return data[gid]


def set_key(guild_id: int, key: str, value) -> None:
    data = _load()
    gid = str(guild_id)
    if gid not in data:
        data[gid] = dict(_DEFAULT)
    data[gid][key] = value
    _save(data)


def get_key(guild_id: int, key: str):
    return get(guild_id).get(key)
