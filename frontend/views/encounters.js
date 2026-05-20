'use strict';

// ── Encounter enrichment data ─────────────────────────────────────────────────
const _ENC_ENVIRONMENTS = [
  { name:'Dungeon Corridor',
    desc:'A low stone passage, torchlight failing at both ends. The ceiling is close. Sound carries.',
    features:['Narrow corridor (10ft wide): Large+ creatures squeeze; ranged attacks have cover from sides','Loose flagstones: DC 12 Perception to notice; trigger = Dex DC 13 or prone','Wall sconces: can be knocked down as improvised thrown weapons (1d6 + fire)','Rusted portcullis, open but droppable: lever in an alcove, costs an action'] },
  { name:'Ruined Chamber',
    desc:'A vaulted room with half the ceiling caved in. Rubble everywhere. Something was here before it fell.',
    features:['Rubble field (20ft section): difficult terrain, half cover while crouching','Collapsed pillar: three-quarters cover; unstable (DC 14 Str to tip onto enemy, 2d10 bludgeoning)','Shaft of light from the collapse: 10ft circle, dim light — advantage on Perception within it','Old brazier: still hot; knocked over = 10ft line of difficult terrain, 1d6 fire to enter'] },
  { name:'Forest Clearing',
    desc:'A break in the canopy. The trees form a ring around a space that looks deliberately maintained. It isn\'t.',
    features:['Tree line: creatures inside are heavily obscured until they step into the clearing','Loose undergrowth ring: difficult terrain 10ft around clearing edge; DC 13 Stealth to move silently','Low branch: DC 12 Athletics to grab as bonus action; grants high ground (+1 to attacks)','Mossy log: blocks movement, half cover for prone creatures; DC 10 Athletics to vault'] },
  { name:'Tavern Common Room',
    desc:'Tables overturned, broken glass, the barkeep behind the bar praying quietly. Combat out of nowhere.',
    features:['Furniture: four tables as half cover; easily shoved (DC 11 Str, action, knocks prone on hit)','Bar top: high ground; DC 13 Athletics to vault; barkeep throws bottles (improvised 1d4+1) if provoked','Fireplace: 5ft cube, 1d10 fire to enter or start turn; cast iron poker available (1d6 bludgeoning)','Chandelier: rope near bar; cut = drops on 10ft square (DC 14 Dex or 2d6 + restrained until freed)'] },
  { name:'Mountain Pass',
    desc:'A ledge with a sheer drop on one side and a cliff face on the other. Whoever holds the high ground wins.',
    features:['Ledge edge: forced movement toward edge (DC 13 Str) = over the side; 30ft drop (3d6 bludgeoning)','High ground section: +1 to attack rolls from 10ft elevation difference','Loose scree: DC 13 Perception to identify; first creature through triggers Dex DC 13 or slides 10ft to edge','Cliff alcove: room for one medium creature, three-quarters cover; must Dash to reach'] },
  { name:'Underground Lake Shore',
    desc:'Dark water to one side, slick stone to the other. Things live in the water. The echo is disorienting.',
    features:['Water\'s edge: knocked prone while adjacent = into the water (swim DC 12 per round or sink 5ft)','Slick stone: full area difficult terrain; running = DC 12 Acrobatics or fall prone','Stalactites overhead: ranged hit DC 13 drops one on a 10ft circle (2d8+2 piercing)','Echo chamber: disadvantage on Perception (hearing); loud sounds alert the whole cave'] },
  { name:'Burning Building',
    desc:'The structure is already on fire. The reason matters less than what\'s in here that shouldn\'t burn.',
    features:['Smoke (upper 5ft of each room): heavily obscured; DC 12 Con per minute or poisoned','Active fire squares: 2d6 fire to enter or start turn; spreads 1 square per round on a d6 roll of 5–6','Weakened floor: DC 13 Perception; weight of two medium creatures = falls through (1d6 + fire)','Burning debris: falls from ceiling each round (DC 13 Dex or 1d10 fire, 20% chance per room)'] },
  { name:'Ship Deck',
    desc:'Moving deck, salt spray, the mast above. Everything is tied down, bolted, or swinging.',
    features:['Moving deck: each round DM calls a sway direction (DC 12 Dex or slide 5ft that direction)','Rigging: DC 13 Athletics to climb; grants height (+1 attacks) and cover from below; rope can be cut','Cannons (if warship): two actions to aim and fire; 4d10 bludgeoning, 30ft range, deafens 10ft','Water below: man overboard = DC 14 Str (Athletics) per round to stay afloat'] },
  { name:'Sewer Tunnel',
    desc:'Knee-deep foul water, low arched ceilings, sounds that don\'t track to sources. Visibility is zero.',
    features:['Waist-high water: all movement difficult terrain; small creatures fully submerged','No ambient light beyond carried sources: all creatures effectively blind beyond their own radius','Slime walls: climbers must succeed DC 15 Athletics or fall (ceiling is 8ft; drop is 1d4+1)','Current grate: strong current section (DC 14 Str or swept 20ft downstream; DC 12 to grab a pipe)'] },
  { name:'Ancient Temple',
    desc:'Columns, a raised altar, faded murals of something that used to matter. Something here is still active.',
    features:['Altar: high ground, three-quarters cover while prone; touching triggers DC 13 Wis or frightened 1 round','Column grid: full cover behind a column; 12 columns total, 10ft apart','Divine trap (one tile): Arcana DC 14 to identify; triggers 3d6 radiant in 10ft burst (DC 14 Dex half)','Mural: Investigation DC 15 reveals a weakness or history of one enemy type present in the encounter'] },
  { name:'City Rooftops',
    desc:'Narrow ledges, chimneys, wash lines between buildings. Three stories up. One bad roll from a bad time.',
    features:['Gap between roofs: DC 12 Athletics to jump; failure = grab ledge (DC 13 Str) or fall 3d6','Laundry lines: half cover; grab as free action for a swing (DC 13 Acrobatics = move 15ft ignoring terrain)','Chimney: blocks movement, three-quarters cover; venting smoke (DC 11 Con per round or poisoned)','Wet tiles: most sections difficult terrain; first failed Acrobatics this combat = prone'] },
  { name:'Frozen Tundra',
    desc:'Flat open ground, visibility in every direction, wind that turns sound sideways. Nowhere to hide.',
    features:['Open field: no cover within 60ft; ranged combatants have clear lanes in every direction','Ice patches (scattered): DC 13 Perception to identify; entering = DC 12 Acrobatics or fall prone','Wind: ranged attack rolls beyond 30ft at disadvantage; Perception (hearing) at disadvantage','Snowdrift: two sections of difficult terrain; prone creature in a drift is heavily obscured'] },
];

