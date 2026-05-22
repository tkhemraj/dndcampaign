'use strict';

// ── State & Persistence ───────────────────────────────────────────────────────

let STATE = {campaigns:{}, activeId:null};

function saveState() {
  try { localStorage.setItem('dndcg_v2', JSON.stringify(STATE)); } catch(_) {}
}
function loadState() {
  try {
    const raw=localStorage.getItem('dndcg_v2');
    if (raw) STATE=JSON.parse(raw);
  } catch(_) { STATE={campaigns:{},activeId:null}; }
}
function getActiveCampaign() { return STATE.activeId ? STATE.campaigns[STATE.activeId] : null; }

function createCampaign(name, level, size) {
  const id=uuid();
  STATE.campaigns[id]={
    id, name:name||'My Campaign',
    partyLevel:parseInt(level)||5,
    partySize:parseInt(size)||4,
    notes:'', npcs:[], quests:[], combatHistory:[],
    activeCombat:null,
    created:Date.now(),
  };
  STATE.activeId=id;
  saveState();
  return id;
}

function deleteCampaign(id) {
  delete STATE.campaigns[id];
  if (STATE.activeId===id) STATE.activeId=Object.keys(STATE.campaigns)[0]||null;
  saveState();
}

// ── Router ────────────────────────────────────────────────────────────────────

const VIEWS = {
  welcome:    renderWelcome,
  dashboard:  renderDashboard,
  maps:       renderMaps,
  music:      renderMusic,
  npcs:       renderNPCs,
  encounters: renderEncounters,
  combat:     renderCombat,
  quests:     renderQuests,
  lore:       renderLore,
  spells:     renderSpells,
  rules:      renderRules,
};

let _currentView='';

function navigate(view, push=true) {
  _currentView=view;
  document.getElementById('content').dataset.view = view;
  if (push) history.pushState({view},'',' ');
  document.querySelectorAll('.nav-item').forEach(el=>{
    el.classList.toggle('active', el.dataset.view===view);
  });
  const fn=VIEWS[view];
  if (fn) fn();
  else renderDashboard();
}

window.addEventListener('popstate', ()=>{
  const v=_currentView||'dashboard';
  navigate(v,false);
});

// ── Sidebar ───────────────────────────────────────────────────────────────────

function buildSidebar() {
  const sidebar=document.getElementById('sidebar');
  const camp=getActiveCampaign();
  const campOptions=Object.values(STATE.campaigns).map(c=>
    `<option value="${c.id}" ${c.id===STATE.activeId?'selected':''}>${c.name}</option>`
  ).join('');

  sidebar.innerHTML=`
    <div id="logo">
      <div id="logo-emblem">⚔</div>
      <div id="logo-wordmark">
        <span id="logo-name">DM Toolkit</span>
        <span id="logo-sub">Wildemount Edition</span>
      </div>
    </div>
    <div id="sidebar-body">
      ${Object.keys(STATE.campaigns).length ? `
        <div class="sb-section-label">Campaign</div>
        <div style="padding:4px 10px 8px">
          <select id="camp-select" class="camp-select">${campOptions}</select>
        </div>
      ` : ''}
      <div class="sb-section-label" style="margin-top:4px">Navigate</div>
      <nav class="sidebar-nav">
        <a class="nav-item ${_currentView==='dashboard'?'active':''}" data-view="dashboard" onclick="navigate('dashboard')"><span class="nav-icon">🏠</span><span class="nav-label">Dashboard</span></a>
        <a class="nav-item ${_currentView==='maps'?'active':''}" data-view="maps" onclick="navigate('maps')"><span class="nav-icon">🗺</span><span class="nav-label">Maps</span></a>
        <a class="nav-item ${_currentView==='music'?'active':''}" data-view="music" onclick="navigate('music')"><span class="nav-icon">🎵</span><span class="nav-label">Music</span></a>
        <a class="nav-item ${_currentView==='npcs'?'active':''}" data-view="npcs" onclick="navigate('npcs')"><span class="nav-icon">🧙</span><span class="nav-label">NPCs</span></a>
        <a class="nav-item ${_currentView==='encounters'?'active':''}" data-view="encounters" onclick="navigate('encounters')"><span class="nav-icon">⚔</span><span class="nav-label">Encounters</span></a>
        ${camp&&camp.activeCombat ? `<a class="nav-item nav-combat ${_currentView==='combat'?'active':''}" data-view="combat" onclick="navigate('combat')"><span class="nav-icon">🩸</span><span class="nav-label">Live Combat</span></a>` : ''}
        <a class="nav-item ${_currentView==='quests'?'active':''}" data-view="quests" onclick="navigate('quests')"><span class="nav-icon">📜</span><span class="nav-label">Quests</span></a>
        <a class="nav-item ${_currentView==='lore'?'active':''}" data-view="lore" onclick="navigate('lore')"><span class="nav-icon">📖</span><span class="nav-label">Lore</span></a>
        <a class="nav-item ${_currentView==='spells'?'active':''}" data-view="spells" onclick="navigate('spells')"><span class="nav-icon">✨</span><span class="nav-label">Spells</span></a>
        <a class="nav-item ${_currentView==='rules'?'active':''}" data-view="rules" onclick="navigate('rules')"><span class="nav-icon">📋</span><span class="nav-label">Rules</span></a>
      </nav>
    </div>
    <div class="sidebar-footer">
      <div id="music-mini"></div>
      <button class="btn-new-camp" onclick="showNewCampaignModal()">+ New Campaign</button>
      <a class="btn-discord" href="https://discord.com/api/oauth2/authorize?client_id=1507476166494392420&permissions=117760&scope=bot%20applications.commands" target="_blank" rel="noopener">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057.1 18.082.114 18.105.135 18.12a19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z"/></svg>
        Add to Discord
      </a>
    </div>
  `;

  const sel=document.getElementById('camp-select');
  if (sel) sel.addEventListener('change', e=>{
    STATE.activeId=e.target.value;
    saveState();
    buildSidebar();
    navigate('dashboard');
  });

  if (window.Music) Music.refreshUI();
}

// ── Modal ─────────────────────────────────────────────────────────────────────

function showModal(title, bodyHTML, buttons=[]) {
  const overlay=document.getElementById('modal-overlay');
  document.getElementById('modal-title').textContent=title;
  document.getElementById('modal-body').innerHTML=bodyHTML;
  const btnRow=document.getElementById('modal-buttons');
  btnRow.innerHTML=buttons.map(b=>`<button class="btn ${b.cls||'btn-secondary'}" onclick="${b.action}">${b.label}</button>`).join('');
  overlay.classList.remove('hidden');
}

function closeModal() {
  document.getElementById('modal-overlay').classList.add('hidden');
}

window.closeModal=closeModal;

function showNewCampaignModal() {
  showModal('New Campaign',`
    <label class="form-label">Campaign Name</label>
    <input id="nc-name" class="form-input" type="text" placeholder="The Mighty Nein Adventures" value="">
    <div class="form-row">
      <div>
        <label class="form-label">Party Level</label>
        <input id="nc-level" class="form-input" type="number" min="1" max="20" value="5">
      </div>
      <div>
        <label class="form-label">Party Size</label>
        <input id="nc-size" class="form-input" type="number" min="1" max="8" value="4">
      </div>
    </div>
  `,[
    {label:'Create', cls:'btn-primary', action:'doCreateCampaign()'},
    {label:'Cancel', action:'closeModal()'},
  ]);
}
window.showNewCampaignModal=showNewCampaignModal;

window.doCreateCampaign=function() {
  const name=document.getElementById('nc-name').value.trim()||'My Campaign';
  const level=document.getElementById('nc-level').value;
  const size=document.getElementById('nc-size').value;
  createCampaign(name,level,size);
  closeModal();
  buildSidebar();
  navigate('dashboard');
};

// ── Content render helpers ────────────────────────────────────────────────────

function setContent(html) {
  document.getElementById('content').innerHTML=html;
}

function requireCampaign() {
  if (!getActiveCampaign()) { navigate('welcome'); return false; }
  return true;
}

// ── Welcome ───────────────────────────────────────────────────────────────────

function renderWelcome() {
  setContent(`
    <div class="welcome-wrap">
      <div class="welcome-box">
        <div class="welcome-icon">⚔</div>
        <h1 class="welcome-title">D&D Campaign Generator</h1>
        <p class="welcome-sub">Procedural maps · Live music · NPC & quest generators · Initiative tracker<br>Deep Wildemount / Exandria lore · All local, no server</p>
        <button class="btn btn-primary btn-lg" onclick="showNewCampaignModal()">Create Your First Campaign</button>
      </div>
    </div>
  `);
}

// ── Dashboard ─────────────────────────────────────────────────────────────────

function renderDashboard() {
  if (!requireCampaign()) return;
  const camp=getActiveCampaign();
  const activeQuests=camp.quests.filter(q=>q.status==='Active');
  const completedQuests=camp.quests.filter(q=>q.status==='Completed');
  const aliveNPCs=camp.npcs.filter(n=>n.status!=='dead');
  const totalXP=camp.combatHistory.reduce((s,c)=>s+(c.xp||0),0);
  const recentCombats=camp.combatHistory.slice(-3).reverse();
  const recentNPCs=aliveNPCs.slice(-4).reverse();

  // Standard 5e XP thresholds by level
  const XP_THRESH=[0,300,900,2700,6500,14000,23000,34000,48000,64000,85000,100000,120000,140000,165000,195000,225000,265000,305000,355000,999999];
  const lvl=Math.min(camp.partyLevel||1,19);
  const xpThis=XP_THRESH[lvl-1];
  const xpNext=XP_THRESH[lvl];
  const xpPct=xpNext>xpThis?Math.min(100,Math.round(Math.max(0,totalXP-xpThis)/(xpNext-xpThis)*100)):100;

  const combatBanner=camp.activeCombat?`
    <div class="dash-combat-banner">
      <div>
        <div class="dash-combat-title">🩸 Active Combat: ${camp.activeCombat.name}</div>
        <div class="dash-combat-meta">Round ${camp.activeCombat.round} · ${camp.activeCombat.combatants.filter(c=>!c.defeated).length} combatants remaining · ${camp.activeCombat.xp||0} XP at stake</div>
      </div>
      <button class="btn btn-primary" onclick="navigate('combat')">Resume Combat →</button>
    </div>`:''

  const questsHtml=activeQuests.length
    ? activeQuests.slice(0,5).map(q=>`
        <div class="dash-quest-row" onclick="navigate('quests')">
          <div>
            <span class="dash-quest-title">${q.title}</span>
            ${q.urgency?`<span class="quest-urgency quest-urgency-${(q.urgency||'').toLowerCase()}">${q.urgency}</span>`:''}
          </div>
          <div class="dash-quest-meta">${q.faction||''}${q.type?' · '+q.type:''}</div>
          ${q.acts&&q.acts[0]?`<div class="dash-quest-act">Act 1: ${q.acts[0].title}</div>`:''}
        </div>`).join('')
    : '<p class="empty-msg">No active quests — generate some in Quests</p>';

  const npcsHtml=recentNPCs.length
    ? recentNPCs.map(n=>`
        <div class="dash-npc-row" onclick="navigate('npcs')">
          <span class="dash-npc-name">${n.name}</span>
          <span class="dash-npc-meta">${n.race||''} ${n.npc_class||n.class||''}</span>
          <span class="dash-npc-faction">${n.faction||''}</span>
        </div>`).join('')
    : '<p class="empty-msg">No NPCs yet — generate some in NPCs</p>';

  const combatHistHtml=recentCombats.length
    ? recentCombats.map(c=>{
        const d=new Date(c.ended||c.started||Date.now());
        const dateStr=d.toLocaleDateString('en-US',{month:'short',day:'numeric'});
        const rounds=c.round||1;
        const killed=(c.combatants||[]).filter(x=>x.defeated&&x.type==='monster').length;
        return `<div class="dash-hist-row">
          <div>
            <div class="dash-hist-name">${c.name}</div>
            <div class="dash-hist-meta">${rounds} round${rounds!==1?'s':''} · ${killed} defeated · ${c.xp||0} XP</div>
          </div>
          <span class="dash-hist-date">${dateStr}</span>
        </div>`;
      }).join('')
    : '<p class="empty-msg" style="font-size:12px">No combats yet</p>';

  setContent(`
    <div class="dash-header">
      <div>
        <div class="dash-campaign-name">${camp.name}</div>
        <div class="dash-campaign-meta">Level ${camp.partyLevel} party · ${camp.partySize} players · ${camp.combatHistory.length} encounter${camp.combatHistory.length!==1?'s':''} logged</div>
      </div>
      <button class="btn btn-secondary" onclick="editCampaignModal()">Edit Campaign</button>
    </div>

    ${combatBanner}

    <div class="dash-stats">
      <div class="dash-stat"><div class="dash-stat-num">${aliveNPCs.length}</div><div class="dash-stat-label">NPCs</div></div>
      <div class="dash-stat"><div class="dash-stat-num">${activeQuests.length}</div><div class="dash-stat-label">Active Quests</div></div>
      <div class="dash-stat"><div class="dash-stat-num">${completedQuests.length}</div><div class="dash-stat-label">Completed</div></div>
      <div class="dash-stat"><div class="dash-stat-num">${camp.combatHistory.length}</div><div class="dash-stat-label">Combats</div></div>
      <div class="dash-stat"><div class="dash-stat-num">${totalXP.toLocaleString()}</div><div class="dash-stat-label">XP Earned</div></div>
    </div>

    <div class="dash-xp-bar-wrap">
      <div class="dash-xp-labels">
        <span style="font-size:11px;color:var(--muted)">Level ${lvl}</span>
        <span style="font-size:11px;color:var(--muted)">${totalXP.toLocaleString()} / ${xpNext.toLocaleString()} XP → Level ${lvl+1} &nbsp;<span style="color:var(--accent);font-weight:700">${xpPct}%</span></span>
        <span style="font-size:11px;color:var(--muted)">Level ${lvl+1}</span>
      </div>
      <div class="dash-xp-track"><div class="dash-xp-fill" style="width:${xpPct}%"></div></div>
    </div>

    <div class="dash-main-grid">
      <div class="dash-col-main">
        <div class="dash-panel">
          <div class="panel-header"><span>📜 Active Quests (${activeQuests.length})</span><button class="btn-link" onclick="navigate('quests')">See all →</button></div>
          ${questsHtml}
          <button class="btn btn-secondary btn-sm" style="margin-top:10px" onclick="navigate('quests')">+ Generate Quest</button>
        </div>
        <div class="dash-panel">
          <div class="panel-header"><span>🧙 NPC Roster (${aliveNPCs.length})</span><button class="btn-link" onclick="navigate('npcs')">See all →</button></div>
          ${npcsHtml}
          <button class="btn btn-secondary btn-sm" style="margin-top:10px" onclick="navigate('npcs')">+ Generate NPC</button>
        </div>
      </div>
      <div class="dash-col-side">
        <div class="dash-panel">
          <div class="panel-header"><span>⚡ Quick Actions</span></div>
          <div class="dash-quick-grid">
            <button class="dash-quick-btn" onclick="navigate('encounters')">⚔ Encounter</button>
            <button class="dash-quick-btn" onclick="navigate('maps')">🗺 Map</button>
            <button class="dash-quick-btn" onclick="navigate('npcs')">🧙 NPC</button>
            <button class="dash-quick-btn" onclick="navigate('quests')">📜 Quest</button>
            <button class="dash-quick-btn" onclick="navigate('spells')">✨ Spells</button>
            <button class="dash-quick-btn" onclick="navigate('lore')">📖 Lore</button>
            <button class="dash-quick-btn" onclick="navigate('rules')">📋 Rules</button>
            <button class="dash-quick-btn" onclick="navigate('music')">🎵 Music</button>
          </div>
        </div>
        <div class="dash-panel">
          <div class="panel-header"><span>🩸 Combat History</span></div>
          ${combatHistHtml}
        </div>
        <div class="dash-panel">
          <div class="panel-header"><span>📝 Session Notes</span></div>
          <textarea id="camp-notes" class="form-textarea" placeholder="Session notes, plot threads, reminders…" style="min-height:140px">${camp.notes||''}</textarea>
          <button class="btn btn-secondary btn-sm" style="margin-top:8px" onclick="saveNotes()">Save Notes</button>
        </div>
      </div>
    </div>
  `);
}

window.saveNotes=function(){
  const camp=getActiveCampaign(); if(!camp) return;
  camp.notes=document.getElementById('camp-notes').value;
  saveState();
};

window.editCampaignModal=function(){
  const camp=getActiveCampaign(); if(!camp) return;
  showModal('Edit Campaign',`
    <label class="form-label">Campaign Name</label>
    <input id="ec-name" class="form-input" value="${camp.name}">
    <div class="form-row">
      <div><label class="form-label">Party Level</label><input id="ec-level" class="form-input" type="number" min="1" max="20" value="${camp.partyLevel}"></div>
      <div><label class="form-label">Party Size</label><input id="ec-size" class="form-input" type="number" min="1" max="8" value="${camp.partySize}"></div>
    </div>
    <hr class="modal-hr">
    <button class="btn btn-danger btn-sm" onclick="confirmDeleteCampaign()">Delete Campaign</button>
  `,[
    {label:'Save',cls:'btn-primary',action:'doEditCampaign()'},
    {label:'Cancel',action:'closeModal()'},
  ]);
};

window.doEditCampaign=function(){
  const camp=getActiveCampaign(); if(!camp) return;
  camp.name=document.getElementById('ec-name').value.trim()||camp.name;
  camp.partyLevel=parseInt(document.getElementById('ec-level').value)||camp.partyLevel;
  camp.partySize=parseInt(document.getElementById('ec-size').value)||camp.partySize;
  saveState(); closeModal(); buildSidebar(); renderDashboard();
};

window.confirmDeleteCampaign=function(){
  if(confirm('Delete this campaign? This cannot be undone.')) {
    deleteCampaign(STATE.activeId);
    closeModal(); buildSidebar();
    Object.keys(STATE.campaigns).length ? navigate('dashboard') : navigate('welcome');
  }
};

// ── Maps ──────────────────────────────────────────────────────────────────────

const MAP_TS = 20;
let _currentMap = null;

function _ht(x, y, i) {
  let h = (Math.imul(x * 374761393 + i * 134775813, 1) + Math.imul(y, 1013904223)) >>> 0;
  h = Math.imul(h ^ (h >>> 13), 1540483477) >>> 0;
  return ((h ^ (h >>> 15)) >>> 0) / 4294967295;
}

