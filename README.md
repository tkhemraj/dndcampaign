# D&D Campaign Generator

**A full-featured Dungeon Master toolkit — procedural maps, live music, NPCs, quests, encounters, and deep Wildemount / Exandria lore support.**

All content is generated locally. No external APIs, no subscriptions, no proprietary data — just a Python backend, a browser, and your imagination.

> *Architecture, generators, and system integration were enhanced and tied together with the assistance of an AI development tool.*

---

## Screenshots

### Dashboard — Campaign at a Glance

The dashboard surfaces active quests, recent NPCs, and campaign stats the moment you open a campaign. Create as many campaigns as you like; they live independently in SQLite.

### Map Generator

![Map types: dungeon, outdoor, interior, Wildemount-specific](docs/screenshot-map.svg)

Procedural maps render on an HTML Canvas with tile colours, room labels, feature markers, and a grid overlay. Every map is saveable and exportable as PNG for use at the table.

### Initiative Tracker

![Live combat tracker with HP bars and condition tags](docs/screenshot-encounter.svg)

Roll initiative for the whole table in one click. Track HP (click to damage or heal), apply conditions, advance turns. The generator builds CR-balanced monster groups against your party's level and size.

### Music Player

Eight procedurally synthesised scores — generated live in the browser via Tone.js, no audio files:

| Mood | When to use |
|---|---|
| 🍺 Tavern | Ruby Sunrise, The Leaky Tap, any warm interior |
| 💀 Dungeon | Slow exploration, the dark between rooms |
| ⚔ Combat | Standard fights — fast and driving |
| 🐉 Boss Fight | The thing at the end of the hall |
| 🌲 Wilderness | Travel, the Greying Wildlands, open sky |
| 🌑 Xhorhas / Kryn | Rosohna, Dunamancy, the Dynasty |
| 💥 The Calamity | Eiselcross, Aeor ruins, ancient horror |
| 🏆 Victory | They survived. Barely. |

---

## Features

| | |
|---|---|
| **Procedural maps** | BSP dungeon, outdoor terrain, interior templates — 22 subtypes including 10 Wildemount-specific presets |
| **Wildemount presets** | Xhorhas wastes, Aeor ruins, Rosohna streets, Dwendalian keep, Menagerie port, Savalirwood, Eiselcross tundra, Kryn temple, Cerberus Assembly lab, Bazzoxan caverns |
| **PNG export** | Download any map directly from the browser |
| **Procedural music** | 8 moods synthesised live — no audio files, no CDN, pure Tone.js |
| **NPC generator** | Wildemount name tables by culture, faction-aware backstories, Wildemount-specific races |
| **Quest generator** | Faction + region-aware plot hooks across all 7 major factions, reward tables |
| **Encounter builder** | CR-balanced encounter generation against party level and size |
| **Initiative tracker** | Roll initiative, track HP with bars, apply conditions, advance turns |
| **Lore reference** | Full Wildemount panel: factions, regions, deities, Dunamancy subclasses, 17 plot seeds |
| **SQLite storage** | Everything stored locally, no external database |

---

## Wildemount Coverage

### Factions
Dwendalian Empire · Cerberus Assembly · Kryn Dynasty · Cobalt Soul · The Revelry · The Myriad · Clovis Concord

Each faction has its own plot hook table, region affiliation, and NPC generator weights.

### Regions
Western Wynandir · Xhorhas · Menagerie Coast · Greying Wildlands · Eiselcross

Each region has location tables, terrain types, encounter flavour text, and culturally-appropriate NPC name tables (Zemnian Imperial, Xhorhasian Kryn, Coastal Clovis).

### Races
All standard 5e races plus the four Wildemount-unique options:
- **Pallid Elf** — sun-starved, spent their lives underground
- **Lotusden Halfling** — nature-attuned forest halflings
- **Draconblood Dragonborn** — draconic nobles of shattered Draconia
- **Ravenite Dragonborn** — former slaves, rebellious and hardened

### Deities
Full Wildemount pantheon including Prime Deities, Betrayer Gods, and **the Luxon** — the unique entity of light and rebirth worshipped by the Kryn Dynasty.

### Subclasses
- **Echo Knight** (Fighter) — Dunamancy echoes from alternate timelines
- **Chronurgy Magic** (Wizard) — manipulate time, alter initiative, glimpse futures
- **Graviturgy Magic** (Wizard) — bend gravity, crush foes, launch allies

---

## Architecture

```
dndcampaign/
├── backend/
│   ├── main.py                  # FastAPI app
│   ├── db.py                    # SQLite schema + helpers
│   ├── generators/
│   │   ├── map_gen.py           # BSP dungeon, outdoor terrain, interior templates
│   │   ├── npc_gen.py           # Wildemount-flavoured NPC generation
│   │   ├── quest_gen.py         # Faction/region-aware plot hooks
│   │   └── encounter_gen.py     # CR-balanced monster encounter builder
│   ├── data/
│   │   ├── wildemount.py        # All Wildemount lore tables
│   │   └── monsters.py          # Monster stat blocks + XP tables
│   └── routers/                 # REST endpoints per domain
├── frontend/
│   ├── index.html               # App shell
│   ├── styles.css               # Dark fantasy theme
│   ├── app.js                   # Router, API helper, modal system
│   └── views/                   # Per-view JS modules
│       ├── maps.js              # Canvas renderer + PNG export
│       ├── music.js             # Tone.js synthesis engine
│       ├── npcs.js              # NPC manager + stat block display
│       ├── encounters.js        # Initiative tracker
│       ├── quests.js            # Quest board
│       ├── lore.js              # Notes + Wildemount reference panel
│       └── dashboard.js         # Campaign overview
└── requirements.txt
```

---

## Quick Start

```bash
git clone https://github.com/tkhemraj/dndcampaign.git
cd dndcampaign
pip install -r requirements.txt
python run.py
```

Open `http://localhost:8080`, create a campaign, and start generating.

---

## Map Tile Reference

| Colour | Tile |
|---|---|
| Dark brown | Wall / void |
| Warm brown | Floor |
| Orange-brown | Door |
| Deep blue | Water |
| Dark red | Lava |
| Dark green | Trees / vegetation |
| Tan | Road / path |
| Charcoal | Rubble |
| Medium brown | Pillar |
| Gold | Chest / treasure |
| Blue-grey | Stairs |
| Dark red (small dot) | Trap |
| Green | Grass |
| Sandy | Dirt / sand |
| Blue-white | Snow / ice |

---

## Requirements

- Python 3.11+
- Modern browser (Chrome, Firefox, Edge — Web Audio API required for music)

---

## Legal

This is **unofficial Fan Content** made under the
[Wizards of the Coast Fan Content Policy](https://company.wizards.com/en/legal/fancontentpolicy).
Not endorsed or sponsored by Wizards of the Coast.

Monster stat blocks and rules mechanics are derived from the
**D&D SRD 5.2** © Wizards of the Coast LLC, licensed under
[CC BY 4.0](https://creativecommons.org/licenses/by/4.0/).

The world of Exandria and the continent of Wildemount — including all factions,
locations, Dunamancy, and lore used in this project — were **created by
Matthew Mercer** and are the intellectual property of **Critical Role, LLC**,
published in *Explorer's Guide to Wildemount* (Wizards of the Coast, 2020).
© Critical Role, LLC and Wizards of the Coast LLC. All rights reserved.

Music synthesis by [Tone.js](https://tonejs.github.io/) (MIT).

See [NOTICE.md](NOTICE.md) for full attributions.

## License

MIT — original code only. See [LICENSE](LICENSE) and [NOTICE.md](NOTICE.md).