const _ENC_TACTICS = {
  humanoid:   { open:'Form up on ranged party members first; melee engages immediately; leaders stay back round 1 calling targets', sustain:'Focus fire on downed party members when possible; use reactions for opportunity attacks; don\'t break formation voluntarily', morale:'Flee or surrender when leader drops or when reduced to half numbers; thugs break early, soldiers hold longer' },
  undead:     { open:'Mindless undead move directly toward the nearest living creature; intelligent undead open with their most powerful ability', sustain:'Mindless undead never retreat and keep advancing regardless of losses; intelligent undead use cover and prioritize casters', morale:'Mindless: none — fight to destruction. Intelligent undead: may withdraw if losing, but will not surrender' },
  beast:      { open:'Fastest beast charges; the rest use pack tactics — one engages, others circle for flanking opportunities', sustain:'Knock prey prone early (trip attacks, pounce); bite and hold; drag isolated targets away from the group', morale:'Natural beasts flee at half health unless protecting young or a nest; magically influenced beasts fight to the death' },
  dragon:     { open:'Breath weapon first on the largest group cluster; then land or stay aloft based on type and environment', sustain:'Prioritize the most dangerous target; use lair actions on initiative 20; reposition every 2 rounds using fly speed', morale:'Dragons rarely flee but will at 25% HP if lacking legendary resistance; ancient dragons almost never flee' },
  fiend:      { open:'Lead with the most powerful debuff ability; try to charm, frighten, or stun the biggest threat on round 1', sustain:'Target isolated characters; use teleportation to stay at preferred range; force concentration saves', morale:'Demons fight to the death but may be banished; devils withdraw to preserve themselves for a longer game' },
  aberration: { open:'Mind-affecting ability first; try to incapacitate the biggest threat before it acts', sustain:'Keep the most confused or stunned target isolated; never engage directly if it can attack from range or through an ally', morale:'Aberrations rarely retreat but will shift focus entirely if their psychic target becomes ineffective' },
  giant:      { open:'Rock throw to open if range allows; then close to melee and focus on the heaviest armour', sustain:'Multiattack against the same target each round to drop them fast; ignore opportunity attacks willingly', morale:'Giants hold until half health then reevaluate; hill giants panic early; stone and frost giants hold longer' },
  construct:  { open:'Move to block exits first; constructs prioritize the creature that last damaged them', sustain:'Constructs don\'t have morale — they follow programming; identify and target the controlling mechanism', morale:'None — destroy or disable the controller to end the fight' },
  elemental:  { open:'Use elemental form movement immediately to reposition to an advantageous position', sustain:'Focus the creature most resistant to their element; use environment-specific abilities whenever available', morale:'Summoned elementals fight until dismissed or destroyed; native elementals may retreat to their plane' },
  monstrosity:{ open:'Each monstrosity has a signature ability — use it on round 1 before the party can react to it', sustain:'Monstrosities often focus the creature that hurt them most recently; use special senses to track invisible targets', morale:'Territorial monstrosities fight harder near their lair; wanderers may break off at half health' },
  fey:        { open:'Illusory or charm abilities first to split or confuse the party before any damage is taken', sustain:'Fey avoid taking damage; retreat, reappear, and strike from surprise repeatedly if possible', morale:'Fey who are losing try to bargain or flee rather than die — they consider death a very uncouth outcome' },
  ooze:       { open:'Move toward the largest cluster; pseudopod attacks prefer unarmoured targets', sustain:'Oozes split if area effects hit them (if applicable); they can\'t be communicated with and don\'t react to morale', morale:'None — mindless creatures fight until destroyed' },
  plant:      { open:'Entangle, grapple, or restrain immediately to hold targets in place for follow-up attacks', sustain:'Prioritize mobile characters first to reduce the party\'s ability to reposition', morale:'Mindless plants fight to destruction; intelligent plants may negotiate or retreat if significantly damaged' },
  celestial:  { open:'Lead with the ability that removes the most immediate threat; divine wards or debuffs before damage', sustain:'Celestials adapt tactically and protect weaker allies; they prioritize stopping the most evil creature present', morale:'Celestials may withdraw to regroup but rarely flee permanently; will sacrifice themselves for a ward or innocent' },
};