// void=wall fill, room/corr=floor colors, ao=AO shadow RGB, ink/hi=outline colors
// floorStyle: 'flags'|'wood'|'marble'   joints=joint/grain stroke color
const MAP_PALETTES = {
  standard:     {void:'#0e0c09',room:'#cba87c',corr:'#a88a60',ao:'0,0,0',    ink:'rgba(8,6,4,0.95)',   hi:'rgba(90,65,35,0.60)',  floorStyle:'flags', joints:'rgba(55,35,15,0.28)'},
  crypt:        {void:'#0e0c12',room:'#aaa29a',corr:'#7e7a74',ao:'22,12,32', ink:'rgba(10,7,16,0.95)', hi:'rgba(78,68,98,0.55)',   floorStyle:'flags', joints:'rgba(72,68,82,0.28)'},
  underdark:    {void:'#060410',room:'#483660',corr:'#30244a',ao:'55,0,85',   ink:'rgba(6,3,14,0.95)',  hi:'rgba(68,28,110,0.60)', floorStyle:'flags', joints:'rgba(52,32,72,0.28)'},
  bazzoxan:     {void:'#060410',room:'#483660',corr:'#30244a',ao:'55,0,85',   ink:'rgba(6,3,14,0.95)',  hi:'rgba(68,28,110,0.60)', floorStyle:'flags', joints:'rgba(52,32,72,0.28)'},
  sewers:       {void:'#050c05',room:'#283620',corr:'#1c2616',ao:'0,28,0',   ink:'rgba(3,8,3,0.95)',   hi:'rgba(28,68,18,0.50)',  floorStyle:'flags', joints:'rgba(18,38,12,0.32)'},
  cerberus_lab: {void:'#0c0c18',room:'#bec2ca',corr:'#868e9e',ao:'14,14,38', ink:'rgba(7,7,20,0.95)',  hi:'rgba(108,108,158,0.50)',floorStyle:'flags', joints:'rgba(78,88,110,0.22)'},
  tavern:       {void:'#120c04',room:'#b87e1a',corr:'#886008',ao:'32,14,0',  ink:'rgba(10,4,1,0.95)',  hi:'rgba(128,68,8,0.55)',  floorStyle:'wood',  joints:'rgba(38,18,4,0.18)'},
  castle:       {void:'#121008',room:'#beb69a',corr:'#8e8878',ao:'18,14,10', ink:'rgba(9,7,5,0.95)',   hi:'rgba(108,98,78,0.50)', floorStyle:'flags', joints:'rgba(62,58,50,0.28)'},
  ship:         {void:'#0c0802',room:'#784e24',corr:'#543814',ao:'26,14,0',  ink:'rgba(7,3,1,0.95)',   hi:'rgba(88,52,12,0.50)',  floorStyle:'wood',  joints:'rgba(28,12,3,0.20)'},
  temple:       {void:'#0a0a10',room:'#e2ded6',corr:'#b8b4ac',ao:'10,10,20', ink:'rgba(5,5,12,0.95)',  hi:'rgba(188,178,148,0.50)',floorStyle:'marble',joints:'rgba(138,128,148,0.22)'},
  mansion:      {void:'#0c0a08',room:'#cec2a2',corr:'#9e9276',ao:'14,10,7',  ink:'rgba(7,5,3,0.95)',   hi:'rgba(138,118,78,0.50)',floorStyle:'wood',  joints:'rgba(78,62,38,0.20)'},
};
function _pal(theme) { return MAP_PALETTES[theme] || MAP_PALETTES.standard; }

let _tokenMode = null;
let _tokenCounts = {player:0, enemy:0, npc:0};
const TOKEN_COLORS = {player:'#d4a017', enemy:'#c42020', npc:'#1a5bb5'};
const TOKEN_PFX    = {player:'P', enemy:'M', npc:'N'};

const AVATAR_SETS = {
  player: ['🧙','⚔️','🏹','🗡️','🛡️','🌿','⚡','📿','🎭','🥊','🔮','🪓'],
  enemy:  ['👹','💀','🐉','🕷️','🦇','👿','🧟','🐺','🦂','🐍','🦁','🐻'],
  npc:    ['👴','👵','🧝','🧛','🧜','🧞','🤴','👸','🧑‍🏫','🧑‍⚕️','🧑‍🍳','🎲'],
};
let _pendingAvatar = null;
let _fogCtx = null;
let _fogBrushRadius = 2;
let _mapHUD = { round:1, counters:[], timers:[] };
let _timerInterval = null;

function renderMaps() {
  const typeOpts=MAP_TYPES.map(t=>`<option value="${t.value}">${t.label}</option>`).join('');
  const firstType=MAP_TYPES[0];
  const subOpts=firstType.subs.map(s=>`<option value="${s.value}">${s.label}</option>`).join('');

  setContent(`
    <div class="view-header">
      <div>
        <h1>Maps</h1>
        <span class="subtitle">Procedural dungeon, outdoor & Wildemount maps — canvas rendered</span>
      </div>
    </div>
    <div class="gen-panel">
      <div class="gen-panel-fields">
        <div class="form-group"><label>Map Type</label><select id="map-type" class="form-select" onchange="updateMapSubs()">${typeOpts}</select></div>
        <div class="form-group"><label>Sub-type</label><select id="map-sub" class="form-select">${subOpts}</select></div>
      </div>
      <div style="display:flex;gap:8px;flex-shrink:0;align-self:flex-end">
        <button class="btn btn-primary gen-panel-btn" onclick="doGenerateMap()">⚙ Generate</button>
        <button class="btn btn-secondary" onclick="exportMapPNG()" id="btn-export" style="display:none">↓ PNG</button>
        ${getActiveCampaign()?`<button class="btn btn-secondary" onclick="saveMapToCampaign()" id="btn-save-map" style="display:none">💾 Save</button>`:''}
      </div>
    </div>
    <div class="map-wrap" id="map-wrap">
      <div class="map-placeholder">Select a type and click Generate Map</div>
    </div>
    <div class="token-toolbar" id="token-toolbar" style="display:none">
      <div class="token-row">
        <span class="token-label">Place:</span>
        <button class="token-btn" data-type="player" onclick="setTokenMode('player')">⬤ Player</button>
        <button class="token-btn" data-type="enemy"  onclick="setTokenMode('enemy')">⬤ Monster</button>
        <button class="token-btn" data-type="npc"    onclick="setTokenMode('npc')">⬤ NPC</button>
        <button class="token-btn token-btn-clear" onclick="clearTokens()">✕ Clear</button>
      </div>
      <div class="token-row" id="avatar-row" style="display:none">
        <span class="token-label">Avatar:</span>
        <div class="avatar-strip" id="avatar-strip"></div>
      </div>
      <div class="token-row">
        <span class="token-label">Fog:</span>
        <button class="token-btn" id="btn-fog-toggle" onclick="toggleFogEnabled()">🌫 Off</button>
        <button class="token-btn" data-type="reveal" onclick="setTokenMode('reveal')">☀ Reveal</button>
        <button class="token-btn" data-type="hide"   onclick="setTokenMode('hide')">☁ Hide</button>
        <button class="token-btn" onclick="fogRevealAll()" title="Reveal entire map">☀ All</button>
        <button class="token-btn" onclick="fogResetAll()" title="Hide all floor tiles">☁ Reset</button>
        <button class="token-btn" id="btn-fog-view" onclick="toggleFogView()">👁 DM View</button>
      </div>
      <div class="token-row">
        <span class="token-label">Brush:</span>
        <button class="token-btn fog-brush-btn" data-r="1" onclick="setFogBrush(1)">1</button>
        <button class="token-btn fog-brush-btn active" data-r="2" onclick="setFogBrush(2)">2</button>
        <button class="token-btn fog-brush-btn" data-r="3" onclick="setFogBrush(3)">3</button>
        <button class="token-btn fog-brush-btn" data-r="4" onclick="setFogBrush(4)">4</button>
        <span style="font-size:11px;color:var(--muted)">tile radius (fog painting)</span>
      </div>
      <div class="token-row"><span id="token-hint" class="token-hint"></span></div>
    </div>
    <div class="map-hud" id="map-hud" style="display:none">
      <div class="hud-row">
        <div class="hud-section">
          <span class="hud-label">Round</span>
          <button class="hud-btn" onclick="adjustRound(-1)">−</button>
          <span class="hud-num" id="hud-round">1</span>
          <button class="hud-btn" onclick="adjustRound(1)">+</button>
        </div>
        <div class="hud-divider"></div>
        <div id="hud-timers-wrap" class="hud-flex"></div>
        <div id="hud-counters-wrap" class="hud-flex"></div>
        <div class="hud-section">
          <button class="hud-add" onclick="addMapCounter()">+ Counter</button>
          <button class="hud-add" onclick="addMapTimer()">+ Timer</button>
        </div>
      </div>
    </div>
    <div class="map-legend-row" id="map-legend"></div>
  `);

  window.updateMapSubs=function(){
    const type=document.getElementById('map-type').value;
    const mt=MAP_TYPES.find(t=>t.value===type);
    document.getElementById('map-sub').innerHTML=(mt?.subs||[]).map(s=>`<option value="${s.value}">${s.label}</option>`).join('');
  };
}

window.doGenerateMap=function(){
  const type=document.getElementById('map-type').value;
  const sub=document.getElementById('map-sub').value;
  _tokenMode=null; _tokenCounts={player:0,enemy:0,npc:0};
  _pendingAvatar=null; _fogCtx=null; _fogBrushRadius=2; window._ctxMapData=null;
  if (_timerInterval) { clearInterval(_timerInterval); _timerInterval=null; }
  _mapHUD = { round:1, counters:[], timers:[] };
  document.querySelectorAll('.token-btn[data-type]').forEach(b=>b.classList.remove('active'));
  const avatarRow=document.getElementById('avatar-row');
  if (avatarRow) avatarRow.style.display='none';
  _currentMap=generateMap(type,sub);
  drawMapCanvas(_currentMap);
  document.getElementById('btn-export').style.display='';
  document.getElementById('token-toolbar').style.display='';
  document.getElementById('map-hud').style.display='';
  const hudRound=document.getElementById('hud-round');
  if (hudRound) hudRound.textContent='1';
  document.getElementById('hud-timers-wrap').innerHTML='';
  document.getElementById('hud-counters-wrap').innerHTML='';
  const fogBtn=document.getElementById('btn-fog-toggle');
  if (fogBtn) { fogBtn.textContent='🌫 Off'; fogBtn.classList.remove('active'); }
  const viewBtn=document.getElementById('btn-fog-view');
  if (viewBtn) { viewBtn.textContent='👁 DM View'; viewBtn.classList.remove('active'); }
  const btnSave=document.getElementById('btn-save-map');
  if (btnSave) btnSave.style.display='';
};

window.exportMapPNG=function(){
  const canvas=document.getElementById('map-canvas');
  if (!canvas||!_currentMap) return;
  const a=document.createElement('a');
  a.href=canvas.toDataURL('image/png');
  a.download=(_currentMap.title||'map').replace(/[\s/]+/g,'_')+'.png';
  a.click();
};

window.saveMapToCampaign=function(){
  const camp=getActiveCampaign(); if(!camp||!_currentMap) return;
  if (!camp.savedMaps) camp.savedMaps=[];
  camp.savedMaps.push({id:uuid(),title:_currentMap.title,saved:Date.now()});
  saveState();
  showToast(`Map saved: ${_currentMap.title}`);
};

