"""SQLite persistence — schema, writes, reads."""
from __future__ import annotations
import sqlite3
from contextlib import contextmanager
from typing import Generator

_DB = "./dndcampaign.db"

SCHEMA = """
CREATE TABLE IF NOT EXISTS campaigns (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    name        TEXT NOT NULL,
    setting     TEXT DEFAULT 'Wildemount',
    description TEXT,
    created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS npcs (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    campaign_id  INTEGER REFERENCES campaigns(id) ON DELETE CASCADE,
    name         TEXT NOT NULL,
    race         TEXT,
    npc_class    TEXT,
    level        INTEGER DEFAULT 1,
    faction      TEXT,
    region       TEXT,
    alignment    TEXT,
    personality  TEXT,
    ideal        TEXT,
    bond         TEXT,
    flaw         TEXT,
    backstory    TEXT,
    hp           INTEGER,
    ac           INTEGER,
    str_score    INTEGER, dex_score INTEGER, con_score INTEGER,
    int_score    INTEGER, wis_score INTEGER, cha_score INTEGER,
    notes        TEXT,
    status       TEXT DEFAULT 'alive',
    created_at   TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS quests (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    campaign_id  INTEGER REFERENCES campaigns(id) ON DELETE CASCADE,
    title        TEXT NOT NULL,
    description  TEXT,
    faction      TEXT,
    region       TEXT,
    difficulty   TEXT DEFAULT 'medium',
    status       TEXT DEFAULT 'active',
    reward       TEXT,
    notes        TEXT,
    created_at   TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS encounters (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    campaign_id  INTEGER REFERENCES campaigns(id) ON DELETE CASCADE,
    name         TEXT NOT NULL,
    difficulty   TEXT DEFAULT 'medium',
    status       TEXT DEFAULT 'planned',
    map_id       INTEGER,
    notes        TEXT,
    created_at   TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS combatants (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    encounter_id  INTEGER REFERENCES encounters(id) ON DELETE CASCADE,
    name          TEXT NOT NULL,
    combatant_type TEXT DEFAULT 'monster',
    initiative    INTEGER DEFAULT 0,
    hp            INTEGER DEFAULT 1,
    max_hp        INTEGER DEFAULT 1,
    ac            INTEGER DEFAULT 10,
    conditions    TEXT DEFAULT '[]',
    notes         TEXT,
    sort_order    INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS maps (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    campaign_id  INTEGER REFERENCES campaigns(id) ON DELETE CASCADE,
    name         TEXT NOT NULL,
    map_type     TEXT NOT NULL,
    subtype      TEXT,
    width        INTEGER NOT NULL,
    height       INTEGER NOT NULL,
    data         TEXT NOT NULL,
    created_at   TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS lore_entries (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    campaign_id  INTEGER REFERENCES campaigns(id) ON DELETE CASCADE,
    title        TEXT NOT NULL,
    category     TEXT DEFAULT 'misc',
    content      TEXT,
    tags         TEXT DEFAULT '',
    created_at   TEXT NOT NULL DEFAULT (datetime('now'))
);
"""


def init(path: str = "./dndcampaign.db") -> None:
    global _DB
    _DB = path
    with _conn() as con:
        con.executescript(SCHEMA)


@contextmanager
def _conn() -> Generator[sqlite3.Connection, None, None]:
    con = sqlite3.connect(_DB)
    con.row_factory = sqlite3.Row
    con.execute("PRAGMA foreign_keys = ON")
    try:
        yield con
        con.commit()
    finally:
        con.close()


def fetchall(sql: str, params: tuple = ()) -> list[dict]:
    with _conn() as con:
        return [dict(r) for r in con.execute(sql, params).fetchall()]


def fetchone(sql: str, params: tuple = ()) -> dict | None:
    with _conn() as con:
        row = con.execute(sql, params).fetchone()
        return dict(row) if row else None


def execute(sql: str, params: tuple = ()) -> int:
    with _conn() as con:
        cur = con.execute(sql, params)
        return cur.lastrowid