const _ENC_SKILL_OPPS = [
  { skill:'Athletics DC 12',    effect:'Topple a piece of large furniture onto an enemy (2d6 bludgeoning, knocked prone)' },
  { skill:'Arcana DC 14',       effect:'Identify one enemy\'s damage vulnerability or immunity before the party commits to a strategy' },
  { skill:'Persuasion DC 16',   effect:'Convince a non-fanatic enemy to stand down (humanoids, intelligent monsters); DM sets stakes' },
  { skill:'Intimidation DC 14', effect:'Cause hesitation in weaker enemies — they use their action to dodge this round instead of attacking' },
  { skill:'Perception DC 13',   effect:'Spot an environmental hazard before a party member triggers it (fall, collapse, fire spread)' },
  { skill:'Stealth DC 14',      effect:'Slip out of combat undetected — remove one character from enemy targeting for one round' },
  { skill:'Nature DC 12',       effect:'Recall correct behaviour against one beast or plant type — exploit their morale or instincts' },
  { skill:'Religion DC 13',     effect:'Recall a specific undead or fiend weakness not in the stat block; DM adjudicates effect' },
  { skill:'Investigation DC 15',effect:'Find a hidden exit, a missed weapon, or a mechanism that affects the encounter environment' },
  { skill:'Medicine DC 12',     effect:'Identify a downed ally as stable vs dying — save an action that would otherwise be spent checking' },
];