function drawMapCanvas(mapData) {
  const wrap = document.getElementById('map-wrap');
  wrap.innerHTML = '';
  const TS = MAP_TS, W = mapData.W, H = mapData.H;
  const theme = mapData.mapTheme || 'standard';
  const pal = _pal(theme);
  if (!mapData.tokens) mapData.tokens = [];

  // ── Title + zoom controls row ──────────────────────────────────────────────
  let _zoom = 1.0;
  const ZOOM_STEP = 0.25, ZOOM_MIN = 0.25, ZOOM_MAX = 4.0;

  const titleRow = document.createElement('div');
  titleRow.style.cssText = 'display:flex;align-items:center;gap:10px;margin-bottom:6px;';

  const titleEl = document.createElement('div');
  titleEl.className = 'map-title';
  titleEl.style.flex = '1';
  titleEl.textContent = mapData.title;
  titleRow.appendChild(titleEl);

  const zoomBar = document.createElement('div');
  zoomBar.style.cssText = 'display:flex;align-items:center;gap:4px;background:var(--surface);border:1px solid var(--border);border-radius:6px;padding:2px 6px;';
  zoomBar.innerHTML = `<button class="map-zoom-btn" id="mzout" title="Zoom out">−</button><span class="map-zoom-label" id="mzlbl">100%</span><button class="map-zoom-btn" id="mzin" title="Zoom in">+</button><button class="map-zoom-btn map-zoom-reset" id="mzrst" title="Reset">⤢</button>`;
  titleRow.appendChild(zoomBar);
  wrap.appendChild(titleRow);

  const scroll = document.createElement('div');
  scroll.style.cssText = `overflow:auto;max-height:560px;border-radius:4px;position:relative;background:${pal.void};`;
  wrap.appendChild(scroll);

  const canvas = document.createElement('canvas');
  canvas.id = 'map-canvas';
  canvas.width = W*TS; canvas.height = H*TS;
  canvas.style.cssText = 'display:block;';
  scroll.appendChild(canvas);

  const ovCanvas = document.createElement('canvas');
  ovCanvas.id = 'token-canvas';
  ovCanvas.width = W*TS; ovCanvas.height = H*TS;
  ovCanvas.style.cssText = 'position:absolute;top:0;left:0;cursor:crosshair;';
  scroll.appendChild(ovCanvas);

  const fogCv = document.createElement('canvas');
  fogCv.id = 'fog-canvas';
  fogCv.width = W*TS; fogCv.height = H*TS;
  fogCv.style.cssText = 'position:absolute;top:0;left:0;pointer-events:none;';
  scroll.appendChild(fogCv);
  _fogCtx = fogCv.getContext('2d');

  function _applyZoom(pivotX, pivotY) {
    const newW = Math.round(W*TS*_zoom), newH = Math.round(H*TS*_zoom);
    const oldW = canvas.offsetWidth || W*TS;
    const oldH = canvas.offsetHeight || H*TS;
    const rx = (scroll.scrollLeft + (pivotX ?? scroll.clientWidth/2)) / oldW;
    const ry = (scroll.scrollTop  + (pivotY ?? scroll.clientHeight/2)) / oldH;
    [canvas, ovCanvas, fogCv].forEach(c => {
      c.style.width = newW+'px'; c.style.height = newH+'px';
    });
    canvas.style.imageRendering = ovCanvas.style.imageRendering = _zoom >= 2 ? 'pixelated' : 'auto';
    scroll.scrollLeft = rx*newW - (pivotX ?? scroll.clientWidth/2);
    scroll.scrollTop  = ry*newH - (pivotY ?? scroll.clientHeight/2);
    document.getElementById('mzlbl').textContent = Math.round(_zoom*100)+'%';
  }

  function _zoomBy(delta, pivotX, pivotY) {
    _zoom = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, Math.round((_zoom+delta)*100)/100));
    _applyZoom(pivotX, pivotY);
  }

  document.getElementById('mzin').addEventListener('click', () => _zoomBy(+ZOOM_STEP));
  document.getElementById('mzout').addEventListener('click', () => _zoomBy(-ZOOM_STEP));
  document.getElementById('mzrst').addEventListener('click', () => { _zoom=1.0; _applyZoom(); });
  scroll.addEventListener('wheel', e => {
    e.preventDefault();
    const r = scroll.getBoundingClientRect();
    _zoomBy(e.deltaY<0 ? +ZOOM_STEP : -ZOOM_STEP, e.clientX-r.left, e.clientY-r.top);
  }, {passive:false});

  const ctxMenu = document.createElement('div');
  ctxMenu.id = 'map-ctx-menu';
  ctxMenu.className = 'map-ctx-menu hidden';
  scroll.appendChild(ctxMenu);

  const ctx = canvas.getContext('2d');
  const ovCtx = ovCanvas.getContext('2d');
  const g = mapData.grid;

  function tileAt(tx,ty) {
    if (tx<0||ty<0||tx>=W||ty>=H) return T.WALL;
    return (g[ty]?.[tx])??T.WALL;
  }
  function isWall(tx,ty){return tileAt(tx,ty)===T.WALL;}
  function isOpen(tx,ty){return tileAt(tx,ty)!==T.WALL;}
  function inRoom(tx,ty){
    if (!mapData.rooms||!mapData.rooms.length) return false;
    return mapData.rooms.some(r=>tx>=r.x&&tx<r.x+r.w&&ty>=r.y&&ty<r.y+r.h);
  }

  // P1 — void fill
  ctx.fillStyle=pal.void; ctx.fillRect(0,0,W*TS,H*TS);

  // P2 — floor tiles (theme-colored)
  for (let y=0;y<H;y++) for (let x=0;x<W;x++) {
    const t=tileAt(x,y); if (t!==T.WALL) _mapTile(ctx,x,y,t,TS,inRoom(x,y),pal);
  }

  // P3 — floor style: flagstone / wood planks / marble veins
  const fl=pal.floorStyle||'flags';
  for (let y=0;y<H;y++) for (let x=0;x<W;x++) {
    if (isWall(x,y)) continue;
    const px=x*TS, py=y*TS, r=(i)=>_ht(x,y,i);
    if (fl==='flags') {
      ctx.strokeStyle=pal.joints||'rgba(55,35,15,0.28)'; ctx.lineWidth=0.5;
      if (x%2===0){ctx.beginPath();ctx.moveTo(px,py);ctx.lineTo(px,py+TS);ctx.stroke();}
      if (y%2===0){ctx.beginPath();ctx.moveTo(px,py);ctx.lineTo(px+TS,py);ctx.stroke();}
    } else if (fl==='wood') {
      if (y%2===0){ctx.strokeStyle=pal.joints||'rgba(40,20,5,0.16)';ctx.lineWidth=0.6;ctx.beginPath();ctx.moveTo(px,py);ctx.lineTo(px+TS,py);ctx.stroke();}
      if (r(70)>0.42){ctx.strokeStyle='rgba(0,0,0,0.055)';ctx.lineWidth=0.4;const gy=py+r(71)*TS;ctx.beginPath();ctx.moveTo(px,gy);ctx.lineTo(px+TS,gy+(r(72)-.5)*5);ctx.stroke();}
    } else if (fl==='marble') {
      if (inRoom(x,y)&&r(70)>0.52){ctx.strokeStyle=pal.joints||'rgba(140,130,150,0.22)';ctx.lineWidth=0.4+r(71)*0.6;ctx.beginPath();ctx.moveTo(px+r(72)*TS,py+r(73)*TS);ctx.quadraticCurveTo(px+TS*.5,py+TS*.5,px+r(74)*TS,py+r(75)*TS);ctx.stroke();}
    }
  }

  // P4 — theme accent details (bones, bioluminescence, arcane runes)
  for (let y=0;y<H;y++) for (let x=0;x<W;x++) {
    if (isWall(x,y)) continue;
    const px=x*TS, py=y*TS, r=(i)=>_ht(x,y,i);
    if (theme==='crypt'&&inRoom(x,y)&&r(70)>0.93) {
      ctx.strokeStyle='rgba(130,122,112,0.32)';ctx.lineWidth=0.9;
      ctx.beginPath();ctx.moveTo(px+TS*.35,py+TS*.15);ctx.lineTo(px+TS*.35,py+TS*.85);ctx.stroke();
      ctx.beginPath();ctx.moveTo(px+TS*.12,py+TS*.38);ctx.lineTo(px+TS*.58,py+TS*.38);ctx.stroke();
    }
    if ((theme==='underdark'||theme==='bazzoxan')&&r(80)>0.87) {
      ctx.fillStyle=`rgba(55,195,255,${0.32+r(81)*0.48})`;
      ctx.beginPath();ctx.arc(px+r(82)*TS,py+r(83)*TS,0.6+r(84)*1.4,0,Math.PI*2);ctx.fill();
    }
    if (theme==='cerberus_lab'&&inRoom(x,y)&&r(70)>0.95) {
      ctx.strokeStyle='rgba(88,108,225,0.32)';ctx.lineWidth=0.7;
      ctx.beginPath();ctx.arc(px+TS*.5,py+TS*.5,TS*.33,0,Math.PI*2);ctx.stroke();
      ctx.beginPath();ctx.moveTo(px+TS*.17,py+TS*.5);ctx.lineTo(px+TS*.83,py+TS*.5);ctx.stroke();
    }
    if (theme==='sewers'&&r(70)>0.88) {
      ctx.fillStyle=`rgba(20,48,14,${0.28+r(71)*0.30})`;
      ctx.fillRect(px,py,TS,TS);
    }
  }

  // P5 — ambient occlusion
  const aoRgb=pal.ao||'0,0,0', aoW=TS*0.72;
  for (let y=0;y<H;y++) for (let x=0;x<W;x++) {
    if (isWall(x,y)) continue;
    const px=x*TS, py=y*TS;
    [[0,-1,px,py,px,py+aoW],[0,1,px,py+TS,px,py+TS-aoW],
     [-1,0,px,py,px+aoW,py],[1,0,px+TS,py,px+TS-aoW,py]
    ].forEach(([dx,dy,gx0,gy0,gx1,gy1])=>{
      if (!isWall(x+dx,y+dy)) return;
      const gr=ctx.createLinearGradient(gx0,gy0,gx1,gy1);
      gr.addColorStop(0,`rgba(${aoRgb},0.58)`); gr.addColorStop(1,`rgba(${aoRgb},0)`);
      ctx.fillStyle=gr; ctx.fillRect(px,py,TS,TS);
    });
  }

  // P6 — thick ink outlines at wall→floor edges
  for (let y=0;y<H;y++) for (let x=0;x<W;x++) {
    if (!isWall(x,y)) continue;
    const px=x*TS, py=y*TS;
    if (isOpen(x,y+1)){ctx.strokeStyle=pal.hi;ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(px,py+TS-1);ctx.lineTo(px+TS,py+TS-1);ctx.stroke();ctx.strokeStyle=pal.ink;ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(px,py+TS);ctx.lineTo(px+TS,py+TS);ctx.stroke();}
    if (isOpen(x,y-1)){ctx.strokeStyle=pal.ink;ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(px,py);ctx.lineTo(px+TS,py);ctx.stroke();}
    if (isOpen(x+1,y)){ctx.strokeStyle=pal.ink;ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(px+TS,py);ctx.lineTo(px+TS,py+TS);ctx.stroke();}
    if (isOpen(x-1,y)){ctx.strokeStyle=pal.ink;ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(px,py);ctx.lineTo(px,py+TS);ctx.stroke();}
  }

  // P7 — feature overlays
  for (let y=0;y<H;y++) for (let x=0;x<W;x++) _mapFeature(ctx,x,y,tileAt(x,y),TS);

  // P8 — subtle 5-foot grid
  ctx.strokeStyle='rgba(0,0,0,0.06)';ctx.lineWidth=0.3;
  for (let xi=0;xi<=W;xi++){ctx.beginPath();ctx.moveTo(xi*TS,0);ctx.lineTo(xi*TS,H*TS);ctx.stroke();}
  for (let yi=0;yi<=H;yi++){ctx.beginPath();ctx.moveTo(0,yi*TS);ctx.lineTo(W*TS,yi*TS);ctx.stroke();}

  // P9 — room labels
  if (mapData.labels&&mapData.labels.length) {
    const fs=Math.max(8,Math.floor(TS*0.38));
    ctx.font=`bold ${fs}px serif`;ctx.textAlign='center';ctx.textBaseline='middle';
    mapData.labels.forEach(l=>{
      const lx=l.x*TS+TS/2, ly=l.y*TS+TS/2, tw=ctx.measureText(l.text).width;
      ctx.fillStyle='rgba(10,8,5,0.84)';ctx.fillRect(lx-tw/2-4,ly-fs/2-3,tw+8,fs+6);
      ctx.fillStyle='#e8b840';ctx.fillText(l.text,lx,ly);
    });
  }

  // P10 — edge vignette (atmospheric depth)
  const vgCX=W*TS/2, vgCY=H*TS/2;
  const vgR1=Math.min(W*TS,H*TS)*0.28, vgR2=Math.max(W*TS,H*TS)*0.80;
  const vg=ctx.createRadialGradient(vgCX,vgCY,vgR1,vgCX,vgCY,vgR2);
  vg.addColorStop(0,'rgba(0,0,0,0)'); vg.addColorStop(1,'rgba(0,0,0,0.52)');
  ctx.fillStyle=vg; ctx.fillRect(0,0,W*TS,H*TS);

  // P11 — compass rose (bottom-right corner)
  const crSz = Math.max(26, Math.min(W,H)*TS*0.048);
  _drawCompassRose(ctx, W*TS - crSz - 14, H*TS - crSz - 14, crSz, pal);

  // Fog init + first render
  initFog(mapData);
  renderFog(_fogCtx, mapData, W, H, TS);

  const legendEl=document.getElementById('map-legend');
  if (legendEl) legendEl.innerHTML=[
    [pal.void,'Wall'],[pal.room,'Room'],[pal.corr,'Corridor'],['#5a2e10','Door'],
    ['#1e4a70','Water'],['#380902','Lava'],['#142210','Trees'],['#8a7558','Road'],['#3a2e1e','Rubble'],
  ].map(([c,n])=>`<span class="legend-item"><span class="legend-dot" style="background:${c}"></span>${n}</span>`).join('');

  // ── Token overlay ─────────────────────────────────────────────────────────────
  _drawTokens(ovCtx,mapData.tokens,W,H,TS,null);

  let _drag=null, _fogPaint=false;
  function cvXY(e){
    const rc=ovCanvas.getBoundingClientRect();
    // scale from screen-space back to canvas-space
    const sx=ovCanvas.width/rc.width;
    const px=(e.clientX-rc.left)*sx, py=(e.clientY-rc.top)*sx;
    return {px,py,tx:Math.floor(px/TS),ty:Math.floor(py/TS)};
  }
  function touchXY(e){
    const t=e.touches[0]||e.changedTouches[0];
    const rc=ovCanvas.getBoundingClientRect();
    const sx=ovCanvas.width/rc.width;
    const px=(t.clientX-rc.left)*sx, py=(t.clientY-rc.top)*sx;
    return {px,py,tx:Math.floor(px/TS),ty:Math.floor(py/TS)};
  }

  ovCanvas.addEventListener('mousedown',e=>{
    ctxMenu.classList.add('hidden');
    const {px,py,tx,ty}=cvXY(e);
    if (_tokenMode==='reveal'||_tokenMode==='hide'){
      _fogPaint=true;
      paintFog(mapData,tx,ty,_tokenMode==='reveal',_fogBrushRadius);
      renderFog(_fogCtx,mapData,W,H,TS);
      return;
    }
    const tok=mapData.tokens.find(t=>t.x===tx&&t.y===ty);
    if (tok){_drag={id:tok.id,px,py};_drawTokens(ovCtx,mapData.tokens,W,H,TS,_drag);}
    else if (_tokenMode){_placeToken(mapData,tx,ty);_drawTokens(ovCtx,mapData.tokens,W,H,TS,null);}
  });
  ovCanvas.addEventListener('mousemove',e=>{
    const {px,py,tx,ty}=cvXY(e);
    if (_fogPaint){
      paintFog(mapData,tx,ty,_tokenMode==='reveal',_fogBrushRadius);
      renderFog(_fogCtx,mapData,W,H,TS);
      return;
    }
    if (!_drag) return;
    _drag.px=px; _drag.py=py;
    _drawTokens(ovCtx,mapData.tokens,W,H,TS,_drag);
  });
  ovCanvas.addEventListener('mouseup',e=>{
    _fogPaint=false;
    if (!_drag) return;
    const {tx,ty}=cvXY(e);
    const tok=mapData.tokens.find(t=>t.id===_drag.id);
    if (tok){
      tok.x=Math.max(0,Math.min(W-1,tx)); tok.y=Math.max(0,Math.min(H-1,ty));
      if (tok.type==='player') { revealAround(mapData,tok.x,tok.y,6); renderFog(_fogCtx,mapData,W,H,TS); }
    }
    _drag=null; _drawTokens(ovCtx,mapData.tokens,W,H,TS,null);
  });
  ovCanvas.addEventListener('mouseleave',()=>{
    _fogPaint=false;
    if (!_drag) return; _drag=null; _drawTokens(ovCtx,mapData.tokens,W,H,TS,null);
  });
  ovCanvas.addEventListener('contextmenu',e=>{
    e.preventDefault();
    const {px,py,tx,ty}=cvXY(e);
    const tok=mapData.tokens.find(t=>t.x===tx&&t.y===ty);
    if (tok){
      window._ctxMapData=mapData;
      const hpLine=tok.hp!==undefined?`${tok.hp}/${tok.maxHp} HP · `:'';
      ctxMenu.innerHTML=`
        <div class="map-ctx-title">${tok.avatar||''} ${tok.label} &nbsp;<span style="color:var(--muted);font-weight:400">${hpLine}${tok.type}</span></div>
        <button class="map-ctx-item" onclick="tokenRename('${tok.id}')">✏ Rename / Avatar</button>
        <button class="map-ctx-item" onclick="tokenSetHP('${tok.id}')">❤ Set HP / AC</button>
        <button class="map-ctx-item map-ctx-danger" onclick="tokenRemove('${tok.id}')">✕ Remove Token</button>`;
      ctxMenu.style.left=`${Math.min(px,ovCanvas.width-155)}px`;
      ctxMenu.style.top=`${Math.min(py,ovCanvas.height-115)}px`;
      ctxMenu.classList.remove('hidden');
    } else {
      ctxMenu.classList.add('hidden');
    }
  });

  // Touch support
  ovCanvas.addEventListener('touchstart',e=>{
    e.preventDefault();
    ctxMenu.classList.add('hidden');
    const c=touchXY(e);
    if (_tokenMode==='reveal'||_tokenMode==='hide'){
      _fogPaint=true;
      paintFog(mapData,c.tx,c.ty,_tokenMode==='reveal',_fogBrushRadius);
      renderFog(_fogCtx,mapData,W,H,TS); return;
    }
    const tok=mapData.tokens.find(t=>t.x===c.tx&&t.y===c.ty);
    if(tok){_drag={id:tok.id,px:c.px,py:c.py};_drawTokens(ovCtx,mapData.tokens,W,H,TS,_drag);}
    else if(_tokenMode){_placeToken(mapData,c.tx,c.ty);_drawTokens(ovCtx,mapData.tokens,W,H,TS,null);}
  },{passive:false});
  ovCanvas.addEventListener('touchmove',e=>{
    e.preventDefault();
    const c=touchXY(e);
    if(_fogPaint){paintFog(mapData,c.tx,c.ty,_tokenMode==='reveal',_fogBrushRadius);renderFog(_fogCtx,mapData,W,H,TS);return;}
    if(!_drag) return;
    _drag.px=c.px; _drag.py=c.py;
    _drawTokens(ovCtx,mapData.tokens,W,H,TS,_drag);
  },{passive:false});
  ovCanvas.addEventListener('touchend',e=>{
    e.preventDefault();
    _fogPaint=false;
    if(!_drag) return;
    const c=touchXY(e);
    const tok=mapData.tokens.find(t=>t.id===_drag.id);
    if(tok){
      tok.x=Math.max(0,Math.min(W-1,c.tx)); tok.y=Math.max(0,Math.min(H-1,c.ty));
      if(tok.type==='player'){revealAround(mapData,tok.x,tok.y,6);renderFog(_fogCtx,mapData,W,H,TS);}
    }
    _drag=null; _drawTokens(ovCtx,mapData.tokens,W,H,TS,null);
  },{passive:false});
}

function _mapTile(ctx, x, y, t, TS, isInRoom, pal) {
  const px = x*TS, py = y*TS;
  const r = (i) => _ht(x, y, i);
  const floorBase = isInRoom ? (pal.room||'#cba87c') : (pal.corr||'#a88a60');

  if (t === T.FLOOR || t === T.PILLAR || t === T.CHEST || t === T.STAIRS || t === T.TRAP) {
    ctx.fillStyle = floorBase; ctx.fillRect(px, py, TS, TS);
    if (r(90) > 0.82) { ctx.fillStyle = 'rgba(0,0,0,0.09)'; ctx.fillRect(px,py,TS,TS); }
    return;
  }
  if (t === T.DOOR) {
    ctx.fillStyle = floorBase; ctx.fillRect(px, py, TS, TS);
    const dw=TS*.55, dh=TS*.80, dx=px+(TS-dw)/2, dy=py+(TS-dh)/2;
    ctx.fillStyle = 'rgba(0,0,0,0.30)'; ctx.fillRect(dx+2,dy+2,dw,dh);
    ctx.fillStyle = '#5a2e10'; ctx.fillRect(dx,dy,dw,dh);
    ctx.fillStyle = '#482208';
    ctx.fillRect(dx+2,dy+2,dw-4,dh*.44); ctx.fillRect(dx+2,dy+dh*.52,dw-4,dh*.44);
    ctx.fillStyle = '#c8973c'; ctx.beginPath(); ctx.arc(dx+dw*.76,dy+dh*.5,2.2,0,Math.PI*2); ctx.fill();
    ctx.strokeStyle = '#1a0804'; ctx.lineWidth = 0.8; ctx.strokeRect(dx,dy,dw,dh);
    return;
  }
  if (t === T.WATER) {
    const gw = ctx.createLinearGradient(px,py,px,py+TS);
    gw.addColorStop(0,'#1e4a70'); gw.addColorStop(1,'#0c2840');
    ctx.fillStyle = gw; ctx.fillRect(px,py,TS,TS);
    ctx.strokeStyle = 'rgba(120,200,255,0.22)'; ctx.lineWidth = 1;
    for (let wi = 0; wi < 3; wi++) {
      const wy = py+(wi+0.65)*TS/3.1;
      ctx.beginPath(); ctx.moveTo(px, wy+Math.sin((x+wi)*.85)*2);
      ctx.bezierCurveTo(px+TS*.33,wy+Math.sin((x+wi)*.85+1.1)*2, px+TS*.66,wy+Math.sin((x+wi)*.85+2.2)*2, px+TS,wy+Math.sin((x+wi)*.85+3.3)*2);
      ctx.stroke();
    }
    return;
  }
  if (t === T.LAVA) {
    ctx.fillStyle = '#380902'; ctx.fillRect(px,py,TS,TS);
    for (let ci = 0; ci < 3; ci++) {
      const lx1=px+r(ci*7)*TS, ly1=py+r(ci*7+1)*TS, lx2=px+r(ci*7+2)*TS, ly2=py+r(ci*7+3)*TS;
      const gl = ctx.createLinearGradient(lx1,ly1,lx2,ly2);
      gl.addColorStop(0,'rgba(255,80,0,0)'); gl.addColorStop(.5,r(ci*7+4)>.5?'#ff5500':'#ff8800'); gl.addColorStop(1,'rgba(255,80,0,0)');
      ctx.strokeStyle = gl; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(lx1,ly1); ctx.lineTo(lx2,ly2); ctx.stroke();
    }
    return;
  }
  if (t === T.TREES) {
    ctx.fillStyle = '#142210'; ctx.fillRect(px,py,TS,TS);
    const numT = 1+(r(0)>.58?1:0);
    for (let ti = 0; ti < numT; ti++) {
      const tcx=px+4+r(ti*7+1)*(TS-8), tcy=py+4+r(ti*7+2)*(TS-8), trad=4+r(ti*7+3)*5;
      const green = Math.floor(72+r(ti*7+4)*45);
      ctx.fillStyle = `rgba(22,${green},15,0.93)`; ctx.beginPath(); ctx.arc(tcx,tcy,trad,0,Math.PI*2); ctx.fill();
      ctx.fillStyle = 'rgba(0,0,0,0.22)'; ctx.beginPath(); ctx.arc(tcx+.8,tcy+1,trad*.52,0,Math.PI*2); ctx.fill();
    }
    return;
  }
  if (t === T.ROAD) {
    ctx.fillStyle = '#8a7558'; ctx.fillRect(px,py,TS,TS);
    return;
  }
  if (t === T.RUBBLE) {
    ctx.fillStyle = '#3a2e1e'; ctx.fillRect(px,py,TS,TS);
    for (let ri = 0; ri < 4; ri++) {
      const rfx=px+r(ri*7)*TS, rfy=py+r(ri*7+1)*TS, rfw=2+r(ri*7+2)*4, rfh=1+r(ri*7+3)*3;
      ctx.save(); ctx.translate(rfx+rfw/2,rfy+rfh/2); ctx.rotate(r(ri*7+4)*Math.PI);
      ctx.fillStyle = ri%2===0 ? 'rgba(95,78,55,0.85)' : 'rgba(48,38,25,0.85)';
      ctx.fillRect(-rfw/2,-rfh/2,rfw,rfh); ctx.restore();
    }
    return;
  }
  if (t === T.GRASS) {
    const gv = r(40);
    ctx.fillStyle = `rgb(${Math.floor(28+gv*14)},${Math.floor(72+gv*32)},${Math.floor(18+gv*10)})`; ctx.fillRect(px,py,TS,TS);
    return;
  }
  if (t === T.DIRT) {
    const dv = r(50);
    ctx.fillStyle = `rgb(${Math.floor(130+dv*22)},${Math.floor(100+dv*18)},${Math.floor(60+dv*14)})`; ctx.fillRect(px,py,TS,TS);
    return;
  }
  if (t === T.SNOW) {
    const sv = r(60);
    ctx.fillStyle = `rgb(${Math.floor(208+sv*42)},${Math.floor(215+sv*35)},${Math.floor(225+sv*28)})`; ctx.fillRect(px,py,TS,TS);
    return;
  }
  ctx.fillStyle = '#0e0c09'; ctx.fillRect(px,py,TS,TS);
}

