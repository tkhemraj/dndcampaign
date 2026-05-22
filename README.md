# D&D Campaign Generator

**A full-featured local DM toolkit — procedural maps, live music, NPC and encounter generators, initiative tracker, quest board, and deep Wildemount lore support.**

No external APIs. No subscriptions. No proprietary data. Runs entirely on a Python backend + your browser.

**[→ Live Demo (GitHub Pages)](https://tkhemraj.github.io/dndcampaign/)** &nbsp;·&nbsp; **[→ Discord Bot](https://github.com/tkhemraj/dndcampaign-discordbot)**

---

## Quick Start

```bash
git clone https://github.com/tkhemraj/dndcampaign.git
cd dndcampaign
pip install -r requirements.txt
python run.py
```

Open `http://localhost:8080`, create a campaign, and start generating.

**Requires:** Python 3.11+ · Modern browser (Chrome, Firefox, Edge — Web Audio API for music)

---

## What's Inside

| Module | What it does |
|---|---|
| **Dashboard** | Stat cards, active quests, session journal, recent NPCs, quick-nav to every view |
| **Maps** | Procedural canvas maps — 22 subtypes across dungeon, outdoor, interior, and 10 Wildemount presets. Saveable, PNG-exportable |
| **NPCs** | Wildemount-aware generator: faction/region filters, ability scores, personality, backstory, stat block. Card or table view |
| **Encounters** | CR-balanced monster groups → rich brief card (environment, tactics, skill opportunities, loot, escalation) → live initiative tracker |
| **Initiative Tracker** | HP bars with click-to-edit, conditions modal, death saves, concentration tracking, combat log |
| **Quests** | Faction + region-aware plot hook generator, difficulty cards, status board |
| **Lore** | Notes database with categories (location, faction, deity, history, misc) + Wildemount reference panel |
| **Session Journal** | Log sessions from the dashboard; last three entries always visible |
| **Music** | 8 moods synthesised live in the browser via Tone.js — no audio files |

### Music Moods

| Mood | Use when |
|---|---|
| 🍺 Tavern | Warm interiors, downtime, The Leaky Tap |
| 💀 Dungeon | Slow exploration, the dark between rooms |
| ⚔ Combat | Standard fights |
| 🐉 Boss Fight | The thing at the end of the hall |
| 🌲 Wilderness | Travel, Greying Wildlands, open road |
| 🌑 Xhorhas / Kryn | Rosohna, Dynasty politics, Dunamancy |
| 💥 The Calamity | Eiselcross, Aeor ruins, ancient horror |
| 🏆 Victory | They survived. Barely. |

---

## Wildemount Coverage

**Factions** — Dwendalian Empire · Cerberus Assembly · Kryn Dynasty · Cobalt Soul · The Revelry · The Myriad · Clovis Concord

Each faction has its own NPC weight tables, plot hook pool, and region affiliation.

**Regions** — Western Wynandir · Xhorhas · Menagerie Coast · Greying Wildlands · Eiselcross

Each region has culturally-appropriate NPC name tables (Zemnian Imperial, Xhorhasian Kryn, Coastal Clovis), encounter flavour, and terrain types.

**Races** — All 5e SRD races plus Pallid Elf, Lotusden Halfling, Draconblood Dragonborn, and Ravenite Dragonborn.

**Deities** — Full Wildemount pantheon including the Luxon.

**Subclasses** — Echo Knight · Chronurgy Magic · Graviturgy Magic

**Map presets** — Xhorhas wastes, Aeor ruins, Rosohna streets, Dwendalian keep, Menagerie port, Savalirwood, Eiselcross tundra, Kryn temple, Cerberus lab, Bazzoxan caverns.

---

## Architecture

```
dndcampaign/
├── backend/
│   ├── main.py              # FastAPI app
│   ├── db.py                # SQLite schema + helpers
│   ├── generators/
│   │   ├── map_gen.py       # BSP dungeon, outdoor, interior
│   │   ├── npc_gen.py       # Wildemount NPC generation
│   │   ├── quest_gen.py     # Faction/region-aware hooks
│   │   └── encounter_gen.py # CR-balanced encounter builder
│   ├── data/
│   │   ├── wildemount.py    # All Wildemount lore tables
│   │   └── monsters.py      # Monster stat blocks + XP tables
│   └── routers/             # REST endpoints per domain
├── frontend/
│   ├── index.html           # App shell
│   ├── styles.css           # Dark fantasy theme + per-view atmosphere
│   ├── app.js               # Router, API helper, modal/toast system
│   └── views/               # Per-view JS modules
│       ├── dashboard.js
│       ├── maps.js          # Canvas renderer + PNG export
│       ├── npcs.js
│       ├── quests.js
│       ├── encounters.js    # Brief card + initiative tracker
│       ├── lore.js
│       └── music.js         # Tone.js synthesis engine
├── docs/                    # GitHub Pages static demo
└── run.py                   # Entry point (uvicorn, port 8080)
```

All campaign data lives in a local `dndcampaign.db` SQLite file. No migrations needed — the schema auto-creates on first run.

---

## Discord Bot

A companion bot that brings the toolkit into your Discord server — players and the DM see different things.

**[→ Add to Discord](https://discord.com/api/oauth2/authorize?client_id=1507476166494392420&permissions=117760&scope=bot%20applications.commands)** &nbsp;·&nbsp; **[→ Source](https://github.com/tkhemraj/dndcampaign-discordbot)**

| What players see | What the DM sees |
|---|---|
| Live combat tracker embed (updates silently) | Full NPC cards, quest details, encounter rosters |
| Quest board posted on demand | Ephemeral confirmations for every action |
| Map images (Pillow-rendered PNG) | DM-only preview before sharing |
| Session recaps | All generation and campaign management commands |

Fully standalone — generators and Wildemount data bundled in, no dependency on a running dndcampaign instance (optional shared-DB mode available).

---

## Legal

**Unofficial Fan Content** made under the [Wizards of the Coast Fan Content Policy](https://company.wizards.com/en/legal/fancontentpolicy). Not endorsed by Wizards of the Coast.

Monster stat blocks and rules mechanics are derived from the **D&D SRD 5.2** © Wizards of the Coast LLC, licensed under [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/).

The world of Exandria and the continent of Wildemount — including factions, locations, Dunamancy, and lore — were **created by Matthew Mercer** and are the intellectual property of **Critical Role, LLC**, published in *Explorer's Guide to Wildemount* (Wizards of the Coast, 2020). © Critical Role, LLC and Wizards of the Coast LLC. All rights reserved.

Music synthesis by [Tone.js](https://tonejs.github.io/) (MIT). See [NOTICE.md](NOTICE.md) for full attributions.

**License:** MIT — original code only. See [LICENSE](LICENSE) and [NOTICE.md](NOTICE.md).