const _ENC_ESCALATIONS = [
  'Reinforcements arrive at the end of round 3 — one additional creature of CR equal to party level minus 2',
  'A second faction enters from the opposite direction with their own agenda; may fight the original enemies, the party, or both',
  'An environmental hazard activates — the room begins filling with gas, water, or fire at the start of round 4',
  'The apparent leader was a decoy; the real threat was watching from a hidden vantage and now enters the fight',
  'One enemy produces a hostage or a MacGuffin mid-fight and offers terms',
  'A trap activates that benefits neither side — everyone on the battlefield must deal with it simultaneously',
  'A creature from outside the encounter is drawn in by the noise; it\'s hostile to everything in the room',
  'Structural collapse begins — the ceiling, floor, or walls become a secondary threat with their own initiative',
];

const _ENC_LOOT = [
  { lvl:[1,4],   tables:['Small coin purse (2d6×5 cp, 1d6×5 sp)','One common magic item (potion of healing, +1 ammunition)','Personal effects with a plot hook attached','A map fragment that leads somewhere small'] },
  { lvl:[5,8],   tables:['Coin mix (2d6×10 gp + gems worth 2d6×5 gp)','One uncommon magic item or a spell scroll (level 2–4)','Encoded documents — Cobalt Soul or Myriad would pay for these','A faction signet ring that opens a door it shouldn\'t'] },
  { lvl:[9,12],  tables:['Coin hoard (3d6×50 gp + one gem worth 1d6×100 gp)','Rare magic item or spell scroll (level 5–6)','A research journal with dangerous conclusions','Faction intelligence — someone, somewhere, will pay a lot for this'] },
  { lvl:[13,16], tables:['Significant treasure (2d6×100 gp + art objects worth 3d6×100 gp)','Very rare magic item or a spell scroll (level 7–8)','Something that shouldn\'t exist — DM decides what it is and why it matters','An Aeoran artifact, incomplete and still functional'] },
  { lvl:[17,20], tables:['Major treasure (5d6×250 gp + gems worth 1d4×1000 gp each)','Legendary magic item or 9th-level spell scroll','The reason the most powerful enemy was carrying what they were carrying','Something that, if taken, creates the next major plot thread'] },
];

function _pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

function _encLoot(level) {
  const tier = _ENC_LOOT.find(t => level >= t.lvl[0] && level <= t.lvl[1]) || _ENC_LOOT[1];
  return tier.tables.slice(0, 3);
}

function _enrichEncounter(enc, envName) {
  const env = (envName && envName !== '(Random)')
    ? (_ENC_ENVIRONMENTS.find(e => e.name === envName) || _pick(_ENC_ENVIRONMENTS))
    : _pick(_ENC_ENVIRONMENTS);

  const baseType = enc.dominant_type || 'humanoid';
  const tacticsKey = Object.keys(_ENC_TACTICS).find(t => baseType.includes(t)) || 'humanoid';

  return {
    env,
    tactics:     _ENC_TACTICS[tacticsKey],
    dominantType: tacticsKey,
    skillOpps:   [..._ENC_SKILL_OPPS].sort(() => Math.random() - 0.5).slice(0, 3),
    escalation:  _pick(_ENC_ESCALATIONS),
    loot:        _encLoot(enc.party_level || 5),
  };
}

// ── State ─────────────────────────────────────────────────────────────────────
let _activeEncounterId = null;
let _currentTurnIdx    = 0;
let _liveBroadcast     = false;

// ── Main view ─────────────────────────────────────────────────────────────────
const _ENV_NAMES = ['(Random)',..._ENC_ENVIRONMENTS.map(e=>e.name)];