function _mapFeature(ctx, x, y, t, TS) {
  const px=x*TS, py=y*TS, m=px+TS/2, n=py+TS/2;

  if (t === T.PILLAR) {
    const rad = TS*.35;
    ctx.fillStyle = 'rgba(0,0,0,0.42)'; ctx.beginPath(); ctx.arc(m+2,n+2.5,rad,0,Math.PI*2); ctx.fill();
    const gp = ctx.createRadialGradient(m-rad*.32,n-rad*.32,0,m,n,rad);
    gp.addColorStop(0,'#d6ba8e'); gp.addColorStop(.45,'#a07c52'); gp.addColorStop(1,'#4c3018');
    ctx.fillStyle = gp; ctx.beginPath(); ctx.arc(m,n,rad,0,Math.PI*2); ctx.fill();
    ctx.strokeStyle = 'rgba(200,162,105,0.38)'; ctx.lineWidth = 0.8; ctx.beginPath(); ctx.arc(m,n,rad,0,Math.PI*2); ctx.stroke();
    return;
  }
  if (t === T.CHEST) {
    const cw=TS*.58, ch=TS*.44, cx=m-cw/2, cy=n-ch/2-1;
    ctx.fillStyle = 'rgba(0,0,0,0.32)'; ctx.fillRect(cx+2,cy+2,cw,ch);
    ctx.fillStyle = '#5c3212'; ctx.fillRect(cx,cy,cw,ch);
    ctx.fillStyle = '#3e2008'; ctx.fillRect(cx,cy,cw,ch*.38);
    ctx.fillStyle = '#c8973c'; ctx.fillRect(cx+2,cy+ch*.35,cw-4,2);
    ctx.fillStyle = '#f0c040'; ctx.beginPath(); ctx.arc(m,cy+ch*.41,2.5,0,Math.PI*2); ctx.fill();
    [[0,0],[cw-2,0],[0,ch-2],[cw-2,ch-2]].forEach(([ox,oy])=>{ ctx.fillStyle='#6a6a6a'; ctx.fillRect(cx+ox,cy+oy,2,2); });
    ctx.strokeStyle = '#1a0804'; ctx.lineWidth = 0.8; ctx.strokeRect(cx,cy,cw,ch);
    return;
  }
  if (t === T.STAIRS) {
    const sw=TS*.68, sh=TS*.62, x0=m-sw/2, y0=n-sh/2, nS=5, stepH=sh/nS;
    for (let si = 0; si < nS; si++) {
      const shrink=si*(sw/nS)*.1, sx=x0+shrink, sw2=sw-shrink*2, sy=y0+si*stepH;
      ctx.fillStyle = 'rgba(0,0,0,0.28)'; ctx.fillRect(sx,sy+stepH*.7,sw2,stepH*.3);
      ctx.fillStyle = si%2===0 ? '#8c6c48' : '#9c7c58'; ctx.fillRect(sx,sy,sw2,stepH*.72);
      ctx.strokeStyle = 'rgba(0,0,0,0.2)'; ctx.lineWidth = 0.4; ctx.strokeRect(sx,sy,sw2,stepH*.72);
    }
    ctx.fillStyle = '#f0c040'; ctx.font = `bold ${Math.floor(TS*.28)}px sans-serif`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'bottom'; ctx.fillText('▼',m,py+TS-2);
    return;
  }
  if (t === T.TRAP) {
    const variant = Math.floor(_ht(x,y,200)*3);
    if (variant===0) {
      // Pit trap — dark circular pit with warning ring
      const gr=ctx.createRadialGradient(m,n,0,m,n,TS*.38);
      gr.addColorStop(0,'#040302'); gr.addColorStop(1,'#1c140a');
      ctx.fillStyle=gr; ctx.beginPath(); ctx.arc(m,n,TS*.36,0,Math.PI*2); ctx.fill();
      ctx.strokeStyle='rgba(160,80,0,0.55)'; ctx.lineWidth=1.0;
      ctx.beginPath(); ctx.arc(m,n,TS*.38,0,Math.PI*2); ctx.stroke();
      ctx.strokeStyle='rgba(160,80,0,0.28)'; ctx.lineWidth=0.6;
      ctx.beginPath(); ctx.arc(m,n,TS*.46,0,Math.PI*2); ctx.stroke();
      // Danger stripes
      ctx.strokeStyle='rgba(160,60,0,0.30)'; ctx.lineWidth=0.6;
      for(let si=-1;si<=1;si++){ctx.beginPath();ctx.moveTo(m+si*TS*.18-TS*.14,n+TS*.35);ctx.lineTo(m+si*TS*.18+TS*.14,n-TS*.35);ctx.stroke();}
    } else if (variant===1) {
      // Dart trap — concentric target with tiny dart holes
      [.42,.27,.13].forEach((r,i)=>{
        ctx.strokeStyle=`rgba(165,45,45,${0.22+i*.12})`; ctx.lineWidth=0.7;
        ctx.beginPath(); ctx.arc(m,n,TS*r,0,Math.PI*2); ctx.stroke();
      });
      ctx.fillStyle='rgba(165,45,45,0.42)'; ctx.beginPath(); ctx.arc(m,n,2,0,Math.PI*2); ctx.fill();
      [[-1,-1],[1,-1],[-1,1],[1,1]].forEach(([dx,dy])=>{
        ctx.fillStyle='rgba(0,0,0,0.60)'; ctx.beginPath(); ctx.arc(m+dx*TS*.28,n+dy*TS*.28,1.3,0,Math.PI*2); ctx.fill();
      });
    } else {
      // Tripwire — thin line across with X at crossing
      ctx.strokeStyle='rgba(165,80,0,0.48)'; ctx.lineWidth=0.7;
      ctx.beginPath(); ctx.moveTo(px+2,n); ctx.lineTo(px+TS-2,n); ctx.stroke();
      ctx.strokeStyle='rgba(165,45,45,0.52)'; ctx.lineWidth=0.8;
      const s=TS*.20;
      ctx.beginPath(); ctx.moveTo(m-s,n-s); ctx.lineTo(m+s,n+s); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(m+s,n-s); ctx.lineTo(m-s,n+s); ctx.stroke();
      ctx.fillStyle='rgba(165,45,45,0.40)'; ctx.beginPath(); ctx.arc(m,n,2,0,Math.PI*2); ctx.fill();
    }
    return;
  }
}

// ── Token / counter system ────────────────────────────────────────────────────

window.setTokenMode = function(type) {
  _tokenMode = (_tokenMode === type) ? null : type;
  document.querySelectorAll('.token-btn[data-type]').forEach(b => {
    b.classList.toggle('active', b.dataset.type === _tokenMode);
  });

  const isTokenType = ['player','enemy','npc'].includes(_tokenMode);
  const avatarRow = document.getElementById('avatar-row');
  const avatarStrip = document.getElementById('avatar-strip');
  if (avatarRow) avatarRow.style.display = isTokenType ? '' : 'none';
  if (avatarStrip && isTokenType) {
    const avs = AVATAR_SETS[_tokenMode] || [];
    if (!_pendingAvatar || !avs.includes(_pendingAvatar)) _pendingAvatar = avs[0];
    avatarStrip.innerHTML = avs.map(e =>
      `<button class="avatar-btn${_pendingAvatar===e?' active':''}" onclick="selectAvatar('${e}')">${e}</button>`
    ).join('');
  }

  const hints = {
    player:'Click map to place — right-click to remove — drag to move',
    enemy:'Click map to place monster — right-click to remove — drag to move',
    npc:'Click map to place NPC — right-click to remove — drag to move',
    reveal:'Click or drag to reveal fog',
    hide:'Click or drag to hide tiles under fog',
  };
  const hint = document.getElementById('token-hint');
  if (hint) hint.textContent = _tokenMode ? (hints[_tokenMode]||'') : '';
};

window.selectAvatar = function(emoji) {
  _pendingAvatar = emoji;
  document.querySelectorAll('.avatar-btn').forEach(b => b.classList.toggle('active', b.textContent===emoji));
};

window.clearTokens = function() {
  if (!_currentMap) return;
  _currentMap.tokens = [];
  _tokenCounts = {player:0,enemy:0,npc:0};
  const ov = document.getElementById('token-canvas');
  if (ov && _currentMap) {
    const c = ov.getContext('2d');
    c.clearRect(0,0,ov.width,ov.height);
  }
};

window.setFogBrush = function(r) {
  _fogBrushRadius = r;
  document.querySelectorAll('.fog-brush-btn').forEach(b=>b.classList.toggle('active',parseInt(b.dataset.r)===r));
};

window.tokenRename = function(id) {
  const mapData=window._ctxMapData; if(!mapData) return;
  const tok=mapData.tokens.find(t=>t.id===id); if(!tok) return;
  const allAvatars=[...AVATAR_SETS.player,...AVATAR_SETS.enemy,...AVATAR_SETS.npc];
  showModal(`Rename: ${tok.label}`,`
    <label class="form-label">Label</label>
    <input id="tok-label" class="form-input" value="${tok.label}">
    <label class="form-label" style="margin-top:10px">Avatar</label>
    <div class="avatar-strip" id="tok-av-strip" style="flex-wrap:wrap;gap:4px">
      ${allAvatars.map(e=>`<button class="avatar-btn${tok.avatar===e?' active':''}" onclick="window._selTokAv('${tok.id}','${e}')">${e}</button>`).join('')}
    </div>
  `,[
    {label:'Save',cls:'btn-primary',action:`doTokenRename('${id}')`},
    {label:'Cancel',action:'closeModal()'},
  ]);
};
window._selTokAv=function(id,emoji){
  window._pendingTokAv=emoji;
  document.querySelectorAll('#tok-av-strip .avatar-btn').forEach(b=>b.classList.toggle('active',b.textContent===emoji));
};
window.doTokenRename=function(id){
  const mapData=window._ctxMapData; if(!mapData) return;
  const tok=mapData.tokens.find(t=>t.id===id); if(!tok) return;
  tok.label=document.getElementById('tok-label').value.trim()||tok.label;
  if(window._pendingTokAv!==undefined){tok.avatar=window._pendingTokAv; window._pendingTokAv=undefined;}
  closeModal();
  const ov=document.getElementById('token-canvas');
  if(ov) _drawTokens(ov.getContext('2d'),mapData.tokens,mapData.W,mapData.H,MAP_TS,null);
};

window.tokenSetHP=function(id){
  const mapData=window._ctxMapData; if(!mapData) return;
  const tok=mapData.tokens.find(t=>t.id===id); if(!tok) return;
  showModal(`HP / AC: ${tok.label}`,`
    <div class="form-row">
      <div><label class="form-label">Current HP</label><input id="tok-hp" class="form-input" type="number" value="${tok.hp??tok.maxHp??10}"></div>
      <div><label class="form-label">Max HP</label><input id="tok-maxhp" class="form-input" type="number" value="${tok.maxHp??10}"></div>
      <div><label class="form-label">AC</label><input id="tok-ac" class="form-input" type="number" value="${tok.ac??10}"></div>
    </div>
    <p style="font-size:11px;color:var(--muted);margin-top:6px">HP bar appears below the token on the map.</p>
  `,[
    {label:'Save',cls:'btn-primary',action:`doTokenSetHP('${id}')`},
    {label:'Clear HP',action:`doTokenClearHP('${id}')`},
    {label:'Cancel',action:'closeModal()'},
  ]);
};
window.doTokenSetHP=function(id){
  const mapData=window._ctxMapData; if(!mapData) return;
  const tok=mapData.tokens.find(t=>t.id===id); if(!tok) return;
  tok.maxHp=parseInt(document.getElementById('tok-maxhp').value)||10;
  tok.hp=Math.min(tok.maxHp,parseInt(document.getElementById('tok-hp').value)||tok.maxHp);
  tok.ac=parseInt(document.getElementById('tok-ac').value)||tok.ac;
  closeModal();
  const ov=document.getElementById('token-canvas');
  if(ov) _drawTokens(ov.getContext('2d'),mapData.tokens,mapData.W,mapData.H,MAP_TS,null);
};
window.doTokenClearHP=function(id){
  const mapData=window._ctxMapData; if(!mapData) return;
  const tok=mapData.tokens.find(t=>t.id===id); if(!tok) return;
  delete tok.hp; delete tok.maxHp;
  closeModal();
  const ov=document.getElementById('token-canvas');
  if(ov) _drawTokens(ov.getContext('2d'),mapData.tokens,mapData.W,mapData.H,MAP_TS,null);
};

window.tokenRemove=function(id){
  const mapData=window._ctxMapData; if(!mapData) return;
  const idx=mapData.tokens.findIndex(t=>t.id===id);
  if(idx>=0) mapData.tokens.splice(idx,1);
  const cm=document.getElementById('map-ctx-menu'); if(cm) cm.classList.add('hidden');
  const ov=document.getElementById('token-canvas');
  if(ov) _drawTokens(ov.getContext('2d'),mapData.tokens,mapData.W,mapData.H,MAP_TS,null);
};

function _placeToken(mapData, tx, ty) {
  if (tx<0||ty<0||tx>=mapData.W||ty>=mapData.H) return;
  if ((mapData.grid[ty]?.[tx]??T.WALL) === T.WALL) return;
  if (mapData.tokens.find(t=>t.x===tx&&t.y===ty)) return;
  const type = _tokenMode;
  _tokenCounts[type] = (_tokenCounts[type]||0) + 1;
  mapData.tokens.push({
    id: uuid(), x:tx, y:ty, type,
    label: TOKEN_PFX[type]+_tokenCounts[type],
    color: TOKEN_COLORS[type],
    avatar: _pendingAvatar || null,
  });
  if (type==='player' && mapData.fog && mapData.fogEnabled) {
    revealAround(mapData, tx, ty, 6);
    renderFog(_fogCtx, mapData, mapData.W, mapData.H, MAP_TS);
  }
}

function _drawTokens(ovCtx, tokens, W, H, TS, drag) {
  ovCtx.clearRect(0, 0, W*TS, H*TS);
  tokens.forEach(tok => {
    const dragging = drag && drag.id === tok.id;
    const cx = dragging ? drag.px : tok.x*TS + TS/2;
    const cy = dragging ? drag.py : tok.y*TS + TS/2;
    const rad = TS * 0.40;

    // Drop shadow
    ovCtx.fillStyle = 'rgba(0,0,0,0.55)';
    ovCtx.beginPath(); ovCtx.arc(cx+1.5,cy+2.5,rad,0,Math.PI*2); ovCtx.fill();

    // Token body
    ovCtx.fillStyle = tok.color || TOKEN_COLORS[tok.type] || '#888';
    ovCtx.beginPath(); ovCtx.arc(cx,cy,rad,0,Math.PI*2); ovCtx.fill();

    if (tok.avatar) {
      // Clip to circle, render emoji
      ovCtx.save();
      ovCtx.beginPath(); ovCtx.arc(cx,cy,rad*.92,0,Math.PI*2); ovCtx.clip();
      const fs = Math.max(10, Math.floor(TS * 0.56));
      ovCtx.font = `${fs}px serif`;
      ovCtx.textAlign='center'; ovCtx.textBaseline='middle';
      ovCtx.fillText(tok.avatar, cx, cy+1);
      ovCtx.restore();
      // Number badge top-right
      const nb = Math.max(5, Math.floor(TS*0.20));
      const bx = cx+rad*.68, by = cy-rad*.68;
      ovCtx.fillStyle='rgba(0,0,0,0.82)';
      ovCtx.beginPath(); ovCtx.arc(bx,by,nb,0,Math.PI*2); ovCtx.fill();
      ovCtx.fillStyle='#fff'; ovCtx.font=`bold ${nb}px sans-serif`;
      ovCtx.textAlign='center'; ovCtx.textBaseline='middle';
      ovCtx.fillText(tok.label.replace(/[A-Z]/,''), bx, by+.5);
    } else {
      // Shine gradient
      const shine=ovCtx.createRadialGradient(cx-rad*.3,cy-rad*.3,0,cx,cy,rad);
      shine.addColorStop(0,'rgba(255,255,255,0.24)'); shine.addColorStop(1,'rgba(255,255,255,0)');
      ovCtx.fillStyle=shine; ovCtx.beginPath(); ovCtx.arc(cx,cy,rad,0,Math.PI*2); ovCtx.fill();
      // Label text
      const fs=Math.max(7,Math.floor(TS*0.30));
      ovCtx.fillStyle='#fff'; ovCtx.font=`bold ${fs}px sans-serif`;
      ovCtx.textAlign='center'; ovCtx.textBaseline='middle';
      ovCtx.shadowColor='rgba(0,0,0,0.7)'; ovCtx.shadowBlur=2;
      ovCtx.fillText(tok.label,cx,cy);
      ovCtx.shadowBlur=0;
    }

    // White ring always on top
    ovCtx.strokeStyle='rgba(255,255,255,0.80)'; ovCtx.lineWidth=1.5;
    ovCtx.beginPath(); ovCtx.arc(cx,cy,rad,0,Math.PI*2); ovCtx.stroke();

    // HP bar below token
    if (tok.hp!==undefined && tok.maxHp) {
      const pct=Math.max(0,tok.hp/tok.maxHp);
      const bw=TS*0.82, bx=cx-bw/2, by=cy+rad+2;
      ovCtx.fillStyle='rgba(0,0,0,0.65)'; ovCtx.fillRect(bx,by,bw,4);
      ovCtx.fillStyle=pct>0.6?'#3a3':'#aa3';  if(pct<=0.3) ovCtx.fillStyle='#a33';
      ovCtx.fillRect(bx,by,bw*pct,4);
      const hpFs=Math.max(6,Math.floor(TS*0.16));
      ovCtx.fillStyle='rgba(255,255,255,0.9)'; ovCtx.font=`bold ${hpFs}px sans-serif`;
      ovCtx.textAlign='center'; ovCtx.textBaseline='top';
      ovCtx.shadowColor='rgba(0,0,0,0.8)'; ovCtx.shadowBlur=2;
      ovCtx.fillText(`${tok.hp}/${tok.maxHp}`,cx,by+5);
      ovCtx.shadowBlur=0;
    }
  });
}

// ── Fog of War ────────────────────────────────────────────────────────────────

function initFog(mapData) {
  if (mapData.fog) return;
  const {W,H,grid} = mapData;
  mapData.fog = makeGrid(W, H, 0);
  // Walls count as "revealed" — they're just void
  for (let y=0;y<H;y++) for (let x=0;x<W;x++) {
    if ((grid[y]?.[x]??T.WALL)===T.WALL) mapData.fog[y][x]=1;
  }
  if (mapData.fogMode===undefined)  mapData.fogMode='dm';
  if (mapData.fogEnabled===undefined) mapData.fogEnabled=false;
}

function renderFog(fogCtx, mapData, W, H, TS) {
  if (!fogCtx) return;
  fogCtx.clearRect(0, 0, W*TS, H*TS);
  if (!mapData.fog || !mapData.fogEnabled) return;
  const isDM = mapData.fogMode!=='pc';
  for (let y=0;y<H;y++) for (let x=0;x<W;x++) {
    if (mapData.fog[y]?.[x]) continue;
    fogCtx.fillStyle = isDM ? 'rgba(20,10,60,0.48)' : 'rgba(0,0,0,0.96)';
    fogCtx.fillRect(x*TS, y*TS, TS, TS);
  }
}

function revealAround(mapData, tx, ty, radius) {
  if (!mapData.fog) return;
  const {W,H} = mapData;
  for (let dy=-radius;dy<=radius;dy++) for (let dx=-radius;dx<=radius;dx++) {
    if (Math.sqrt(dx*dx+dy*dy)>radius) continue;
    const nx=tx+dx, ny=ty+dy;
    if (nx<0||ny<0||nx>=W||ny>=H) continue;
    mapData.fog[ny][nx]=1;
  }
}

function paintFog(mapData, tx, ty, reveal, radius) {
  if (!mapData.fog) return;
  const {W,H} = mapData;
  for (let dy=-radius;dy<=radius;dy++) for (let dx=-radius;dx<=radius;dx++) {
    if (Math.sqrt(dx*dx+dy*dy)>radius+.5) continue;
    const nx=tx+dx, ny=ty+dy;
    if (nx<0||ny<0||nx>=W||ny>=H) continue;
    mapData.fog[ny][nx]=reveal?1:0;
  }
}

window.toggleFogEnabled = function() {
  if (!_currentMap) return;
  _currentMap.fogEnabled = !_currentMap.fogEnabled;
  const btn=document.getElementById('btn-fog-toggle');
  if (btn) { btn.textContent=`🌫 ${_currentMap.fogEnabled?'On':'Off'}`; btn.classList.toggle('active',_currentMap.fogEnabled); }
  renderFog(_fogCtx, _currentMap, _currentMap.W, _currentMap.H, MAP_TS);
};

window.toggleFogView = function() {
  if (!_currentMap) return;
  _currentMap.fogMode = _currentMap.fogMode==='pc' ? 'dm' : 'pc';
  const btn=document.getElementById('btn-fog-view');
  if (btn) { btn.textContent=_currentMap.fogMode==='pc'?'🙈 PC View':'👁 DM View'; btn.classList.toggle('active',_currentMap.fogMode==='pc'); }
  renderFog(_fogCtx, _currentMap, _currentMap.W, _currentMap.H, MAP_TS);
};

window.fogRevealAll = function() {
  if (!_currentMap?.fog) return;
  const {W,H} = _currentMap;
  for (let y=0;y<H;y++) for (let x=0;x<W;x++) _currentMap.fog[y][x]=1;
  renderFog(_fogCtx, _currentMap, W, H, MAP_TS);
};

window.fogResetAll = function() {
  if (!_currentMap) return;
  const {W,H,grid} = _currentMap;
  for (let y=0;y<H;y++) for (let x=0;x<W;x++) {
    _currentMap.fog[y][x]=(grid[y]?.[x]??T.WALL)===T.WALL?1:0;
  }
  renderFog(_fogCtx, _currentMap, W, H, MAP_TS);
};

// ── Map HUD (round counter, timers, custom counters) ─────────────────────────

function _refreshHUDTimers() {
  const el=document.getElementById('hud-timers-wrap'); if (!el) return;
  el.innerHTML=_mapHUD.timers.map(t=>{
    const m=Math.floor(t.remaining/60).toString().padStart(2,'0');
    const s=(t.remaining%60).toString().padStart(2,'0');
    const pct=t.total>0?(t.remaining/t.total)*100:0;
    const cls=t.remaining<=10?'hud-urgent':t.remaining<=30?'hud-warn':'';
    return `<div class="hud-timer ${cls}">
      <span class="hud-timer-name">${t.name}</span>
      <div class="hud-timer-bar-wrap"><div class="hud-timer-bar" style="width:${pct}%"></div></div>
      <span class="hud-timer-time">${m}:${s}</span>
      <button class="hud-btn" onclick="timerToggle('${t.id}')">${t.running?'⏸':'▶'}</button>
      <button class="hud-btn" onclick="timerReset('${t.id}')">↺</button>
      <button class="hud-btn hud-del" onclick="timerDelete('${t.id}')">✕</button>
    </div>`;
  }).join('');
}

function _refreshHUDCounters() {
  const el=document.getElementById('hud-counters-wrap'); if (!el) return;
  el.innerHTML=_mapHUD.counters.map(c=>`
    <div class="hud-counter">
      <span class="hud-counter-name">${c.name}</span>
      <button class="hud-btn" onclick="counterAdjust('${c.id}',-1)">−</button>
      <span class="hud-num" style="font-size:15px">${c.value}</span>
      <button class="hud-btn" onclick="counterAdjust('${c.id}',1)">+</button>
      <button class="hud-btn hud-del" onclick="counterDelete('${c.id}')">✕</button>
    </div>
  `).join('');
}

window.adjustRound = function(delta) {
  _mapHUD.round = Math.max(1, _mapHUD.round+delta);
  const el=document.getElementById('hud-round'); if (el) el.textContent=_mapHUD.round;
};

window.addMapCounter = function() {
  showModal('Add Counter',`
    <label class="form-label">Name</label>
    <input id="ctr-name" class="form-input" placeholder="Concentration, Lair Actions..." value="">
    <label class="form-label">Starting value</label>
    <input id="ctr-val" class="form-input" type="number" value="0">
  `,[
    {label:'Add',cls:'btn-primary',action:'doAddMapCounter()'},
    {label:'Cancel',action:'closeModal()'},
  ]);
};
window.doAddMapCounter = function() {
  const name=document.getElementById('ctr-name').value.trim()||'Counter';
  const value=parseInt(document.getElementById('ctr-val').value)||0;
  _mapHUD.counters.push({id:uuid(),name,value});
  closeModal(); _refreshHUDCounters();
};
window.counterAdjust = function(id,delta) {
  const c=_mapHUD.counters.find(c=>c.id===id); if(c){c.value+=delta;_refreshHUDCounters();}
};
window.counterDelete = function(id) {
  _mapHUD.counters=_mapHUD.counters.filter(c=>c.id!==id); _refreshHUDCounters();
};

window.addMapTimer = function() {
  showModal('Add Countdown Timer',`
    <label class="form-label">Name</label>
    <input id="tmr-name" class="form-input" placeholder="Spell Duration, Ritual, Alarm..." value="">
    <label class="form-label" style="margin-top:10px">Quick set</label>
    <div style="display:flex;gap:6px;flex-wrap:wrap;margin:6px 0">
      <button class="btn btn-secondary btn-sm" onclick="document.getElementById('tmr-dur').value=30">30s</button>
      <button class="btn btn-secondary btn-sm" onclick="document.getElementById('tmr-dur').value=60">1m</button>
      <button class="btn btn-secondary btn-sm" onclick="document.getElementById('tmr-dur').value=180">3m</button>
      <button class="btn btn-secondary btn-sm" onclick="document.getElementById('tmr-dur').value=600">10m</button>
      <button class="btn btn-secondary btn-sm" onclick="document.getElementById('tmr-dur').value=3600">1h</button>
    </div>
    <label class="form-label">Duration (seconds)</label>
    <input id="tmr-dur" class="form-input" type="number" value="60">
  `,[
    {label:'Add',cls:'btn-primary',action:'doAddMapTimer()'},
    {label:'Cancel',action:'closeModal()'},
  ]);
};
window.doAddMapTimer = function() {
  const name=document.getElementById('tmr-name').value.trim()||'Timer';
  const dur=parseInt(document.getElementById('tmr-dur').value)||60;
  _mapHUD.timers.push({id:uuid(),name,total:dur,remaining:dur,running:false});
  closeModal(); _refreshHUDTimers(); _startTimerTick();
};
window.timerToggle = function(id) {
  const t=_mapHUD.timers.find(t=>t.id===id);
  if(t){t.running=!t.running&&t.remaining>0; _refreshHUDTimers(); _startTimerTick();}
};
window.timerReset = function(id) {
  const t=_mapHUD.timers.find(t=>t.id===id);
  if(t){t.remaining=t.total;t.running=false; _refreshHUDTimers();}
};
window.timerDelete = function(id) {
  _mapHUD.timers=_mapHUD.timers.filter(t=>t.id!==id); _refreshHUDTimers();
};

function _startTimerTick() {
  if (_timerInterval) return;
  _timerInterval=setInterval(()=>{
    let dirty=false;
    _mapHUD.timers.forEach(t=>{
      if(t.running&&t.remaining>0){ t.remaining--; if(t.remaining===0)t.running=false; dirty=true; }
    });
    if(dirty) _refreshHUDTimers();
  }, 1000);
}

// ── Compass Rose ──────────────────────────────────────────────────────────────

function _drawCompassRose(ctx, cx, cy, sz, pal) {
  const gold = '#c8973c';
  const dark = pal.void || '#0e0c09';
  const PI = Math.PI;
  const C = Math.cos, S = Math.sin;
  ctx.save();

  // Dark disc + gold ring
  ctx.beginPath(); ctx.arc(cx, cy, sz + 5, 0, 2*PI);
  ctx.fillStyle = 'rgba(0,0,0,0.68)'; ctx.fill();
  ctx.strokeStyle = gold; ctx.lineWidth = 1.4; ctx.stroke();

  // Inner decorative ring
  ctx.beginPath(); ctx.arc(cx, cy, sz * 0.38, 0, 2*PI);
  ctx.strokeStyle = 'rgba(200,151,60,0.40)'; ctx.lineWidth = 0.7; ctx.stroke();

  function pt(ang, len, hw, bk, fill) {
    ctx.beginPath();
    ctx.moveTo(cx+C(ang)*len,      cy+S(ang)*len);
    ctx.lineTo(cx+C(ang+PI/2)*hw,  cy+S(ang+PI/2)*hw);
    ctx.lineTo(cx+C(ang+PI)*bk,    cy+S(ang+PI)*bk);
    ctx.lineTo(cx+C(ang-PI/2)*hw,  cy+S(ang-PI/2)*hw);
    ctx.closePath();
    ctx.fillStyle = fill; ctx.fill();
    ctx.strokeStyle = dark; ctx.lineWidth = 0.6; ctx.stroke();
  }

  // Cardinal points N/E/S/W
  [-PI/2, 0, PI/2, PI].forEach(a => pt(a, sz, sz*.18, sz*.14, gold));
  // Diagonal points NE/SE/SW/NW
  [-PI/4, PI/4, 3*PI/4, -3*PI/4].forEach(a => pt(a, sz*.58, sz*.11, sz*.11, 'rgba(200,151,60,0.55)'));

  // Center jewel
  ctx.beginPath(); ctx.arc(cx, cy, sz*.12, 0, 2*PI);
  ctx.fillStyle = dark; ctx.fill();
  ctx.beginPath(); ctx.arc(cx, cy, sz*.06, 0, 2*PI);
  ctx.fillStyle = gold; ctx.fill();

  // N label above north point
  const fs = Math.max(9, Math.floor(sz * .42));
  ctx.font = `bold ${fs}px serif`;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillStyle = dark; ctx.fillText('N', cx + .8, cy - sz - fs * .5 + 1);
  ctx.fillStyle = gold; ctx.fillText('N', cx,      cy - sz - fs * .5);

  ctx.restore();
}

// ── Music ─────────────────────────────────────────────────────────────────────

function renderMusic() {
  setContent(`
    <div class="view-header">
      <div>
        <h1>Music</h1>
        <span class="subtitle">Real orchestral instruments · Hall reverb · Cinematic moods</span>
      </div>
    </div>
    <div class="music-now" id="music-now">
      <span style="color:var(--muted)">Click a mood to start — instruments load on first use, then cached</span>
    </div>
    <div class="music-intro">
      Music streams real sampled instruments through the browser — no audio files to download. Click a mood to begin; click the active card again to stop.
    </div>
    <div class="mood-grid" id="mood-grid"></div>
    <div class="volume-row">
      <span class="volume-label">🔊 Volume</span>
      <input type="range" id="vol-slider" class="volume-slider" min="0" max="1" step="0.05" value="0.72">
      <span id="vol-label" class="volume-val">72%</span>
      <button class="btn btn-secondary btn-sm" onclick="Music.stop()">⏹ Stop All</button>
    </div>
  `);

  const grid = document.getElementById('mood-grid');
  Object.entries(Music.MOODS).forEach(([key, m]) => {
    const card = document.createElement('div');
    card.className = 'mood-card';
    if (m.theme) card.classList.add('theme-' + m.theme);
    card.dataset.mood = key;
    if (Music.getActive() === key) card.classList.add('active');
    card.innerHTML = `
      <div class="mood-card-icon">${m.icon}</div>
      <div class="mood-card-name">${m.name}</div>
      <div class="mood-card-desc">${m.desc}</div>
      <div class="mood-card-meta">♩ ${m.bpm} BPM${m.inst?' · '+m.inst:''}</div>
      ${m.inst?`<div class="mood-inst" style="display:none">${m.inst}</div>`:''}
      <div class="mood-card-playing"><span></span> Now playing</div>`;
    card.addEventListener('click', async () => {
      if (Music.getActive() === key && !Music.isLoading()) Music.stop();
      else await Music.play(key);
    });
    grid.appendChild(card);
  });

  document.getElementById('vol-slider').addEventListener('input', e => {
    const v = parseFloat(e.target.value);
    document.getElementById('vol-label').textContent = Math.round(v * 100) + '%';
    Music.setVolume(v);
  });

  Music.refreshUI();
}

// ── NPCs ──────────────────────────────────────────────────────────────────────

function renderNPCs() {
  const camp=getActiveCampaign();
  const factionOpts=['Any',...FACTIONS.map(f=>f.name)].map(f=>`<option>${f}</option>`).join('');
  const regionOpts=['Any',...Object.keys(REGIONS)].map(r=>`<option>${r}</option>`).join('');
  const raceOpts=['Any',...RACES].map(r=>`<option>${r}</option>`).join('');
  const classOpts=['Any',...CLASSES].map(c=>`<option>${c}</option>`).join('');
  const npcs=camp?.npcs||[];

  setContent(`
    <div class="view-header">
      <div>
        <h1>NPCs</h1>
        <span class="subtitle">Full character briefs — appearance, personality, secrets, tactics, session hooks</span>
      </div>
    </div>
    <div class="gen-panel">
      <div class="gen-panel-fields">
        <div class="form-group"><label>Faction</label><select id="npc-faction" class="form-select">${factionOpts}</select></div>
        <div class="form-group"><label>Region</label><select id="npc-region" class="form-select">${regionOpts}</select></div>
        <div class="form-group"><label>Race</label><select id="npc-race" class="form-select">${raceOpts}</select></div>
        <div class="form-group"><label>Class</label><select id="npc-class" class="form-select">${classOpts}</select></div>
        <div class="form-group"><label>Level</label><input id="npc-level" class="form-input" type="number" min="1" max="20" value="" placeholder="Any" style="width:70px"></div>
      </div>
      <button class="btn btn-primary gen-panel-btn" onclick="doGenerateNPC()">⚡ Generate NPC</button>
    </div>
    <div id="npc-result"></div>
    <hr class="section-hr">
    <div class="panel-header"><span>Saved NPCs (${npcs.length})</span></div>
    <div class="search-row">
      <input type="search" id="npc-search" class="search-input" placeholder="Search by name, race, class, faction…"/>
    </div>
    <div id="npc-list">
      ${npcs.length ? npcs.slice().reverse().map(n=>npcListRow(n)).join('') : '<div class="empty-state"><div class="empty-state-icon">🧙</div><div class="empty-state-title">No saved NPCs yet</div><div class="empty-state-sub">Generate an NPC above and save them to your campaign.</div></div>'}
    </div>
  `);

  const searchEl = document.getElementById('npc-search');
  if (searchEl) {
    searchEl.addEventListener('input', () => {
      const q = searchEl.value.toLowerCase();
      const list = document.getElementById('npc-list');
      if (!list) return;
      if (!q) {
        list.innerHTML = npcs.length ? npcs.slice().reverse().map(n=>npcListRow(n)).join('') : '';
        return;
      }
      const filtered = npcs.filter(n =>
        (n.name    ||'').toLowerCase().includes(q) ||
        (n.race    ||'').toLowerCase().includes(q) ||
        (n.class   ||'').toLowerCase().includes(q) ||
        (n.faction ||'').toLowerCase().includes(q)
      );
      list.innerHTML = filtered.length
        ? filtered.slice().reverse().map(n=>npcListRow(n)).join('')
        : '<div class="empty-state"><div class="empty-state-icon">🔍</div><div class="empty-state-title">No matches</div></div>';
    });
  }
}

function npcListRow(n) {
  const lvlLabel = n.level ? `Lvl ${n.level}` : '';
  const initials = (n.name||'?').split(' ').map(w=>w[0]).slice(0,2).join('').toUpperCase();
  return `<div class="npc-card2" onclick="expandNPCRow('${n.id}')">
    <div class="npc-card2-avatar">${initials}</div>
    <div class="npc-card2-header">
      <div class="npc-card2-name">${n.name}</div>
      <div class="npc-card2-sub">${n.race} ${n.class} ${lvlLabel} · ${n.alignment}</div>
      <div class="npc-card2-chips">
        ${n.faction?`<span class="chip">${n.faction}</span>`:''}
        ${n.region?`<span class="chip">${n.region}</span>`:''}
      </div>
    </div>
    <div class="npc-card2-actions">
      ${getActiveCampaign()?`<button class="btn-icon btn-danger-icon" onclick="event.stopPropagation();deleteNPC('${n.id}')">✕</button>`:''}
    </div>
  </div>
  <div id="npcrow-${n.id}" style="display:none">${npcFullCard(n,false,true)}</div>`;
}

window.expandNPCRow=function(id){
  const el=document.getElementById('npcrow-'+id);
  if(el) el.style.display=el.style.display==='none'?'block':'none';
};

window.doGenerateNPC=function(){
  const fval=document.getElementById('npc-faction').value;
  const rval=document.getElementById('npc-region').value;
  const race=document.getElementById('npc-race').value;
  const cls=document.getElementById('npc-class').value;
  const lvlInput=parseInt(document.getElementById('npc-level').value);
  const opts={};
  if(fval!=='Any') opts.faction=fval;
  if(rval!=='Any') opts.region=rval;
  if(race!=='Any') opts.race=race;
  if(cls!=='Any') opts.cls=cls;
  if(lvlInput>=1) opts.level=lvlInput;
  const npc=generateNPC(opts);
  document.getElementById('npc-result').innerHTML=npcFullCard(npc,true);
};

window.saveNPC=function(data){
  const camp=getActiveCampaign(); if(!camp) return;
  const npc=JSON.parse(decodeURIComponent(data));
  npc.id=uuid(); npc.created=Date.now();
  camp.npcs.push(npc); saveState();
  renderNPCs(); showToast(`${npc.name} saved!`);
};

window.deleteNPC=function(id){
  const camp=getActiveCampaign(); if(!camp) return;
  camp.npcs=camp.npcs.filter(n=>n.id!==id); saveState(); renderNPCs();
};

function npcFullCard(n, showSave=false, compact=false) {
  const s=n.stats||{};
  const sv=n.saves||{};
  const signed=v=>(v>=0?'+':'')+v;
  const statBlock=['STR','DEX','CON','INT','WIS','CHA'].map(k=>`
    <div class="npc-stat-cell">
      <div class="npc-stat-val">${s[k]||10}</div>
      <div class="npc-stat-mod">${signedMod(s[k]||10)}</div>
      <div class="npc-stat-key">${k}</div>
      <div class="npc-stat-save" title="Save">${signed(sv[k]||0)}</div>
    </div>`).join('');

  const skills=(n.trainedSkills||[]).map(sk=>`<span class="npc-skill-tag">${sk}</span>`).join('');
  const equip=Array.isArray(n.equipment)?n.equipment.map(e=>`<li>${e}</li>`).join(''):'';

  const saveBtn=showSave&&getActiveCampaign()
    ?`<button class="btn btn-primary btn-sm" onclick="saveNPC('${encodeURIComponent(JSON.stringify(n))}')">💾 Save NPC</button>`:'';

  return `<div class="npc-card${compact?' npc-card-compact':''}">

    <div class="npc-header">
      <div>
        <div class="npc-name">${n.name}</div>
        <div class="npc-sub">${n.race} ${n.class} ${n.level?'Lvl '+n.level:''} · ${n.alignment}</div>
        <div class="npc-chips">
          <span class="quest-chip">${n.faction}</span>
          <span class="quest-chip">${n.region}</span>
          <span class="quest-chip">${n.culture}</span>
        </div>
      </div>
      <div style="display:flex;gap:8px;flex-shrink:0;flex-wrap:wrap;align-items:flex-start">
        ${saveBtn}
        ${showSave?`<button class="btn btn-secondary btn-sm" onclick="doGenerateNPC()">↻ Re-roll</button>`:''}
      </div>
    </div>

    <div class="npc-combat-bar">
      <div class="npc-combat-stat"><div class="npc-combat-val">${n.maxHp||'?'}</div><div class="npc-combat-key">HP</div></div>
      <div class="npc-combat-stat"><div class="npc-combat-val">${n.ac||10}</div><div class="npc-combat-key">AC</div></div>
      <div class="npc-combat-stat"><div class="npc-combat-val">+${n.profBonus||2}</div><div class="npc-combat-key">Prof</div></div>
      <div class="npc-combat-stat"><div class="npc-combat-val">${signed(n.initiative||0)}</div><div class="npc-combat-key">Init</div></div>
      <div class="npc-combat-stat"><div class="npc-combat-val">${n.speed||30}ft</div><div class="npc-combat-key">Speed</div></div>
    </div>

    <div class="npc-stat-row">${statBlock}</div>
    ${skills?`<div class="npc-skills-row"><span class="npc-skills-label">Trained:</span>${skills}</div>`:''}

    <div class="npc-body">

      <div class="npc-section">
        <div class="npc-section-title">👁 Appearance & Voice</div>
        <p class="npc-text">${n.appearance||''}</p>
        <p class="npc-text" style="margin-top:6px;font-style:italic">${n.voice||''}</p>
      </div>

      <div class="npc-section">
        <div class="npc-section-title">🎭 Character</div>
        <div class="npc-trait-grid">
          <div class="npc-trait"><div class="npc-trait-key">Personality</div><div class="npc-trait-val">${n.personality||''}</div></div>
          <div class="npc-trait"><div class="npc-trait-key">Ideal</div><div class="npc-trait-val">${n.ideal||''}</div></div>
          <div class="npc-trait npc-trait-flaw"><div class="npc-trait-key">Flaw</div><div class="npc-trait-val">${n.flaw||''}</div></div>
          <div class="npc-trait"><div class="npc-trait-key">Bond</div><div class="npc-trait-val">${n.bond||''}</div></div>
        </div>
      </div>

      <div class="npc-section">
        <div class="npc-section-title">📖 Background & Role</div>
        <p class="npc-text">${n.background||''}</p>
        <p class="npc-text" style="margin-top:6px"><strong style="color:var(--accent)">${n.faction}:</strong> ${n.factionRole||''}</p>
        <p class="npc-text" style="margin-top:6px">🔗 ${n.connection||''}</p>
      </div>

      <div class="npc-two-col">
        <div class="npc-section">
          <div class="npc-section-title">🎯 Current Goal</div>
          <p class="npc-text">${n.goal||''}</p>
        </div>
        <div class="npc-section npc-secret-block">
          <div class="npc-section-title">🔒 Secret <span class="quest-dm-tag">DM</span></div>
          <p class="npc-text">${n.secret||''}</p>
        </div>
      </div>

      <div class="npc-two-col">
        <div class="npc-section">
          <div class="npc-section-title">⚔ Combat Tactics</div>
          <p class="npc-text">${n.combatStyle||''}</p>
          ${equip?`<ul class="npc-equip-list">${equip}</ul>`:''}
        </div>
        <div class="npc-section">
          <div class="npc-section-title">🪝 Session Hook</div>
          <p class="npc-text">${n.sessionHook||''}</p>
        </div>
      </div>

      <div class="npc-section npc-dm-note">
        <div class="npc-section-title">🎲 DM Notes <span class="quest-dm-tag">DM</span></div>
        <p class="npc-text">${n.dmNote||''}</p>
      </div>

    </div>
  </div>`;
}