window.renderEncountersView = async function(campaignId) {
  const el = document.getElementById('content');
  el.innerHTML = `
    <div class="view-header">
      <h1>⚔ Encounters</h1>
      <div class="view-actions">
        <button class="btn btn-primary" id="btn-new-enc">+ New</button>
      </div>
    </div>

    <div class="card" style="margin-bottom:16px">
      <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:10px">
        <div class="form-group"><label>Party Size</label><input id="enc-size"  type="number" value="4" min="1" max="10"/></div>
        <div class="form-group"><label>Party Level</label><input id="enc-level" type="number" value="5" min="1" max="20"/></div>
        <div class="form-group"><label>Difficulty</label>
          <select id="enc-diff"><option>easy</option><option selected>medium</option><option>hard</option><option>deadly</option></select>
        </div>
        <div class="form-group" style="justify-content:flex-end;flex-direction:row;align-items:flex-end;gap:8px">
          <label style="white-space:nowrap;margin-bottom:0"><input type="checkbox" id="enc-wm"/> Wildemount</label>
          <button class="btn btn-purple" id="btn-do-gen-enc">⚙ Generate</button>
        </div>
      </div>
      <div class="form-group" style="margin-bottom:0">
        <label>Environment</label>
        <select id="enc-env">${_ENV_NAMES.map(n=>`<option>${n}</option>`).join('')}</select>
      </div>
    </div>

    <div id="enc-brief-result"></div>
    <div id="encounter-list" style="margin-bottom:24px"></div>
    <div id="combat-tracker"></div>
  `;

  const loadList = async () => {
    const url = campaignId ? `/api/encounters/?campaign_id=${campaignId}` : '/api/encounters/';
    const encs = await api(url);
    const el2  = document.getElementById('encounter-list');
    if (!encs.length) {
      el2.innerHTML = `<div class="empty-state">
        <div class="empty-state-icon">⚔</div>
        <div class="empty-state-title">No encounters yet</div>
        <div class="empty-state-sub">Generate a CR-balanced encounter above, or add one manually.</div>
      </div>`;
      return;
    }
    el2.innerHTML = `<div class="section-title">Saved Encounters</div>
      <div class="table-wrap"><table>
        <thead><tr><th>Name</th><th>Difficulty</th><th>Status</th><th></th></tr></thead>
        <tbody>${encs.map(e => `<tr>
          <td><strong>${e.name}</strong></td>
          <td><span class="badge badge-${e.difficulty}">${e.difficulty}</span></td>
          <td><span class="badge badge-${e.status}">${e.status}</span></td>
          <td style="display:flex;gap:4px">
            <button class="btn btn-secondary btn-sm" onclick="openCombatTracker(${e.id})">▶ Run</button>
            <button class="btn btn-danger btn-sm"    onclick="deleteEnc(${e.id})">✕</button>
          </td>
        </tr>`).join('')}</tbody>
      </table></div>`;
  };
  await loadList();

  document.getElementById('btn-do-gen-enc').addEventListener('click', async () => {
    const size  = +document.getElementById('enc-size').value;
    const level = +document.getElementById('enc-level').value;
    const diff  = document.getElementById('enc-diff').value;
    const wm    = document.getElementById('enc-wm').checked;
    const env   = document.getElementById('enc-env').value;
    const cid   = campaignId ? `&campaign_id=${campaignId}` : '';
    const btn   = document.getElementById('btn-do-gen-enc');

    btn.disabled = true;
    btn.innerHTML = '<span class="spinner"></span>';
    try {
      const enc = await api(`/api/encounters/generate?party_size=${size}&party_level=${level}&difficulty=${diff}&wildemount_only=${wm}${cid}`);
      const enrichment = _enrichEncounter(enc, env);
      _renderBrief(enc, enrichment, campaignId, loadList);
    } catch(e) {
      toast('Generation failed — check console', 'error');
    } finally {
      btn.disabled = false;
      btn.textContent = '⚙ Generate';
    }
  });

  document.getElementById('btn-new-enc').addEventListener('click', () => {
    inputModal('New Encounter', [
      { id:'name', label:'Encounter Name', placeholder:'e.g. Goblin Ambush' },
    ], async ({ name }) => {
      if (!name.trim()) return;
      const enc = await api('/api/encounters/', 'POST', { campaign_id: campaignId, name: name.trim() });
      await loadList();
      openCombatTracker(enc.id);
    });
  });

  window.deleteEnc = id => {
    confirmModal('Delete this encounter and all its combatants?', async () => {
      await api(`/api/encounters/${id}`, 'DELETE');
      if (_activeEncounterId === id) document.getElementById('combat-tracker').innerHTML = '';
      await loadList();
      toast('Encounter deleted', 'info');
    });
  };

  window.openCombatTracker = async id => {
    _activeEncounterId = id;
    _currentTurnIdx    = 0;
    document.getElementById('enc-brief-result').innerHTML = '';
    await refreshTracker();
    document.getElementById('combat-tracker').scrollIntoView({ behavior:'smooth' });
  };
};