// ── Quests ────────────────────────────────────────────────────────────────────

function renderQuests() {
  const camp=getActiveCampaign();
  const factionOpts=['Any',...FACTIONS.map(f=>f.name)].map(f=>`<option>${f}</option>`).join('');
  const regionOpts=['Any',...Object.keys(REGIONS)].map(r=>`<option>${r}</option>`).join('');
  const quests=camp?.quests||[];
  const active=quests.filter(q=>q.status==='Active');
  const complete=quests.filter(q=>q.status==='Complete');

  setContent(`
    <div class="view-header">
      <div>
        <h1>Quests</h1>
        <span class="subtitle">Full quest briefs — hook, acts, NPCs, encounters, twists, resolutions</span>
      </div>
    </div>
    <div class="gen-panel">
      <div class="gen-panel-fields">
        <div class="form-group"><label>Faction</label><select id="q-faction" class="form-select">${factionOpts}</select></div>
        <div class="form-group"><label>Region</label><select id="q-region" class="form-select">${regionOpts}</select></div>
        <div class="form-group"><label>Party Level</label><input id="q-level" class="form-input" type="number" min="1" max="20" value="${camp?.partyLevel||5}" style="width:70px"></div>
      </div>
      <button class="btn btn-primary gen-panel-btn" onclick="doGenerateQuest()">⚡ Generate Quest</button>
    </div>
    <div id="quest-result"></div>
    <hr class="section-hr">
    <div class="panel-header"><span>Active Quests (${active.length})</span></div>
    <div id="quest-list-active">${active.length ? `<div class="quest-list-stack">${active.map(q=>questRow(q)).join('')}</div>` : '<div class="empty-state"><div class="empty-state-icon">📜</div><div class="empty-state-title">No active quests</div><div class="empty-state-sub">Generate a faction-aware quest hook above.</div></div>'}</div>
    ${complete.length?`<hr class="section-hr"><div class="panel-header" style="opacity:.6"><span>Completed (${complete.length})</span></div><div class="quest-list-stack">${complete.map(q=>questRow(q)).join('')}</div>`:''}
  `);
}

function questRow(q) {
  const diffColors={Easy:'#3fb950',Medium:'#d29922',Hard:'#e07030',Deadly:'#c84040'};
  const barColor=diffColors[q.difficulty]||'var(--border)';
  const reward=q.rewards?q.rewards.material:q.reward||'';
  return `<div class="quest-item" onclick="expandQuestRow('${q.id}')">
    <div class="quest-item-bar" style="background:${barColor}"></div>
    <div class="quest-item-body">
      <div class="quest-item-header">
        <span class="quest-item-title">${q.icon||'📜'} ${q.title}</span>
        <div class="quest-item-badges">
          <span class="badge badge-${q.status}">${q.status}</span>
          <span class="badge badge-${q.difficulty}">${q.difficulty}</span>
        </div>
      </div>
      <div class="quest-item-chips">
        ${q.faction?`<span class="chip">${q.faction}</span>`:''}
        ${q.region?`<span class="chip">${q.region}</span>`:''}
        ${q.urgency?`<span class="chip">${q.urgency}</span>`:''}
      </div>
      ${reward?`<div class="quest-item-reward">💰 ${reward.slice(0,100)}${reward.length>100?'…':''}</div>`:''}
    </div>
    <div class="quest-item-arrow" style="flex-direction:column;gap:6px">
      ${q.status==='Active'?`<button class="btn btn-secondary btn-sm" onclick="event.stopPropagation();completeQuest('${q.id}')">✓</button>`:''}
      ${getActiveCampaign()?`<button class="btn-icon btn-danger-icon" onclick="event.stopPropagation();deleteQuest('${q.id}')">✕</button>`:''}
    </div>
  </div>
  <div id="qrow-${q.id}" style="display:none">${questDetailCard(q,false,true)}</div>`;
}

window.expandQuestRow=function(id){
  const el=document.getElementById('qrow-'+id);
  if(el) el.style.display = el.style.display==='none'?'block':'none';
};

window.doGenerateQuest=function(){
  const camp=getActiveCampaign();
  const fval=document.getElementById('q-faction').value;
  const rval=document.getElementById('q-region').value;
  const lvl=parseInt(document.getElementById('q-level')?.value)||camp?.partyLevel||5;
  const opts={level:lvl, partySize:camp?.partySize||4};
  if (fval!=='Any') opts.faction=fval;
  if (rval!=='Any') opts.region=rval;
  const q=generateQuest(opts);
  document.getElementById('quest-result').innerHTML=questDetailCard(q,true);
};

function questDetailCard(q, showSave=false, compact=false) {
  const diffColor={Easy:'ok',Medium:'warn',Hard:'warn',Deadly:'crit'}[q.difficulty]||'muted';
  const enc2html = enc => {
    if(!enc||!enc.monsters) return '<em style="color:var(--muted)">No encounter</em>';
    return enc.monsters.map(m=>`<span class="enc-tag">${m.displayName||m.name} <span style="color:var(--muted)">(${m.hp}hp / AC${m.ac})</span>${m.traits?` <span style="color:#9b9" title="${m.traits}">★</span>`:''}</span>`).join(' ');
  };

  const saveBtn = showSave&&getActiveCampaign()
    ? `<button class="btn btn-primary btn-sm" onclick="saveQuest('${encodeURIComponent(JSON.stringify(q))}')">💾 Save Quest</button>`
    : '';

  return `<div class="quest-card${compact?' quest-card-compact':''}">

    <div class="quest-header">
      <div>
        <div class="quest-icon">${q.icon||'📜'}</div>
        <div>
          <div class="quest-title">${q.title}</div>
          <div class="quest-meta-row">
            <span class="tag-${diffColor}">${q.difficulty}</span>
            <span class="quest-chip">${q.faction}</span>
            <span class="quest-chip">${q.region}</span>
            <span class="quest-chip">Lvl ${q.level||'?'}</span>
            <span class="quest-urgency">${q.urgency}</span>
          </div>
        </div>
      </div>
      <div style="display:flex;gap:8px;flex-shrink:0">
        ${saveBtn}
        ${showSave?`<button class="btn btn-secondary btn-sm" onclick="doGenerateQuest()">↻ Re-roll</button>`:''}
      </div>
    </div>

    <div class="quest-body">

      <div class="quest-section">
        <div class="quest-section-title">🎣 The Hook</div>
        <p class="quest-text">${q.hook}</p>
      </div>

      <div class="quest-section">
        <div class="quest-section-title">📖 Background <span class="quest-dm-tag">DM</span></div>
        <p class="quest-text">${q.background}</p>
      </div>

      <div class="quest-section">
        <div class="quest-section-title">🎯 Objective</div>
        <p class="quest-text">${q.objective}</p>
      </div>

      <div class="quest-section">
        <div class="quest-section-title">👥 Key People</div>
        <div class="quest-npc-grid">
          <div class="quest-npc-card">
            <div class="quest-npc-role">Quest Giver</div>
            <div class="quest-npc-name">${q.questGiver.name}</div>
            <div class="quest-npc-title">${q.questGiver.role}</div>
            <p class="quest-npc-desc"><em>${q.questGiver.personality}</em></p>
            <div class="quest-npc-secret"><span class="quest-dm-tag">DM</span> ${q.questGiver.secret}</div>
          </div>
          <div class="quest-npc-card quest-npc-villain">
            <div class="quest-npc-role">Antagonist</div>
            <div class="quest-npc-name">${q.villain.name}</div>
            <div class="quest-npc-title">${q.villain.arch}</div>
            <p class="quest-npc-desc">${q.villain.motivation}</p>
            <div class="quest-npc-secret"><span class="quest-dm-tag">DM</span> ${q.villain.secret}</div>
            <div style="margin-top:6px;font-size:11px;color:#e74c3c">⚠ ${q.villain.threat}</div>
          </div>
          <div class="quest-npc-card quest-npc-ally">
            <div class="quest-npc-role">Potential Ally</div>
            <div class="quest-npc-name">${q.ally.name}</div>
            <div class="quest-npc-title">${q.ally.role}</div>
            <p class="quest-npc-desc">${q.ally.usefulness}</p>
            <div class="quest-npc-secret"><em>${q.ally.condition}</em></div>
          </div>
        </div>
      </div>

      <div class="quest-section">
        <div class="quest-section-title">🗺 The Adventure</div>
        <div class="quest-acts">
          ${q.acts.map((act,i)=>`
            <div class="quest-act">
              <div class="quest-act-header">
                <span class="quest-act-num">${['I','II','III'][i]}</span>
                <span class="quest-act-name">${act.name}</span>
                <span class="quest-act-loc">📍 ${act.location}</span>
                <span class="tag-${i===0?'ok':i===1?'warn':'crit'}">${i===0?'Easy':i===1?q.difficulty:'Deadly'}</span>
              </div>
              <p class="quest-text" style="margin:8px 0">${act.desc}</p>
              <div class="quest-encounter-line">
                <span style="color:var(--muted);font-size:11px;margin-right:8px">⚔ Encounter:</span>
                ${enc2html(act.encounter)}
                <span style="color:var(--muted);font-size:11px;margin-left:8px">(${act.encounter?.totalXP||0} XP adjusted)</span>
              </div>
            </div>
          `).join('')}
        </div>
      </div>

      <div class="quest-two-col">
        <div class="quest-section">
          <div class="quest-section-title">🔀 Twists <span class="quest-dm-tag">DM</span></div>
          <ul class="quest-list">
            ${q.twists.map(t=>`<li>${t}</li>`).join('')}
          </ul>
        </div>
        <div class="quest-section">
          <div class="quest-section-title">⚡ Complications</div>
          <ul class="quest-list">
            ${q.complications.map(c=>`<li>${c}</li>`).join('')}
          </ul>
        </div>
      </div>

      <div class="quest-section">
        <div class="quest-section-title">🏁 Resolution Paths</div>
        <div class="quest-resolutions">
          ${q.resolutions.map(r=>`
            <div class="quest-resolution">
              <div class="quest-resolution-name">${r.name}</div>
              <p class="quest-text">${r.desc}</p>
            </div>
          `).join('')}
        </div>
      </div>

      <div class="quest-rewards">
        <div class="quest-section-title">💰 Rewards</div>
        <div class="quest-reward-row"><span class="quest-reward-key">Material</span><span>${q.rewards.material}</span></div>
        <div class="quest-reward-row"><span class="quest-reward-key">Story</span><span>${q.rewards.story}</span></div>
        <div class="quest-reward-row"><span class="quest-reward-key">Optional</span><span style="color:var(--accent)">${q.rewards.optional}</span></div>
      </div>

      <div class="quest-section quest-dm-notes">
        <div class="quest-section-title">🎲 DM Notes <span class="quest-dm-tag">DM</span></div>
        <p class="quest-text">${q.dmNotes}</p>
      </div>

    </div>
  </div>`;
}

window.saveQuest=function(data){
  const camp=getActiveCampaign(); if(!camp) return;
  const q=JSON.parse(decodeURIComponent(data));
  q.id=uuid(); q.created=Date.now(); q.status='Active';
  camp.quests.push(q); saveState(); renderQuests(); showToast('Quest saved!');
};

window.completeQuest=function(id){
  const camp=getActiveCampaign(); if(!camp) return;
  const q=camp.quests.find(q=>q.id===id); if(q) q.status='Complete';
  saveState(); renderQuests();
};

window.deleteQuest=function(id){
  const camp=getActiveCampaign(); if(!camp) return;
  camp.quests=camp.quests.filter(q=>q.id!==id); saveState(); renderQuests();
};

// ── Encounters ────────────────────────────────────────────────────────────────

function renderEncounters() {
  const camp=getActiveCampaign();
  const level=camp?.partyLevel||5;
  const size=camp?.partySize||4;
  const envOpts=['(Random)','Dungeon Corridor','Ruined Chamber','Forest Clearing','Tavern Common Room','Mountain Pass','Underground Lake Shore','Burning Building','Ship Deck','Sewer Tunnel','Ancient Temple','City Rooftops','Frozen Tundra'].map(e=>`<option>${e}</option>`).join('');

  setContent(`
    <div class="view-header">
      <div>
        <h1>Encounters</h1>
        <span class="subtitle">Full encounter briefs — environment, terrain, tactics, skill opportunities, loot</span>
      </div>
    </div>
    <div class="gen-panel">
      <div class="gen-panel-fields">
        <div class="form-group"><label>Party Level</label><input id="enc-level" class="form-input" type="number" min="1" max="20" value="${level}" style="width:80px"></div>
        <div class="form-group"><label>Party Size</label><input id="enc-size" class="form-input" type="number" min="1" max="8" value="${size}" style="width:80px"></div>
        <div class="form-group"><label>Difficulty</label>
          <select id="enc-diff" class="form-select">
            <option value="easy">Easy</option>
            <option value="medium" selected>Medium</option>
            <option value="hard">Hard</option>
            <option value="deadly">Deadly</option>
          </select>
        </div>
        <div class="form-group"><label>Environment</label>
          <select id="enc-env" class="form-select">${envOpts}</select>
        </div>
      </div>
      <button class="btn btn-primary gen-panel-btn" onclick="doGenerateEncounter()">⚔ Generate</button>
    </div>
    <div id="enc-result"></div>
    ${camp?.activeCombat?`<hr class="section-hr"><div class="panel-header"><span>🩸 Active Combat</span></div><div class="info-card"><p>Round ${camp.activeCombat.round} — ${camp.activeCombat.combatants.length} combatants</p><button class="btn btn-primary" onclick="navigate('combat')">Resume Combat →</button></div>`:''}
  `);
}

window.doGenerateEncounter=function(){
  const level=parseInt(document.getElementById('enc-level').value)||5;
  const size=parseInt(document.getElementById('enc-size').value)||4;
  const diff=document.getElementById('enc-diff').value;
  const envSel=document.getElementById('enc-env').value;
  const envOverride=envSel==='(Random)'?null:envSel;
  const enc=generateEncounter(level,size,diff,envOverride);
  document.getElementById('enc-result').innerHTML=encounterCard(enc);
};

function encounterCard(enc) {
  const diffColor={easy:'ok',medium:'warn',hard:'warn',deadly:'crit'}[enc.difficulty]||'muted';
  const env=enc.environment||{};

  // Parse "Label: rule text" format for terrain features
  const featuresHtml=(env.features||[]).map(f=>{
    const ci=f.indexOf(':');
    const name=ci>-1?f.slice(0,ci):f;
    const rule=ci>-1?f.slice(ci+1).trim():'';
    return `<div class="enc-feature"><div class="enc-feature-name">${name}</div>${rule?`<div class="enc-feature-rule">${rule}</div>`:''}</div>`;
  }).join('');

  // Monster count map for display
  const monsterCounts={};
  enc.monsters.forEach(m=>{ monsterCounts[m.name]=(monsterCounts[m.name]||0)+1; });

  const monstersHtml=(enc.uniqueMonsters||enc.monsters).map(m=>{
    const count=monsterCounts[m.name]||1;
    const atkStr=typeof m.atk==='number'?(m.atk>=0?`+${m.atk}`:String(m.atk)):(m.atk||'—');
    return `<div class="enc-monster">
      <div class="enc-monster-header">
        <span class="enc-monster-name">${m.name}</span>
        <span class="enc-monster-cr">CR ${m.cr}</span>
        <span class="enc-monster-type">${m.type||''}</span>
        ${count>1?`<span class="enc-monster-count">${count}×</span>`:''}
      </div>
      <div class="enc-stat-bar">
        <div class="enc-stat-item"><span class="enc-stat-label">HP</span><span class="enc-stat-val">${m.hp}</span></div>
        <div class="enc-stat-item"><span class="enc-stat-label">AC</span><span class="enc-stat-val">${m.ac}</span></div>
        <div class="enc-stat-item"><span class="enc-stat-label">ATK</span><span class="enc-stat-val">${atkStr}</span></div>
        <div class="enc-stat-item"><span class="enc-stat-label">DMG</span><span class="enc-stat-val">${m.dmg||'—'}</span></div>
        <div class="enc-stat-item"><span class="enc-stat-label">Speed</span><span class="enc-stat-val">${m.speed||30}ft</span></div>
        <div class="enc-stat-item"><span class="enc-stat-label">XP</span><span class="enc-stat-val">${m.xp}</span></div>
      </div>
      ${m.traits?`<div class="enc-monster-traits">${m.traits}</div>`:''}
    </div>`;
  }).join('');

  const tactics=enc.tactics||{};
  const tacticsHtml=[
    {label:'Round 1 — Opening',text:tactics.open||''},
    {label:'Sustained Play',text:tactics.sustain||''},
    {label:'Morale & Break Points',text:tactics.morale||''},
  ].map(t=>`<div class="enc-tactic"><div class="enc-tactic-label">${t.label}</div>${t.text}</div>`).join('');

  const skillOppsHtml=(enc.skillOpps||[]).map(s=>`
    <div class="enc-skill-opp">
      <span class="enc-skill-badge">${s.skill}</span>
      <span class="enc-skill-effect">${s.effect}</span>
    </div>`).join('');

  const lootHtml=(enc.loot||[]).map(l=>`<div class="enc-loot-item">${l}</div>`).join('');
  const encData=encodeURIComponent(JSON.stringify(enc));

  return `<div class="enc-card">
    <div class="enc-header">
      <div>
        <span class="tag-${diffColor}" style="font-size:17px;font-weight:800;letter-spacing:1px">${enc.difficulty.toUpperCase()}</span>
        <div class="enc-xp-row">Budget ${enc.budget} XP · Raw ${enc.rawXP} XP · Adjusted <strong>${enc.totalXP} XP</strong> · ${enc.partySize} players · Level ${enc.partyLevel}</div>
      </div>
      <div class="enc-env-block">
        <div class="enc-env-name">📍 ${env.name||'Environment'}</div>
        <div class="enc-env-desc">${env.desc||''}</div>
      </div>
    </div>
    <div class="enc-body">
      <div class="enc-section">
        <div class="enc-section-title">🗺 Terrain Features</div>
        <div class="enc-features">${featuresHtml}</div>
      </div>
      <div class="enc-section">
        <div class="enc-section-title">👹 Monster Roster — ${enc.monsterSummary||''}</div>
        <div class="enc-monsters">${monstersHtml}</div>
      </div>
      <div class="enc-section">
        <div class="enc-section-title">⚔ Tactical Brief — ${enc.dominantType||''} tactics</div>
        <div class="enc-tactic-grid">${tacticsHtml}</div>
      </div>
      <div class="enc-section">
        <div class="enc-section-title">🎯 Skill Opportunities</div>
        <div class="enc-skill-opps">${skillOppsHtml}</div>
      </div>
      <div class="enc-section">
        <div class="enc-section-title">🔺 Escalation Option</div>
        <div class="enc-escalation">${enc.escalation||''}</div>
      </div>
      <div class="enc-section">
        <div class="enc-section-title">💰 Loot (Level ${enc.partyLevel})</div>
        <div class="enc-loot">${lootHtml}</div>
      </div>
      <div class="enc-section">
        <div class="enc-section-title"><span class="quest-dm-tag">DM</span> Notes</div>
        <div class="enc-dm-note">${enc.dmNote||''}</div>
      </div>
    </div>
    <div class="enc-actions">
      <button class="btn btn-primary" onclick="launchCombat('${encData}')">⚔ Start Combat</button>
      <button class="btn btn-secondary btn-sm" onclick="doGenerateEncounter()">Re-generate</button>
    </div>
  </div>`;
}