// ── Brief card renderer ───────────────────────────────────────────────────────
function _renderBrief(enc, enrichment, campaignId, loadList) {
  const { env, tactics, dominantType, skillOpps, escalation, loot } = enrichment;

  const nameCounts = {};
  (enc.combatants || []).forEach(c => { nameCounts[c.name] = (nameCounts[c.name]||0) + 1; });
  const monsterSummary = Object.entries(nameCounts)
    .map(([n,c]) => c > 1 ? `${c}× ${n}` : n).join(', ');

  const xpMatch = (enc.notes || '').match(/\d+/);
  const xp = xpMatch ? xpMatch[0] : '?';

  const featuresHtml = env.features.map(f => {
    const ci = f.indexOf(':');
    return `<div class="enc-feature">${ci > -1
      ? `<strong>${f.slice(0,ci)}</strong>: ${f.slice(ci+1).trim()}`
      : f}</div>`;
  }).join('');

  const wrap = document.getElementById('enc-brief-result');
  wrap.innerHTML = `<div class="enc-brief">
    <div class="enc-brief-header">
      <div class="enc-brief-title">${enc.name}</div>
      <div class="enc-brief-monsters">${monsterSummary}</div>
      <div class="enc-brief-xp">~${xp} XP · party of ${enc.party_size || 4}</div>
    </div>
    <div class="enc-brief-body">

      <div class="enc-brief-section">
        <div class="enc-section-label">📍 ${env.name}</div>
        <div class="enc-env-desc">${env.desc}</div>
        ${featuresHtml}
      </div>

      <div class="enc-brief-section">
        <div class="enc-section-label">⚔ Tactics — ${dominantType}</div>
        <div class="enc-tactic"><span class="enc-tactic-label">Opening — </span>${tactics.open}</div>
        <div class="enc-tactic" style="margin-top:8px"><span class="enc-tactic-label">Sustained — </span>${tactics.sustain}</div>
        <div class="enc-tactic" style="margin-top:8px"><span class="enc-tactic-label">Morale — </span>${tactics.morale}</div>
      </div>

      <div class="enc-brief-section">
        <div class="enc-section-label">🎯 Skill Opportunities</div>
        ${skillOpps.map(s=>`<div class="enc-skill-opp"><strong>${s.skill}</strong> — ${s.effect}</div>`).join('')}
      </div>

      <div class="enc-brief-section">
        <div class="enc-section-label">⚡ Escalation</div>
        <div class="enc-escalation">${escalation}</div>
        <div class="enc-section-label" style="margin-top:16px">💰 Loot</div>
        ${loot.map(l=>`<div class="enc-loot-item">${l}</div>`).join('')}
      </div>

    </div>
    <div class="enc-brief-actions">
      <button class="btn btn-primary" id="btn-save-run">▶ Save &amp; Run</button>
      <button class="btn btn-secondary" id="btn-regen">↺ Regenerate</button>
      <span style="margin-left:auto;font-size:11px;color:var(--muted)">${enc.difficulty} difficulty · level ${enc.party_level || '?'}</span>
    </div>
  </div>`;

  wrap.scrollIntoView({ behavior:'smooth' });

  document.getElementById('btn-save-run').addEventListener('click', async () => {
    const btn = document.getElementById('btn-save-run');
    btn.disabled = true; btn.innerHTML = '<span class="spinner"></span>';
    try {
      const saved = await api('/api/encounters/', 'POST',
        { campaign_id: campaignId, name: enc.name, difficulty: enc.difficulty, notes: enc.notes });
      for (const c of (enc.combatants || [])) {
        await api(`/api/encounters/${saved.id}/combatants`, 'POST', c);
      }
      wrap.innerHTML = '';
      await loadList();
      openCombatTracker(saved.id);
      toast(`"${enc.name}" saved`, 'success');
    } catch(e) {
      toast('Save failed', 'error');
      btn.disabled = false; btn.textContent = '▶ Save & Run';
    }
  });

  document.getElementById('btn-regen').addEventListener('click', async () => {
    const size  = +document.getElementById('enc-size').value;
    const level = +document.getElementById('enc-level').value;
    const diff  = document.getElementById('enc-diff').value;
    const wm    = document.getElementById('enc-wm').checked;
    const env   = document.getElementById('enc-env').value;
    const cid   = campaignId ? `&campaign_id=${campaignId}` : '';
    const btn   = document.getElementById('btn-regen');
    btn.disabled = true; btn.innerHTML = '<span class="spinner"></span>';
    try {
      const newEnc = await api(`/api/encounters/generate?party_size=${size}&party_level=${level}&difficulty=${diff}&wildemount_only=${wm}${cid}`);
      const newEnrichment = _enrichEncounter(newEnc, env);
      _renderBrief(newEnc, newEnrichment, campaignId, loadList);
    } finally {
      // button is gone after re-render, no need to restore
    }
  });
}