window.launchCombat=function(data){
  const camp=getActiveCampaign(); if(!camp) return;
  const enc=JSON.parse(decodeURIComponent(data));
  const combatants=enc.monsters.map(m=>({
    id:m.id||uuid(),
    name:m.displayName||m.name,
    type:'monster',
    emoji:'👹',
    initiative:roll(20),
    initBonus:0,
    hp:m.hp, maxHp:m.hp, ac:m.ac,
    atk:m.atk, dmg:m.dmg, cr:m.cr,
    conditions:[], notes:'', defeated:false,
    concentrating:null, deathSuccesses:0, deathFailures:0,
  }));
  combatants.sort((a,b)=>b.initiative-a.initiative);
  const combat={
    id:uuid(),
    name:`${enc.difficulty.charAt(0).toUpperCase()+enc.difficulty.slice(1)} Encounter`,
    round:1, activeIdx:0,
    combatants,
    log:[],
    partyLevel:enc.partyLevel,
    partySize:enc.partySize,
    xp:enc.totalXP,
    started:Date.now(),
    environment:enc.environment||null,
    tactics:enc.tactics||null,
  };
  _combatLog(combat, `Combat started — ${enc.monsterSummary||''}${enc.environment?' in '+enc.environment.name:''}`);
  camp.activeCombat=combat;
  saveState(); buildSidebar(); navigate('combat');
};

// ── Combat Tracker ────────────────────────────────────────────────────────────

function _combatLog(combat, msg) {
  combat.log = combat.log || [];
  combat.log.unshift({ round: combat.round, msg, ts: Date.now() });
  if (combat.log.length > 150) combat.log.length = 150;
}

function renderCombat() {
  const camp=getActiveCampaign();
  if (!camp||!camp.activeCombat) {
    setContent(`<div class="view-header"><h1>⚔ Combat</h1></div><p class="empty-msg">No active combat. Build an encounter to start one.</p><button class="btn btn-primary" onclick="navigate('encounters')">Build Encounter</button>`);
    return;
  }
  const combat=camp.activeCombat;
  const alive=combat.combatants.filter(c=>!c.defeated).length;
  const active=combat.combatants[combat.activeIdx];
  const log=combat.log||[];

  const logHtml=log.length
    ? log.map(e=>`<div class="log-entry"><span class="log-round">R${e.round}</span> ${e.msg}</div>`).join('')
    : '<div class="log-entry" style="color:var(--muted)">No events yet.</div>';

  const envHtml=combat.environment?`
    <div class="combat-env-panel">
      <div class="combat-side-title">📍 ${combat.environment.name}</div>
      <div class="combat-env-features">${(combat.environment.features||[]).map(f=>{
        const ci=f.indexOf(':');
        return `<div class="combat-env-feature"><strong>${ci>-1?f.slice(0,ci):f}</strong>${ci>-1?': '+f.slice(ci+1).trim():''}</div>`;
      }).join('')}</div>
    </div>`:''

  const tacticsHtml=combat.tactics?`
    <div class="combat-tactics-panel">
      <div class="combat-side-title">⚔ Tactics Reference</div>
      <div class="combat-tactic-item"><span class="combat-tactic-label">Opening</span>${combat.tactics.open}</div>
      <div class="combat-tactic-item"><span class="combat-tactic-label">Sustained</span>${combat.tactics.sustain}</div>
      <div class="combat-tactic-item"><span class="combat-tactic-label">Morale</span>${combat.tactics.morale}</div>
    </div>`:''

  setContent(`
    <div class="combat-header">
      <div>
        <h1 style="margin:0">${combat.name}</h1>
        <div class="combat-meta">Round ${combat.round} · ${alive} active · ${combat.xp||0} XP</div>
      </div>
      <div class="combat-actions">
        <button class="btn btn-primary" onclick="combatNextTurn()">▶ Next Turn</button>
        <button class="btn btn-secondary" onclick="showAddCombatantModal()">+ Add</button>
        <button class="btn btn-secondary" onclick="rollAllInitiative()">🎲 Roll Initiative</button>
        <button class="btn btn-danger" onclick="endCombat()">End Combat</button>
      </div>
    </div>
    ${active?`<div class="active-banner">⚡ <strong>${active.name}'s turn</strong>${active.concentrating?` &nbsp;🔮 <em>${active.concentrating}</em>`:''}</div>`:''}
    <div class="combat-main-grid">
      <div id="combatant-list">
        ${combat.combatants.map((c,i)=>combatantRow(c,i,i===combat.activeIdx)).join('')}
      </div>
      <div class="combat-side-panel">
        <div class="combat-log">
          <div class="combat-log-header">📋 Combat Log</div>
          <div class="combat-log-body">${logHtml}</div>
        </div>
        ${envHtml}
        ${tacticsHtml}
      </div>
    </div>
  `);
}

function combatantRow(c, idx, isActive) {
  const hpPct=Math.max(0,Math.min(100,Math.round(c.hp/c.maxHp*100)));
  const hpClass=hpPct>60?'hp-ok':hpPct>30?'hp-low':'hp-crit';
  const condTags=c.conditions.map(cond=>`<span class="cond-tag" onclick="removeCombatantCondition('${c.id}','${cond}')">${cond} ✕</span>`).join('');
  const atkStr=c.atk?(typeof c.atk==='number'?(c.atk>=0?'+':'')+c.atk:c.atk):'';

  const concBadge=c.concentrating
    ? `<span class="cr-conc-badge" onclick="setConcentration('${c.id}')">🔮 ${c.concentrating}</span>`
    : (!c.defeated?`<button class="cond-add cr-conc-btn" onclick="setConcentration('${c.id}')">+ Conc.</button>`:'');

  const deathSavesHtml=(c.type==='player'&&c.hp===0&&!c.defeated)?`
    <div class="cr-deathsaves">
      <span class="cr-death-label">Death Saves</span>
      <span class="cr-death-group">
        ${[0,1,2].map(i=>`<span class="cr-ds cr-ds-success${i<(c.deathSuccesses||0)?' cr-ds-filled':''}" onclick="doDeathSave('${c.id}',true)">✓</span>`).join('')}
        ${[0,1,2].map(i=>`<span class="cr-ds cr-ds-fail${i<(c.deathFailures||0)?' cr-ds-filled':''}" onclick="doDeathSave('${c.id}',false)">✗</span>`).join('')}
      </span>
    </div>`:'';

  return `<div class="combatant-row ${isActive?'combatant-active':''} ${c.defeated?'combatant-dead':''}" id="cr-${c.id}">
    <div class="cr-init" onclick="editInitiative('${c.id}')" title="Click to edit initiative">
      <div class="cr-init-num">${c.initiative}</div>
      <div class="cr-init-label">INIT</div>
    </div>
    <div class="cr-body">
      <div class="cr-top">
        <span class="cr-name ${c.type==='player'?'cr-player':''}">${c.emoji||'👹'} ${c.name}</span>
        ${c.cr!==undefined?`<span class="cr-meta">CR ${c.cr}</span>`:''}
        ${c.type==='player'?'<span class="cr-meta cr-player-label">Player</span>':''}
        ${isActive?'<span class="cr-active-badge">ACTIVE TURN</span>':''}
        ${c.defeated?'<span class="cr-dead-badge">DEFEATED</span>':''}
      </div>
      <div class="cr-mid">
        <div class="cr-hp-area">
          <span class="cr-hp-text ${c.hp/c.maxHp<0.3?'cr-hp-crit':c.hp/c.maxHp<0.6?'cr-hp-low':''}">${c.defeated?'0':c.hp} / ${c.maxHp} HP</span>
          <div class="cr-hp-bar-wrap"><div class="cr-hp-bar ${hpClass}" style="width:${c.defeated?0:hpPct}%"></div></div>
        </div>
        <span class="cr-ac">AC ${c.ac}</span>
        ${atkStr?`<span class="cr-meta">ATK ${atkStr}${c.dmg?' · '+c.dmg:''}</span>`:''}
      </div>
      ${!c.defeated?`<div class="cr-conds">${condTags}<button class="cond-add" onclick="showConditionPicker('${c.id}')">+ Condition</button>${concBadge}${c.notes?`<span class="cr-note">${c.notes}</span>`:''}</div>`:(condTags?`<div class="cr-conds">${condTags}</div>`:'')}
      ${deathSavesHtml}
    </div>
    <div class="cr-btns">
      ${!c.defeated?`
        <button class="cr-btn cr-btn-heal" onclick="combatEditHP('${c.id}',true)">+HP</button>
        <button class="cr-btn cr-btn-dmg"  onclick="combatEditHP('${c.id}',false)">-HP</button>
        <button class="cr-btn" onclick="editCombatantNotes('${c.id}')" title="Edit notes">📝</button>
      `:''}
      <button class="cr-btn" onclick="toggleDefeated('${c.id}')">${c.defeated?'↩':'💀'}</button>
      <button class="cr-btn cr-btn-del" onclick="removeCombatant('${c.id}')">✕</button>
    </div>
  </div>`;
}

window.combatNextTurn=function(){
  const camp=getActiveCampaign(); if(!camp||!camp.activeCombat) return;
  const combat=camp.activeCombat;
  const len=combat.combatants.length;
  let next=combat.activeIdx;
  for (let i=0;i<len;i++) {
    next=(next+1)%len;
    if (!combat.combatants[next].defeated) break;
  }
  if (next<=combat.activeIdx) combat.round++;
  combat.activeIdx=next;
  const active=combat.combatants[next];
  _combatLog(combat, `▶ ${active.name}'s turn${active.concentrating?` — 🔮 ${active.concentrating}`:''}${active.conditions.length?` (${active.conditions.join(', ')})`:''}`);
  saveState(); renderCombat();
};

window.rollAllInitiative=function(){
  const camp=getActiveCampaign(); if(!camp||!camp.activeCombat) return;
  const combat=camp.activeCombat;
  combat.combatants.forEach(c=>{ c.initiative=roll(20)+(c.initBonus||0); });
  combat.combatants.sort((a,b)=>b.initiative-a.initiative);
  combat.activeIdx=0;
  saveState(); renderCombat();
};

window.combatEditHP=function(id, isHeal){
  const camp=getActiveCampaign(); if(!camp||!camp.activeCombat) return;
  const c=camp.activeCombat.combatants.find(x=>x.id===id); if(!c) return;
  showModal(isHeal?`Heal ${c.name}`:`Damage ${c.name}`,`
    <label class="form-label">Amount</label>
    <input id="hp-amount" class="form-input" type="number" min="0" value="0" autofocus>
    <p style="color:var(--muted);font-size:13px;margin-top:8px">Current HP: ${c.hp} / ${c.maxHp}</p>
  `,[
    {label:isHeal?'Heal':'Apply Damage',cls:'btn-primary',action:`doEditHP('${id}',${isHeal})`},
    {label:'Cancel',action:'closeModal()'},
  ]);
  setTimeout(()=>document.getElementById('hp-amount')?.focus(),50);
};

window.doEditHP=function(id, isHeal){
  const amt=parseInt(document.getElementById('hp-amount').value)||0;
  const camp=getActiveCampaign(); if(!camp||!camp.activeCombat) return;
  const combat=camp.activeCombat;
  const c=combat.combatants.find(x=>x.id===id); if(!c) return;
  if (isHeal) {
    c.hp=Math.min(c.maxHp, c.hp+amt);
    if (c.hp>0) { c.deathSuccesses=0; c.deathFailures=0; c.defeated=false; }
    _combatLog(combat, `💚 ${c.name} healed ${amt} HP → ${c.hp}/${c.maxHp}`);
  } else {
    const prev=c.hp;
    c.hp=Math.max(0, c.hp-amt);
    const concNote=c.concentrating?` — Conc. DC ${Math.max(10,Math.floor(amt/2))}!`:'';
    _combatLog(combat, `💥 ${c.name} took ${amt} damage (${prev}→${c.hp} HP)${concNote}`);
    if (c.hp===0) {
      if (c.type==='player') {
        _combatLog(combat, `⚠ ${c.name} is down — rolling death saves`);
      } else {
        c.defeated=true;
        _combatLog(combat, `💀 ${c.name} defeated`);
      }
    }
  }
  saveState(); closeModal(); renderCombat();
};

window.editInitiative=function(id){
  const camp=getActiveCampaign(); if(!camp||!camp.activeCombat) return;
  const c=camp.activeCombat.combatants.find(x=>x.id===id); if(!c) return;
  showModal(`Edit Initiative: ${c.name}`,`
    <label class="form-label">Initiative</label>
    <input id="init-val" class="form-input" type="number" value="${c.initiative}">
  `,[
    {label:'Save',cls:'btn-primary',action:`doEditInitiative('${id}')`},
    {label:'Cancel',action:'closeModal()'},
  ]);
};

window.doEditInitiative=function(id){
  const val=parseInt(document.getElementById('init-val').value)||0;
  const camp=getActiveCampaign(); if(!camp||!camp.activeCombat) return;
  const c=camp.activeCombat.combatants.find(x=>x.id===id); if(!c) return;
  c.initiative=val;
  camp.activeCombat.combatants.sort((a,b)=>b.initiative-a.initiative);
  saveState(); closeModal(); renderCombat();
};

window.editCombatantNotes=function(id){
  const camp=getActiveCampaign(); if(!camp||!camp.activeCombat) return;
  const c=camp.activeCombat.combatants.find(x=>x.id===id); if(!c) return;
  showModal(`📝 ${c.name}`,`
    <label class="form-label">Notes</label>
    <textarea id="notes-val" class="form-input" style="min-height:120px;resize:vertical">${c.notes||''}</textarea>
  `,[
    {label:'Save',cls:'btn-primary',action:`doEditCombatantNotes('${id}')`},
    {label:'Cancel',action:'closeModal()'},
  ]);
  setTimeout(()=>document.getElementById('notes-val')?.focus(),50);
};

window.doEditCombatantNotes=function(id){
  const notes=document.getElementById('notes-val').value;
  const camp=getActiveCampaign(); if(!camp||!camp.activeCombat) return;
  const c=camp.activeCombat.combatants.find(x=>x.id===id); if(!c) return;
  c.notes=notes;
  saveState(); closeModal(); renderCombat();
};

window.showConditionPicker=function(id){
  showModal('Add Condition',`
    <div class="cond-picker">
      ${CONDITIONS.map(cond=>{
        const name=typeof cond==='object'?cond.name:cond;
        const desc=typeof cond==='object'?cond.desc:'';
        return `<div class="cond-pick-item" onclick="doAddCondition('${id}','${name.replace(/'/g,"\\'")}')">
          <div class="cond-pick-name">${name}</div>
          ${desc?`<div class="cond-pick-desc">${desc}</div>`:''}
        </div>`;
      }).join('')}
    </div>
  `,[{label:'Cancel',action:'closeModal()'}]);
};

window.doAddCondition=function(id,cond){
  const camp=getActiveCampaign(); if(!camp||!camp.activeCombat) return;
  const combat=camp.activeCombat;
  const c=combat.combatants.find(x=>x.id===id); if(!c) return;
  if (!c.conditions.includes(cond)) c.conditions.push(cond);
  _combatLog(combat, `🔴 ${c.name} gained condition: <strong>${cond}</strong>`);
  saveState(); closeModal(); renderCombat();
};

window.removeCombatantCondition=function(id,cond){
  const camp=getActiveCampaign(); if(!camp||!camp.activeCombat) return;
  const combat=camp.activeCombat;
  const c=combat.combatants.find(x=>x.id===id); if(!c) return;
  c.conditions=c.conditions.filter(x=>x!==cond);
  _combatLog(combat, `✅ ${c.name}: ${cond} removed`);
  saveState(); renderCombat();
};

window.toggleDefeated=function(id){
  const camp=getActiveCampaign(); if(!camp||!camp.activeCombat) return;
  const combat=camp.activeCombat;
  const c=combat.combatants.find(x=>x.id===id); if(!c) return;
  c.defeated=!c.defeated;
  if(c.defeated){ c.hp=0; _combatLog(combat, `💀 ${c.name} defeated`); }
  else { c.hp=Math.max(1,Math.floor(c.maxHp/2)); c.deathSuccesses=0; c.deathFailures=0; _combatLog(combat, `🔄 ${c.name} revived at ${c.hp} HP`); }
  saveState(); renderCombat();
};

window.removeCombatant=function(id){
  const camp=getActiveCampaign(); if(!camp||!camp.activeCombat) return;
  camp.activeCombat.combatants=camp.activeCombat.combatants.filter(x=>x.id!==id);
  saveState(); renderCombat();
};

window.showAddCombatantModal=function(){
  showModal('Add Combatant',`
    <label class="form-label">Name</label>
    <input id="ac-name" class="form-input" placeholder="Goblin Scout" value="">
    <div class="form-row">
      <div><label class="form-label">HP</label><input id="ac-hp" class="form-input" type="number" min="1" value="10"></div>
      <div><label class="form-label">AC</label><input id="ac-ac" class="form-input" type="number" min="1" value="12"></div>
      <div><label class="form-label">Initiative</label><input id="ac-init" class="form-input" type="number" value="${roll(20)}"></div>
      <div><label class="form-label">Init Bonus</label><input id="ac-initbonus" class="form-input" type="number" value="0" style="width:60px"></div>
    </div>
    <div class="form-row">
      <div><label class="form-label">ATK Bonus</label><input id="ac-atk" class="form-input" placeholder="+4" value=""></div>
      <div><label class="form-label">Damage</label><input id="ac-dmg" class="form-input" placeholder="1d8+3" value=""></div>
    </div>
    <label class="form-label">Type</label>
    <select id="ac-type" class="form-select"><option value="monster">Monster</option><option value="player">Player</option></select>
  `,[
    {label:'Add',cls:'btn-primary',action:'doAddCombatant()'},
    {label:'Cancel',action:'closeModal()'},
  ]);
};

window.doAddCombatant=function(){
  const camp=getActiveCampaign(); if(!camp||!camp.activeCombat) return;
  const combat=camp.activeCombat;
  const name=document.getElementById('ac-name').value.trim()||'Unknown';
  const hp=parseInt(document.getElementById('ac-hp').value)||10;
  const ac=parseInt(document.getElementById('ac-ac').value)||12;
  const init=parseInt(document.getElementById('ac-init').value)||10;
  const initBonus=parseInt(document.getElementById('ac-initbonus').value)||0;
  const atk=document.getElementById('ac-atk').value.trim()||'';
  const dmg=document.getElementById('ac-dmg').value.trim()||'';
  const type=document.getElementById('ac-type').value;
  combat.combatants.push({
    id:uuid(),name,type,emoji:type==='player'?'🧙':'👹',
    initiative:init,initBonus,
    hp,maxHp:hp,ac,atk,dmg,
    conditions:[],notes:'',defeated:false,
    concentrating:null,deathSuccesses:0,deathFailures:0,
  });
  combat.combatants.sort((a,b)=>b.initiative-a.initiative);
  _combatLog(combat, `➕ ${name} added to combat (${type})`);
  saveState(); closeModal(); renderCombat();
};

window.endCombat=function(){
  if (!confirm('End combat and save to history?')) return;
  const camp=getActiveCampaign(); if(!camp||!camp.activeCombat) return;
  camp.combatHistory.push({...camp.activeCombat, ended:Date.now()});
  camp.activeCombat=null;
  saveState(); buildSidebar(); navigate('dashboard');
};

window.setConcentration=function(id){
  const camp=getActiveCampaign(); if(!camp?.activeCombat) return;
  const c=camp.activeCombat.combatants.find(x=>x.id===id); if(!c) return;
  showModal(`Concentration: ${c.name}`,`
    <label class="form-label">Concentrating on (leave blank to clear)</label>
    <input id="conc-val" class="form-input" placeholder="e.g. Hold Person, Darkness…" value="${c.concentrating||''}">
  `,[
    {label:'Save',cls:'btn-primary',action:`doSetConcentration('${id}')`},
    {label:'Cancel',action:'closeModal()'},
  ]);
  setTimeout(()=>document.getElementById('conc-val')?.focus(),50);
};

window.doSetConcentration=function(id){
  const val=document.getElementById('conc-val').value.trim();
  const camp=getActiveCampaign(); if(!camp?.activeCombat) return;
  const combat=camp.activeCombat;
  const c=combat.combatants.find(x=>x.id===id); if(!c) return;
  const prev=c.concentrating;
  c.concentrating=val||null;
  if(val) _combatLog(combat, `🔮 ${c.name} concentrating on <em>${val}</em>`);
  else if(prev) _combatLog(combat, `${c.name} dropped concentration (${prev})`);
  saveState(); closeModal(); renderCombat();
};

window.doDeathSave=function(id, success){
  const camp=getActiveCampaign(); if(!camp?.activeCombat) return;
  const combat=camp.activeCombat;
  const c=combat.combatants.find(x=>x.id===id); if(!c) return;
  if(success){
    c.deathSuccesses=Math.min(3,(c.deathSuccesses||0)+1);
    if(c.deathSuccesses>=3){
      c.hp=1; c.deathSuccesses=0; c.deathFailures=0;
      _combatLog(combat, `🌟 ${c.name} stabilized at 1 HP!`);
    } else {
      _combatLog(combat, `✓ ${c.name} death save success (${c.deathSuccesses}/3)`);
    }
  } else {
    c.deathFailures=Math.min(3,(c.deathFailures||0)+1);
    if(c.deathFailures>=3){
      c.defeated=true; c.hp=0;
      _combatLog(combat, `💀 ${c.name} died — 3 failed death saves`);
    } else {
      _combatLog(combat, `✗ ${c.name} death save failure (${c.deathFailures}/3)`);
    }
  }
  saveState(); renderCombat();
};

// ── Lore ──────────────────────────────────────────────────────────────────────

function renderLore() {
  setContent(`
    <div class="view-header">
      <div>
        <h1>Lore Reference</h1>
        <span class="subtitle">Wildemount world knowledge, factions & history</span>
      </div>
    </div>
    <div class="filter-pills" id="lore-tabs">
      <button class="filter-pill active" data-tab="factions" onclick="showLoreTab('factions',this)"><span class="filter-pill-icon">⚔</span> Factions</button>
      <button class="filter-pill" data-tab="regions" onclick="showLoreTab('regions',this)"><span class="filter-pill-icon">📍</span> Regions</button>
      <button class="filter-pill" data-tab="deities" onclick="showLoreTab('deities',this)"><span class="filter-pill-icon">✦</span> Deities</button>
      <button class="filter-pill" data-tab="npcs" onclick="showLoreTab('npcs',this)"><span class="filter-pill-icon">🧙</span> Key NPCs</button>
      <button class="filter-pill" data-tab="history" onclick="showLoreTab('history',this)"><span class="filter-pill-icon">📜</span> History</button>
      <button class="filter-pill" data-tab="plots" onclick="showLoreTab('plots',this)"><span class="filter-pill-icon">◈</span> Plot Seeds</button>
      <button class="filter-pill" data-tab="names" onclick="showLoreTab('names',this)"><span class="filter-pill-icon">◌</span> Names</button>
    </div>
    <div id="lore-content"></div>
  `);
  showLoreTab('factions', document.querySelector('.filter-pill'));
}

window.showLoreTab=function(tab, btn){
  document.querySelectorAll('#lore-tabs .filter-pill').forEach(b=>b.classList.remove('active'));
  if (btn) btn.classList.add('active');
  const el=document.getElementById('lore-content');
  if (tab==='factions') {
    el.innerHTML=FACTIONS.map(f=>`
      <div class="info-card" style="margin-bottom:12px">
        <div class="ic-title">${f.name}</div>
        <div class="ic-row"><span class="ic-key">Region</span><span>${f.region}</span><span class="ic-key" style="margin-left:16px">Alignment</span><span>${f.alignment}</span></div>
        <p style="color:var(--muted);font-size:13px;margin:8px 0">${f.desc}</p>
        <div class="ic-key">Plot Hooks:</div>
        <ul class="lore-list">${f.hooks.map(h=>`<li>${h}</li>`).join('')}</ul>
      </div>
    `).join('');
  } else if (tab==='regions') {
    el.innerHTML=Object.entries(REGIONS).map(([name,r])=>`
      <div class="info-card" style="margin-bottom:12px">
        <div class="ic-title">${name}</div>
        <div class="ic-row"><span class="ic-key">Locations</span><span>${r.locations.join(', ')}</span></div>
        <div class="ic-row"><span class="ic-key">Terrain</span><span>${r.terrain.join(', ')}</span></div>
        <div class="ic-key" style="margin-top:8px">Encounter Flavour:</div>
        <ul class="lore-list">${r.encounter_flavour.map(f=>`<li>${f}</li>`).join('')}</ul>
      </div>
    `).join('');
  } else if (tab==='deities') {
    const prime=DEITIES.filter(d=>d.type==='Prime');
    const betrayer=DEITIES.filter(d=>d.type==='Betrayer');
    const unique=DEITIES.filter(d=>d.type.startsWith('Unique'));
    const section=(title,list)=>`<h3 class="lore-section-title">${title}</h3><div class="deity-grid">${list.map(d=>`
      <div class="deity-card">
        <div class="deity-name">${d.name}</div>
        <div class="deity-domain">${d.domain}</div>
        <div class="deity-align">${d.alignment}</div>
      </div>
    `).join('')}</div>`;
    el.innerHTML=section('Prime Deities',prime)+section('Betrayer Gods',betrayer)+section('Unique Entities',unique);
  } else if (tab==='npcs') {
    el.innerHTML=NPCS.map(n=>`
      <div class="info-card" style="margin-bottom:12px">
        <div class="ic-title">${n.name}</div>
        <div class="ic-row"><span class="ic-key">Role</span><span>${n.role}</span><span class="ic-key" style="margin-left:16px">Faction</span><span>${n.faction}</span><span class="ic-key" style="margin-left:16px">Alignment</span><span>${n.alignment}</span></div>
        <p style="color:var(--muted);font-size:13px;margin:8px 0">${n.desc}</p>
      </div>
    `).join('');
  } else if (tab==='history') {
    el.innerHTML=HISTORICAL_EVENTS.map(e=>`
      <div class="info-card" style="margin-bottom:12px">
        <div class="ic-title">${e.name}</div>
        <div class="ic-row"><span class="ic-key">Era</span><span>${e.era}</span></div>
        <p style="color:var(--muted);font-size:13px;margin:8px 0">${e.desc}</p>
      </div>
    `).join('');
  } else if (tab==='plots') {
    el.innerHTML=`<div class="plot-grid">${PLOT_SEEDS.map((s,i)=>`<div class="plot-card"><div class="plot-num">${i+1}</div><p>${s}</p></div>`).join('')}</div>`;
  } else if (tab==='names') {
    const cultures=Object.keys(NAMES);
    el.innerHTML=`
      <div class="gen-controls" style="margin-bottom:20px">
        <div class="gen-field"><label class="form-label">Culture</label>
          <select id="name-culture" class="form-select">${cultures.map(c=>`<option>${c}</option>`).join('')}</select>
        </div>
        <div class="gen-field"><label class="form-label">Count</label>
          <input id="name-count" class="form-input" type="number" min="1" max="20" value="10" style="width:80px">
        </div>
        <button class="btn btn-primary" onclick="doGenerateNames()">Generate Names</button>
      </div>
      <div id="name-results"></div>
    `;
  }
};

window.doGenerateNames=function(){
  const culture=document.getElementById('name-culture').value;
  const count=parseInt(document.getElementById('name-count').value)||10;
  const names=NAMES[culture]; if(!names) return;
  const results=[];
  for (let i=0;i<count;i++) {
    const isFemale=Math.random()<0.5;
    const first=pick(isFemale?names.first_f:names.first_m);
    const last=pick(names.last);
    results.push(`${first} ${last}`);
  }
  document.getElementById('name-results').innerHTML=`<div class="name-list">${results.map(n=>`<span class="name-item">${n}</span>`).join('')}</div>`;
};

// ── Spells ────────────────────────────────────────────────────────────────────

function renderSpells() {
  setContent(`
    <div class="view-header">
      <div>
        <h1>Spell Reference</h1>
        <span class="subtitle">SRD 5.1 (CC BY 4.0) · ${SPELLS.length} spells · Filter by level, school, or class</span>
      </div>
    </div>
    <div class="spell-filters" style="display:flex;flex-wrap:wrap;gap:10px;margin-bottom:18px">
      <select id="sp-level" class="form-select" style="width:110px" onchange="filterSpells()">
        <option value="">All Levels</option>
        ${[0,1,2,3,4,5,6,7,8,9].map(l=>`<option value="${l}">${l===0?'Cantrip':'Level '+l}</option>`).join('')}
      </select>
      <select id="sp-school" class="form-select" style="width:140px" onchange="filterSpells()">
        <option value="">All Schools</option>
        ${['abjuration','conjuration','divination','enchantment','evocation','illusion','necromancy','transmutation'].map(s=>`<option value="${s}">${s.charAt(0).toUpperCase()+s.slice(1)}</option>`).join('')}
      </select>
      <select id="sp-class" class="form-select" style="width:130px" onchange="filterSpells()">
        <option value="">All Classes</option>
        ${['bard','cleric','druid','paladin','ranger','sorcerer','warlock','wizard'].map(c=>`<option value="${c}">${c.charAt(0).toUpperCase()+c.slice(1)}</option>`).join('')}
      </select>
      <input id="sp-search" class="form-input" placeholder="Search name or description…" style="flex:1;min-width:200px" oninput="filterSpells()">
    </div>
    <div id="spell-results"></div>
  `);
  filterSpells();
}

const SCHOOL_COLORS={abjuration:'#4a90d9',conjuration:'#e8a838',divination:'#9b59b6',enchantment:'#e74c6c',evocation:'#e67e22',illusion:'#1abc9c',necromancy:'#2ecc71',transmutation:'#f39c12'};

window.filterSpells=function(){
  const lvl=document.getElementById('sp-level').value;
  const school=document.getElementById('sp-school').value;
  const cls=document.getElementById('sp-class').value;
  const q=(document.getElementById('sp-search').value||'').toLowerCase();
  const filtered=SPELLS.filter(s=>
    (lvl===''||s.level===parseInt(lvl)) &&
    (!school||s.school===school) &&
    (!cls||s.classes.includes(cls)) &&
    (!q||s.name.toLowerCase().includes(q)||s.desc.toLowerCase().includes(q))
  );
  const grouped={};
  filtered.forEach(s=>{
    const k=s.level===0?'Cantrips':'Level '+s.level;
    if(!grouped[k])grouped[k]=[];
    grouped[k].push(s);
  });
  const levelOrder=['Cantrips','Level 1','Level 2','Level 3','Level 4','Level 5','Level 6','Level 7','Level 8','Level 9'];
  const el=document.getElementById('spell-results');
  if(!filtered.length){el.innerHTML='<p style="color:var(--muted)">No spells match the current filters.</p>';return;}
  el.innerHTML=levelOrder.filter(k=>grouped[k]).map(k=>`
    <h3 style="color:var(--accent);border-bottom:1px solid var(--border);padding-bottom:4px;margin:18px 0 10px">${k} <span style="color:var(--muted);font-size:13px;font-weight:400">(${grouped[k].length})</span></h3>
    <div class="spell-grid">
      ${grouped[k].map(s=>`
        <div class="spell-card" onclick="this.classList.toggle('expanded')">
          <div class="spell-card-head">
            <span class="spell-name">${s.name}</span>
            <span class="spell-school" style="color:${SCHOOL_COLORS[s.school]||'var(--muted)'};">${s.school}</span>
          </div>
          <div class="spell-meta">${s.castTime} · ${s.range} · ${s.duration}</div>
          <div class="spell-classes">${s.classes.map(c=>`<span class="spell-class-tag">${c}</span>`).join('')}</div>
          <div class="spell-desc">${s.desc}</div>
          <div class="spell-components" style="color:var(--muted);font-size:11px;margin-top:4px">${s.components}</div>
        </div>
      `).join('')}
    </div>
  `).join('');
};

// ── Rules Reference ───────────────────────────────────────────────────────────

function renderRules() {
  setContent(`
    <div class="view-header">
      <div>
        <h1>Rules Reference</h1>
        <span class="subtitle">SRD 5.1 quick-reference · Combat, Conditions, Resting, Spellcasting, Movement</span>
      </div>
    </div>
    <div class="filter-pills" id="rules-tabs">
      <button class="filter-pill active" onclick="showRulesTab('combat',this)">⚔ Combat</button>
      <button class="filter-pill" onclick="showRulesTab('conditions',this)">🩹 Conditions</button>
      <button class="filter-pill" onclick="showRulesTab('exhaustion',this)">💤 Exhaustion</button>
      <button class="filter-pill" onclick="showRulesTab('resting',this)">🛌 Resting</button>
      <button class="filter-pill" onclick="showRulesTab('spellcasting',this)">✨ Spellcasting</button>
      <button class="filter-pill" onclick="showRulesTab('movement',this)">🏃 Movement</button>
      <button class="filter-pill" onclick="showRulesTab('other',this)">◈ Other</button>
    </div>
    <div id="rules-content" style="margin-top:18px"></div>
  `);
  showRulesTab('combat', document.querySelector('#rules-tabs .filter-pill'));
}

window.showRulesTab=function(tab,btn){
  document.querySelectorAll('#rules-tabs .filter-pill').forEach(b=>b.classList.remove('active'));
  if(btn)btn.classList.add('active');
  const el=document.getElementById('rules-content');
  const R=RULES_REFERENCE;
  if(tab==='combat'){
    el.innerHTML=`<div class="rules-grid">${R.combat_actions.map(a=>`
      <div class="rule-card">
        <div class="rule-name">${a.name}</div>
        <p class="rule-desc">${a.desc}</p>
      </div>
    `).join('')}</div>`;
  } else if(tab==='conditions'){
    el.innerHTML=`<div class="rules-grid">${CONDITIONS.map(c=>`
      <div class="rule-card">
        <div class="rule-name">${c.name}</div>
        <p class="rule-desc">${c.desc}</p>
      </div>
    `).join('')}</div>`;
  } else if(tab==='exhaustion'){
    el.innerHTML=`
      <div class="info-card">
        <div class="ic-title">Exhaustion Levels</div>
        <p style="color:var(--muted);font-size:13px;margin-bottom:12px">Each long rest removes one level. 6 levels = death.</p>
        <table class="rules-table">
          <thead><tr><th>Level</th><th>Effect</th></tr></thead>
          <tbody>${R.exhaustion.map(e=>`<tr><td style="text-align:center;font-weight:bold;color:${e.level>=5?'#e74c3c':e.level>=3?'#e67e22':'var(--accent)'}">${e.level}</td><td>${e.effect}</td></tr>`).join('')}</tbody>
        </table>
      </div>`;
  } else if(tab==='resting'){
    const {short_rest,long_rest}=R.resting;
    el.innerHTML=`
      <div class="info-card" style="margin-bottom:12px">
        <div class="ic-title">⚡ Short Rest</div>
        <div class="ic-row"><span class="ic-key">Duration</span><span>${short_rest.duration}</span></div>
        <p style="color:var(--muted);font-size:13px;margin-top:8px">${short_rest.benefits}</p>
      </div>
      <div class="info-card">
        <div class="ic-title">🌙 Long Rest</div>
        <div class="ic-row"><span class="ic-key">Duration</span><span>${long_rest.duration}</span></div>
        <p style="color:var(--muted);font-size:13px;margin-top:8px">${long_rest.benefits}</p>
        <div class="ic-key" style="margin-top:8px">Interruption:</div>
        <p style="color:var(--muted);font-size:13px">${long_rest.interruption}</p>
      </div>`;
  } else if(tab==='spellcasting'){
    const sc=R.spellcasting_rules;
    el.innerHTML=`
      <div class="rules-grid">
        <div class="rule-card"><div class="rule-name">Components</div><p class="rule-desc">${sc.components}</p></div>
        <div class="rule-card"><div class="rule-name">Ranged Spell Attacks</div><p class="rule-desc">${sc.attack_spells}</p></div>
        <div class="rule-card"><div class="rule-name">Ritual Casting</div><p class="rule-desc">${sc.ritual_casting}</p></div>
        <div class="rule-card"><div class="rule-name">Counterspelling</div><p class="rule-desc">${sc.counterspelling}</p></div>
        <div class="rule-card"><div class="rule-name">Concentration</div><p class="rule-desc">${R.concentration.desc}<br><br><strong>Damage:</strong> ${R.concentration.damage_rules}<br><br><strong>Other:</strong> ${R.concentration.breaking}</p></div>
      </div>`;
  } else if(tab==='movement'){
    const mv=R.movement;
    el.innerHTML=`
      <div class="rules-grid">
        <div class="rule-card"><div class="rule-name">Difficult Terrain</div><p class="rule-desc">${mv.difficult_terrain}</p></div>
        <div class="rule-card"><div class="rule-name">Climbing & Swimming</div><p class="rule-desc">${mv.climbing_swimming}</p></div>
        <div class="rule-card"><div class="rule-name">Jumping</div><p class="rule-desc">${mv.jumping}</p></div>
        <div class="rule-card"><div class="rule-name">Crawling</div><p class="rule-desc">${mv.crawling}</p></div>
        <div class="rule-card"><div class="rule-name">Opportunity Attacks</div><p class="rule-desc">${mv.opportunity_attacks}</p></div>
      </div>`;
  } else if(tab==='other'){
    el.innerHTML=`
      <div class="rules-grid">
        <div class="rule-card"><div class="rule-name">Cover — Half</div><p class="rule-desc">${R.cover.half_cover}</p></div>
        <div class="rule-card"><div class="rule-name">Cover — Three-Quarters</div><p class="rule-desc">${R.cover_3q.desc}</p></div>
        <div class="rule-card"><div class="rule-name">Cover — Full</div><p class="rule-desc">${R.cover_full.desc}</p></div>
        <div class="rule-card"><div class="rule-name">Surprise</div><p class="rule-desc">${R.surprise.desc}<br><br><strong>Determining Surprise:</strong> ${R.surprise.determining}</p></div>
        <div class="rule-card"><div class="rule-name">Death Saving Throws</div><p class="rule-desc">${R.death_saves.desc}<br><br><strong>Damage at 0 HP:</strong> ${R.death_saves.damage}<br><br><strong>Stabilizing:</strong> ${R.death_saves.stabilizing}</p></div>
        <div class="rule-card"><div class="rule-name">Critical Hits</div><p class="rule-desc">${R.critical_hits.desc}<br><br><em>${R.critical_hits.optional_fumbles}</em></p></div>
        <div class="rule-card"><div class="rule-name">Flanking (Optional)</div><p class="rule-desc">${R.flanking.optional_rule}</p></div>
      </div>`;
  }
};

// ── Toast ─────────────────────────────────────────────────────────────────────

function showToast(msg) {
  let toast=document.getElementById('toast');
  if (!toast) { toast=document.createElement('div'); toast.id='toast'; document.body.appendChild(toast); }
  toast.textContent=msg; toast.className='toast show';
  setTimeout(()=>toast.className='toast',2200);
}

// ── Init ──────────────────────────────────────────────────────────────────────

function init() {
  loadState();
  buildSidebar();
  const camp=getActiveCampaign();
  if (!camp) navigate('welcome');
  else if (camp.activeCombat) navigate('combat');
  else navigate('dashboard');
}

document.addEventListener('DOMContentLoaded', init);