// ── Combat tracker ────────────────────────────────────────────────────────────
async function refreshTracker() {
  const enc = await api(`/api/encounters/${_activeEncounterId}`);
  const el  = document.getElementById('combat-tracker');
  const combatants = (enc.combatants || []).sort((a,b) => b.initiative - a.initiative);

  el.innerHTML = `
    <div class="divider"></div>
    <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:14px">
      <h2 style="font-family:'Cinzel',serif;color:var(--accent)">⚔ ${enc.name}</h2>
      <span class="badge badge-${enc.difficulty}">${enc.difficulty}</span>
      <div style="display:flex;gap:6px;margin-left:auto;flex-wrap:wrap">
        <button class="btn btn-secondary btn-sm" id="btn-roll-init">🎲 Roll Initiative</button>
        <button class="btn btn-secondary btn-sm" id="btn-next-turn">▶ Next Turn</button>
        <button class="btn btn-secondary btn-sm" id="btn-add-combatant">+ Add</button>
        <button class="btn btn-sm ${_liveBroadcast?'btn-primary':'btn-secondary'}" id="btn-live-toggle" title="Broadcast to player view">📡${_liveBroadcast?' Live':''}</button>
        <select id="enc-status-sel" class="btn btn-secondary btn-sm">
          ${['planned','active','completed'].map(s=>`<option ${enc.status===s?'selected':''}>${s}</option>`).join('')}
        </select>
      </div>
    </div>
    <div id="combatant-list">${combatants.length
      ? combatants.map((c,i) => combatantRow(c, i === _currentTurnIdx % combatants.length)).join('')
      : `<p style="color:var(--muted);padding:12px 0">No combatants yet — add some or generate an encounter above.</p>`
    }</div>
    ${enc.notes ? `<p style="color:var(--muted);font-size:12px;margin-top:10px">${enc.notes}</p>` : ''}
  `;

  document.getElementById('btn-roll-init').addEventListener('click', async () => {
    await api(`/api/encounters/${_activeEncounterId}/roll-initiative`, 'POST');
    _currentTurnIdx = 0;
    await refreshTracker();
    toast('Initiative rolled!', 'success');
  });

  document.getElementById('btn-next-turn').addEventListener('click', async () => {
    _currentTurnIdx++;
    await refreshTracker();
  });

  document.getElementById('enc-status-sel').addEventListener('change', async e => {
    await api(`/api/encounters/${_activeEncounterId}`, 'PUT',
      { name: enc.name, difficulty: enc.difficulty, status: e.target.value, notes: enc.notes });
    toast(`Status: ${e.target.value}`, 'info');
  });

  document.getElementById('btn-add-combatant').addEventListener('click', () => {
    inputModal('Add Combatant', [
      { id:'name', label:'Name',     placeholder:'e.g. Goblin Archer' },
      { id:'hp',   label:'Max HP',   type:'number', value:10, min:1 },
      { id:'ac',   label:'AC',       type:'number', value:12, min:1 },
      { id:'type', label:'Type',     type:'select', value:'monster',
        options:[{value:'monster',label:'👹 Monster'},{value:'player',label:'🧙 Player'}] },
    ], async ({ name, hp, ac, type }) => {
      if (!name.trim()) return;
      await api(`/api/encounters/${_activeEncounterId}/combatants`, 'POST',
        { name:name.trim(), hp, max_hp:hp, ac, combatant_type:type });
      await refreshTracker();
    }, 'Add');
  });

  document.getElementById('btn-live-toggle').addEventListener('click', async () => {
    _liveBroadcast = !_liveBroadcast;
    if (_liveBroadcast) {
      toast('Broadcasting to players — open /player on their device', 'success');
    } else {
      await api('/api/live/broadcast', 'POST', { encounter: null });
      toast('Live combat stopped', 'info');
    }
    await refreshTracker();
  });

  // Auto-broadcast if live
  if (_liveBroadcast && combatants.length) {
    api('/api/live/broadcast', 'POST', {
      encounter: {
        name: enc.name,
        round: Math.floor(_currentTurnIdx / Math.max(1, combatants.length)) + 1,
        current_idx: _currentTurnIdx % Math.max(1, combatants.length),
        combatants: combatants.map(c => ({
          name:       c.name,
          hp:         c.hp,
          max_hp:     c.max_hp,
          is_player:  c.combatant_type === 'player',
          conditions: JSON.parse(c.conditions || '[]'),
        })),
      }
    }).catch(() => {});
  }
}

function combatantRow(c, isActive) {
  const hpPct   = Math.max(0, (c.hp / c.max_hp) * 100);
  const hpClass  = hpPct <= 25 ? 'crit-low' : hpPct <= 50 ? 'low' : '';
  const dead     = c.hp <= 0;
  const conditions = JSON.parse(c.conditions || '[]');

  return `<div class="combatant-row ${isActive?'active-turn':''} ${dead?'dead':''}">
    <div style="min-width:32px;text-align:center;font-size:17px;font-weight:700;color:var(--gold)">${c.initiative||'—'}</div>
    <div class="combatant-name" style="color:${c.combatant_type==='player'?'var(--accent)':'var(--text)'}">
      ${c.combatant_type==='player'?'🧙':'👹'} ${c.name}
    </div>
    <div class="combatant-hp">
      <div style="font-size:12px">${c.hp}/${c.max_hp} HP</div>
      <div class="hp-bar"><div class="hp-fill ${hpClass}" style="width:${hpPct}%"></div></div>
    </div>
    <div style="min-width:50px;color:var(--muted);font-size:12px">AC ${c.ac}</div>
    <div class="conditions-wrap">${conditions.map(cd=>`<span class="condition-tag">${cd}</span>`).join('')}</div>
    <div style="display:flex;gap:4px;margin-left:auto">
      <button class="btn btn-secondary btn-sm" onclick="hpEdit(${c.id},'${c.name.replace(/'/g,"\\'")}',${c.hp},${c.max_hp})">HP</button>
      <button class="btn btn-secondary btn-sm" onclick="initEdit(${c.id},'${c.name.replace(/'/g,"\\'")}',${c.initiative||0})">Init</button>
      <button class="btn btn-secondary btn-sm" onclick="condEdit(${c.id},'${c.conditions.replace(/'/g,"\\'")}')">Cond</button>
      <button class="btn btn-danger btn-sm"    onclick="removeCombatant(${_activeEncounterId},${c.id})">✕</button>
    </div>
    ${c.notes?`<div style="width:100%;font-size:11px;color:var(--muted);padding-top:2px">${c.notes}</div>`:''}
  </div>`;
}

window.hpEdit = (cid, name, currentHp, maxHp) => {
  hpModal(name, currentHp, maxHp, async delta => {
    await api(`/api/encounters/${_activeEncounterId}/hp`, 'PATCH', { combatant_id:cid, delta });
    await refreshTracker();
  });
};

window.initEdit = (cid, name, currentInit) => {
  inputModal(`Initiative — ${name}`, [
    { id:'init', label:'Initiative Roll', type:'number', value:currentInit, min:1 },
  ], async ({ init }) => {
    await api(`/api/encounters/${_activeEncounterId}/initiative`, 'PATCH', { combatant_id:cid, initiative:init });
    await refreshTracker();
  }, 'Set');
};

window.condEdit = (cid, condJson) => {
  const current = JSON.parse(condJson || '[]');
  conditionPickerModal(current, async conditions => {
    await api(`/api/encounters/${_activeEncounterId}/conditions`, 'PATCH', { combatant_id:cid, conditions });
    await refreshTracker();
  });
};

window.removeCombatant = async (eid, cid) => {
  await api(`/api/encounters/${eid}/combatants/${cid}`, 'DELETE');
  await refreshTracker();
};
