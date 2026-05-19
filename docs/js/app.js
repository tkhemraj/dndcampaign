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
};

let _currentView='';

function navigate(view, push=true) {
  _currentView=view;
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
    <div class="sidebar-top">
      <div class="sidebar-brand">⚔ DM Toolkit</div>
      ${Object.keys(STATE.campaigns).length ? `
        <div class="camp-selector-wrap">
          <select id="camp-select" class="camp-select">${campOptions}</select>
        </div>
      ` : ''}
    </div>
    <nav class="sidebar-nav">
      <a class="nav-item ${_currentView==='dashboard'?'active':''}" data-view="dashboard" onclick="navigate('dashboard')">🏠 Dashboard</a>
      <a class="nav-item ${_currentView==='maps'?'active':''}" data-view="maps" onclick="navigate('maps')">🗺 Maps</a>
      <a class="nav-item ${_currentView==='music'?'active':''}" data-view="music" onclick="navigate('music')">🎵 Music</a>
      <a class="nav-item ${_currentView==='npcs'?'active':''}" data-view="npcs" onclick="navigate('npcs')">🧙 NPCs</a>
      <a class="nav-item ${_currentView==='encounters'?'active':''}" data-view="encounters" onclick="navigate('encounters')">⚔ Encounters</a>
      ${camp&&camp.activeCombat ? `<a class="nav-item nav-combat ${_currentView==='combat'?'active':''}" data-view="combat" onclick="navigate('combat')">🩸 Live Combat</a>` : ''}
      <a class="nav-item ${_currentView==='quests'?'active':''}" data-view="quests" onclick="navigate('quests')">📜 Quests</a>
      <a class="nav-item ${_currentView==='lore'?'active':''}" data-view="lore" onclick="navigate('lore')">📖 Lore</a>
    </nav>
    <div class="sidebar-footer">
      <div id="music-mini"></div>
      <button class="btn-new-camp" onclick="showNewCampaignModal()">+ New Campaign</button>
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
  const recentNPCs=camp.npcs.slice(-3).reverse();
  const activeQuests=camp.quests.filter(q=>q.status==='Active');

  setContent(`
    <div class="view-header">
      <h1>${camp.name}</h1>
      <div class="header-actions">
        <button class="btn btn-secondary" onclick="editCampaignModal()">Edit Campaign</button>
      </div>
    </div>
    <div class="stats-row">
      <div class="stat-card"><div class="stat-num">${camp.partyLevel}</div><div class="stat-label">Party Level</div></div>
      <div class="stat-card"><div class="stat-num">${camp.partySize}</div><div class="stat-label">Players</div></div>
      <div class="stat-card"><div class="stat-num">${camp.npcs.length}</div><div class="stat-label">NPCs</div></div>
      <div class="stat-card"><div class="stat-num">${activeQuests.length}</div><div class="stat-label">Active Quests</div></div>
      <div class="stat-card"><div class="stat-num">${camp.combatHistory.length}</div><div class="stat-label">Combats</div></div>
    </div>

    <div class="dash-grid">
      <div class="dash-panel">
        <div class="panel-header"><span>🧙 Recent NPCs</span><button class="btn-link" onclick="navigate('npcs')">See all →</button></div>
        ${recentNPCs.length ? recentNPCs.map(n=>`
          <div class="list-row" onclick="showNPCDetail('${n.id}')">
            <span class="list-name">${n.name}</span>
            <span class="list-meta">${n.race} ${n.class} ${n.level}</span>
          </div>
        `).join('') : '<p class="empty-msg">No NPCs yet — generate some</p>'}
        <button class="btn btn-secondary btn-sm" style="margin-top:10px" onclick="navigate('npcs')">+ Generate NPC</button>
      </div>

      <div class="dash-panel">
        <div class="panel-header"><span>📜 Active Quests</span><button class="btn-link" onclick="navigate('quests')">See all →</button></div>
        ${activeQuests.length ? activeQuests.slice(0,4).map(q=>`
          <div class="list-row">
            <span class="list-name" style="font-size:13px">${q.title}</span>
            <span class="list-meta">${q.faction}</span>
          </div>
        `).join('') : '<p class="empty-msg">No active quests — generate some</p>'}
        <button class="btn btn-secondary btn-sm" style="margin-top:10px" onclick="navigate('quests')">+ Generate Quest</button>
      </div>

      <div class="dash-panel">
        <div class="panel-header"><span>⚔ Quick Start</span></div>
        <button class="btn btn-secondary dash-btn" onclick="navigate('encounters')">Build Encounter</button>
        <button class="btn btn-secondary dash-btn" onclick="navigate('maps')">Generate Map</button>
        <button class="btn btn-secondary dash-btn" onclick="navigate('music')">Play Music</button>
        <button class="btn btn-secondary dash-btn" onclick="navigate('lore')">Wildemount Lore</button>
        ${camp.activeCombat ? `<button class="btn btn-primary dash-btn" onclick="navigate('combat')">🩸 Resume Combat (Round ${camp.activeCombat.round})</button>` : ''}
      </div>

      <div class="dash-panel">
        <div class="panel-header"><span>📝 Notes</span></div>
        <textarea id="camp-notes" class="form-textarea" placeholder="Session notes, plot threads, reminders...">${camp.notes}</textarea>
        <button class="btn btn-secondary btn-sm" style="margin-top:8px" onclick="saveNotes()">Save Notes</button>
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
let _mapHUD = { round:1, counters:[], timers:[] };
let _timerInterval = null;

function renderMaps() {
  const typeOpts=MAP_TYPES.map(t=>`<option value="${t.value}">${t.label}</option>`).join('');
  const firstType=MAP_TYPES[0];
  const subOpts=firstType.subs.map(s=>`<option value="${s.value}">${s.label}</option>`).join('');

  setContent(`
    <div class="view-header"><h1>🗺 Map Generator</h1></div>
    <div class="map-controls">
      <select id="map-type" class="form-select" onchange="updateMapSubs()">${typeOpts}</select>
      <select id="map-sub" class="form-select">${subOpts}</select>
      <button class="btn btn-primary" onclick="doGenerateMap()">Generate Map</button>
      <button class="btn btn-secondary" onclick="exportMapPNG()" id="btn-export" style="display:none">Export PNG</button>
      ${getActiveCampaign()?`<button class="btn btn-secondary" onclick="saveMapToCampaign()" id="btn-save-map" style="display:none">Save to Campaign</button>`:''}
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
  _pendingAvatar=null; _fogCtx=null;
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

  const titleEl = document.createElement('div');
  titleEl.className = 'map-title';
  titleEl.textContent = mapData.title;
  wrap.appendChild(titleEl);

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
    const px=e.clientX-rc.left, py=e.clientY-rc.top;
    return {px,py,tx:Math.floor(px/TS),ty:Math.floor(py/TS)};
  }
  ovCanvas.addEventListener('mousedown',e=>{
    const {px,py,tx,ty}=cvXY(e);
    if (_tokenMode==='reveal'||_tokenMode==='hide'){
      _fogPaint=true;
      paintFog(mapData,tx,ty,_tokenMode==='reveal',1);
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
      paintFog(mapData,tx,ty,_tokenMode==='reveal',1);
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
    const {tx,ty}=cvXY(e);
    const idx=mapData.tokens.findIndex(t=>t.x===tx&&t.y===ty);
    if (idx>=0){mapData.tokens.splice(idx,1);_drawTokens(ovCtx,mapData.tokens,W,H,TS,null);}
  });
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
      <h1>🎵 Music</h1>
      <p class="view-sub">Real orchestral instruments · Hall reverb · 8 cinematic moods — plays live in browser</p>
    </div>
    <div class="music-now" id="music-now">
      <span style="color:var(--muted)">Click a mood to start — instruments load on first use, then cached</span>
    </div>
    <div class="mood-grid" id="mood-grid"></div>
    <div class="music-vol-row">
      <label>Volume</label>
      <input type="range" id="vol-slider" min="0" max="1" step="0.05" value="0.72">
      <span id="vol-label" class="vol-label">72%</span>
      <button class="btn btn-secondary btn-sm" onclick="Music.stop()">⏹ Stop</button>
    </div>
  `);

  const grid = document.getElementById('mood-grid');
  Object.entries(Music.MOODS).forEach(([key, m]) => {
    const card = document.createElement('div');
    card.className = 'mood-card';
    if (m.theme) card.classList.add('theme-' + m.theme);
    card.dataset.mood = key;
    if (Music.getActive() === key) card.classList.add('active');
    card.innerHTML = `<span class="mood-bpm">${m.bpm} bpm</span><div class="mood-icon">${m.icon}</div><div class="mood-name">${m.name}</div><div class="mood-desc">${m.desc}</div>${m.inst?`<div class="mood-inst">${m.inst}</div>`:''}`;
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
  const npcs=camp?.npcs||[];

  setContent(`
    <div class="view-header"><h1>🧙 NPC Generator</h1></div>
    <div class="gen-controls">
      <div class="gen-field"><label class="form-label">Faction</label><select id="npc-faction" class="form-select">${factionOpts}</select></div>
      <div class="gen-field"><label class="form-label">Region</label><select id="npc-region" class="form-select">${regionOpts}</select></div>
      <button class="btn btn-primary" onclick="doGenerateNPC()">Generate NPC</button>
    </div>
    <div id="npc-result"></div>
    <hr class="section-hr">
    <div class="panel-header"><span>Saved NPCs (${npcs.length})</span></div>
    <div id="npc-list">
      ${npcs.length ? npcs.slice().reverse().map(n=>npcListRow(n)).join('') : '<p class="empty-msg">No saved NPCs yet</p>'}
    </div>
  `);
}

function npcListRow(n) {
  return `<div class="list-row" onclick="showNPCDetail('${n.id}')">
    <span class="list-name">${n.name}</span>
    <span class="list-meta">${n.race} ${n.class} ${n.level} · ${n.faction}</span>
    ${getActiveCampaign()?`<button class="btn-icon btn-danger-icon" onclick="event.stopPropagation();deleteNPC('${n.id}')">✕</button>`:''}
  </div>`;
}

window.doGenerateNPC=function(){
  const fval=document.getElementById('npc-faction').value;
  const rval=document.getElementById('npc-region').value;
  const opts={};
  if (fval!=='Any') opts.faction=fval;
  if (rval!=='Any') opts.region=rval;
  const npc=generateNPC(opts);
  document.getElementById('npc-result').innerHTML=npcCard(npc,true);
};

window.showNPCDetail=function(id){
  const camp=getActiveCampaign(); if(!camp) return;
  const npc=camp.npcs.find(n=>n.id===id); if(!npc) return;
  showModal(npc.name, npcCardBody(npc),[{label:'Close',action:'closeModal()'}]);
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

function npcCard(n, showSave=false) {
  return `<div class="stat-block">${npcCardBody(n)}${showSave&&getActiveCampaign()?`<button class="btn btn-primary btn-sm" onclick="saveNPC('${encodeURIComponent(JSON.stringify(n))}')">Save NPC</button>`:''}
    <button class="btn btn-secondary btn-sm" onclick="doGenerateNPC()">Re-generate</button></div>`;
}

function npcCardBody(n) {
  const s=n.stats;
  return `
    <div class="sb-name">${n.name}</div>
    <div class="sb-sub">${n.race} ${n.class} ${n.level} · ${n.alignment}</div>
    <div class="sb-divider"></div>
    <div class="sb-row"><span class="sb-key">Region</span><span>${n.region}</span></div>
    <div class="sb-row"><span class="sb-key">Faction</span><span>${n.faction}</span></div>
    <div class="sb-row"><span class="sb-key">HP</span><span>${n.maxHp}</span><span class="sb-key" style="margin-left:16px">AC</span><span>${n.ac}</span><span class="sb-key" style="margin-left:16px">Prof</span><span>+${n.profBonus}</span></div>
    <div class="sb-divider"></div>
    <div class="sb-stats">
      ${['STR','DEX','CON','INT','WIS','CHA'].map(k=>`<div class="sb-stat"><div class="sb-sval">${s[k]}</div><div class="sb-smod">${signedMod(s[k])}</div><div class="sb-skey">${k}</div></div>`).join('')}
    </div>
    <div class="sb-divider"></div>
    <div class="sb-row"><span class="sb-key">Personality</span><span style="font-style:italic">${n.personality}</span></div>
    <div class="sb-row" style="margin-top:6px"><span class="sb-key">Background</span><span style="font-style:italic">${n.background}</span></div>
  `;
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
    <div class="view-header"><h1>📜 Quest Generator</h1></div>
    <div class="gen-controls">
      <div class="gen-field"><label class="form-label">Faction</label><select id="q-faction" class="form-select">${factionOpts}</select></div>
      <div class="gen-field"><label class="form-label">Region</label><select id="q-region" class="form-select">${regionOpts}</select></div>
      <button class="btn btn-primary" onclick="doGenerateQuest()">Generate Quest</button>
    </div>
    <div id="quest-result"></div>
    <hr class="section-hr">
    <div class="panel-header"><span>Active Quests (${active.length})</span></div>
    <div id="quest-list-active">${active.length ? active.map(q=>questRow(q)).join('') : '<p class="empty-msg">No active quests</p>'}</div>
    ${complete.length?`<hr class="section-hr"><div class="panel-header" style="opacity:.6"><span>Completed (${complete.length})</span></div><div>${complete.map(q=>questRow(q)).join('')}</div>`:''}
  `);
}

function questRow(q) {
  const diffColor={Easy:'ok',Medium:'warn',Hard:'warn',Deadly:'crit'}[q.difficulty]||'muted';
  return `<div class="list-row quest-row">
    <div>
      <div class="list-name" style="font-size:13px">${q.title}</div>
      <div class="list-meta">${q.faction} · ${q.location} · <span class="tag-${diffColor}">${q.difficulty}</span> · ${q.urgency}</div>
      <div class="list-meta" style="color:var(--accent);margin-top:2px">⚡ ${q.reward}</div>
    </div>
    <div style="display:flex;gap:6px;flex-shrink:0">
      ${q.status==='Active'?`<button class="btn btn-secondary btn-sm" onclick="completeQuest('${q.id}')">Complete</button>`:'<span class="tag-ok" style="align-self:center">Done</span>'}
      ${getActiveCampaign()?`<button class="btn-icon btn-danger-icon" onclick="deleteQuest('${q.id}')">✕</button>`:''}
    </div>
  </div>`;
}

window.doGenerateQuest=function(){
  const camp=getActiveCampaign();
  const fval=document.getElementById('q-faction').value;
  const rval=document.getElementById('q-region').value;
  const opts={level:camp?.partyLevel||5};
  if (fval!=='Any') opts.faction=fval;
  if (rval!=='Any') opts.region=rval;
  const q=generateQuest(opts);
  document.getElementById('quest-result').innerHTML=questDetailCard(q,true);
};

function questDetailCard(q, showSave=false) {
  const diffColor={Easy:'ok',Medium:'warn',Hard:'warn',Deadly:'crit'}[q.difficulty]||'muted';
  return `<div class="info-card">
    <div class="ic-title">${q.title}</div>
    <div class="ic-row"><span class="ic-key">Faction</span><span>${q.faction}</span></div>
    <div class="ic-row"><span class="ic-key">Location</span><span>${q.location}, ${q.region}</span></div>
    <div class="ic-row"><span class="ic-key">Difficulty</span><span class="tag-${diffColor}">${q.difficulty}</span></div>
    <div class="ic-row"><span class="ic-key">Urgency</span><span>${q.urgency}</span></div>
    <div class="ic-row"><span class="ic-key">Reward</span><span style="color:var(--accent)">${q.reward}</span></div>
    <div class="ic-row" style="margin-top:8px"><em style="color:var(--muted);font-size:13px">${q.flavour}</em></div>
    <div style="margin-top:12px;display:flex;gap:8px">
      ${showSave&&getActiveCampaign()?`<button class="btn btn-primary btn-sm" onclick="saveQuest('${encodeURIComponent(JSON.stringify(q))}')">Save Quest</button>`:''}
      <button class="btn btn-secondary btn-sm" onclick="doGenerateQuest()">Re-generate</button>
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

  setContent(`
    <div class="view-header"><h1>⚔ Encounter Builder</h1></div>
    <div class="gen-controls">
      <div class="gen-field"><label class="form-label">Party Level</label><input id="enc-level" class="form-input" type="number" min="1" max="20" value="${level}" style="width:80px"></div>
      <div class="gen-field"><label class="form-label">Party Size</label><input id="enc-size" class="form-input" type="number" min="1" max="8" value="${size}" style="width:80px"></div>
      <div class="gen-field"><label class="form-label">Difficulty</label>
        <select id="enc-diff" class="form-select">
          <option value="easy">Easy</option>
          <option value="medium" selected>Medium</option>
          <option value="hard">Hard</option>
          <option value="deadly">Deadly</option>
        </select>
      </div>
      <button class="btn btn-primary" onclick="doGenerateEncounter()">Generate Encounter</button>
    </div>
    <div id="enc-result"></div>
    ${camp?.activeCombat?`<hr class="section-hr"><div class="panel-header"><span>🩸 Active Combat</span></div><div class="info-card"><p>Round ${camp.activeCombat.round} — ${camp.activeCombat.combatants.length} combatants</p><button class="btn btn-primary" onclick="navigate('combat')">Resume Combat →</button></div>`:''}
  `);
}

window.doGenerateEncounter=function(){
  const level=parseInt(document.getElementById('enc-level').value)||5;
  const size=parseInt(document.getElementById('enc-size').value)||4;
  const diff=document.getElementById('enc-diff').value;
  const enc=generateEncounter(level,size,diff);
  document.getElementById('enc-result').innerHTML=encounterCard(enc);
};

function encounterCard(enc) {
  const diffColor={easy:'ok',medium:'warn',hard:'warn',deadly:'crit'}[enc.difficulty]||'muted';
  const rows=enc.monsters.map(m=>`
    <div class="list-row">
      <div>
        <span class="list-name">${m.displayName||m.name}</span>
        <span class="list-meta">CR ${m.cr} · HP ${m.hp} · AC ${m.ac} · ATK ${m.atk} · ${m.dmg}</span>
      </div>
      <span class="list-meta">${m.xp} XP</span>
    </div>
  `).join('');
  return `<div class="info-card">
    <div class="ic-row">
      <span class="tag-${diffColor}" style="font-size:13px;font-weight:700">${enc.difficulty.toUpperCase()}</span>
      <span style="color:var(--muted);font-size:13px">Budget ${enc.budget} XP · Using ${enc.rawXP} XP · Adjusted ${enc.totalXP} XP</span>
    </div>
    ${rows}
    <div style="margin-top:12px;display:flex;gap:8px">
      <button class="btn btn-primary" onclick="launchCombat('${encodeURIComponent(JSON.stringify(enc))}')">⚔ Start Combat</button>
      <button class="btn btn-secondary btn-sm" onclick="doGenerateEncounter()">Re-generate</button>
    </div>
  </div>`;
}

window.launchCombat=function(data){
  const camp=getActiveCampaign(); if(!camp) return;
  const enc=JSON.parse(decodeURIComponent(data));
  // Build combatants — roll initiative for monsters
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
  }));
  // Sort by initiative desc
  combatants.sort((a,b)=>b.initiative-a.initiative);
  camp.activeCombat={
    id:uuid(),
    name:`${enc.difficulty.charAt(0).toUpperCase()+enc.difficulty.slice(1)} Encounter`,
    round:1, activeIdx:0,
    combatants,
    partyLevel:enc.partyLevel,
    partySize:enc.partySize,
    xp:enc.totalXP,
    started:Date.now(),
  };
  saveState(); buildSidebar(); navigate('combat');
};

// ── Combat Tracker ────────────────────────────────────────────────────────────

function renderCombat() {
  const camp=getActiveCampaign();
  if (!camp||!camp.activeCombat) {
    setContent(`<div class="view-header"><h1>⚔ Combat</h1></div><p class="empty-msg">No active combat. Build an encounter to start one.</p><button class="btn btn-primary" onclick="navigate('encounters')">Build Encounter</button>`);
    return;
  }
  const combat=camp.activeCombat;
  const alive=combat.combatants.filter(c=>!c.defeated).length;
  const active=combat.combatants[combat.activeIdx];

  setContent(`
    <div class="combat-header">
      <div>
        <h1 style="margin:0">${combat.name}</h1>
        <div class="combat-meta">Round ${combat.round} · ${alive} combatants · ${combat.xp||0} XP</div>
      </div>
      <div class="combat-actions">
        <button class="btn btn-primary" onclick="combatNextTurn()">▶ Next Turn</button>
        <button class="btn btn-secondary" onclick="showAddCombatantModal()">+ Add</button>
        <button class="btn btn-secondary" onclick="rollAllInitiative()">🎲 Roll All Initiative</button>
        <button class="btn btn-danger" onclick="endCombat()">End Combat</button>
      </div>
    </div>
    ${active?`<div class="active-banner">⚡ <strong>${active.name}'s turn</strong></div>`:''}
    <div id="combatant-list">
      ${combat.combatants.map((c,i)=>combatantRow(c,i,i===combat.activeIdx)).join('')}
    </div>
  `);
}

function combatantRow(c, idx, isActive) {
  const hpPct=Math.max(0,Math.min(100,Math.round(c.hp/c.maxHp*100)));
  const hpClass=hpPct>60?'hp-ok':hpPct>30?'hp-low':'hp-crit';
  const condTags=c.conditions.map(cond=>`<span class="cond-tag" onclick="removeCombatantCondition('${c.id}','${cond}')">${cond} ✕</span>`).join('');

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
        ${c.atk?`<span class="cr-meta">ATK ${c.atk} · ${c.dmg}</span>`:''}
      </div>
      ${condTags||!c.defeated?`<div class="cr-conds">${condTags}${!c.defeated?`<button class="cond-add" onclick="showConditionPicker('${c.id}')">+ Condition</button>`:''}${c.notes?`<span class="cr-note">${c.notes}</span>`:''}
      </div>`:''}
    </div>
    <div class="cr-btns">
      ${!c.defeated?`
        <button class="cr-btn cr-btn-heal" onclick="combatEditHP('${c.id}',true)" title="Heal">+HP</button>
        <button class="cr-btn cr-btn-dmg"  onclick="combatEditHP('${c.id}',false)" title="Damage">-HP</button>
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
  const c=camp.activeCombat.combatants.find(x=>x.id===id); if(!c) return;
  if (isHeal) c.hp=Math.min(c.maxHp, c.hp+amt);
  else {
    c.hp=Math.max(0, c.hp-amt);
    if (c.hp===0) c.defeated=true;
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

window.showConditionPicker=function(id){
  showModal('Add Condition',`
    <div class="cond-picker">
      ${CONDITIONS.map(cond=>`<button class="cond-pick-btn" onclick="doAddCondition('${id}','${cond}')">${cond}</button>`).join('')}
    </div>
  `,[{label:'Cancel',action:'closeModal()'}]);
};

window.doAddCondition=function(id,cond){
  const camp=getActiveCampaign(); if(!camp||!camp.activeCombat) return;
  const c=camp.activeCombat.combatants.find(x=>x.id===id); if(!c) return;
  if (!c.conditions.includes(cond)) c.conditions.push(cond);
  saveState(); closeModal(); renderCombat();
};

window.removeCombatantCondition=function(id,cond){
  const camp=getActiveCampaign(); if(!camp||!camp.activeCombat) return;
  const c=camp.activeCombat.combatants.find(x=>x.id===id); if(!c) return;
  c.conditions=c.conditions.filter(x=>x!==cond);
  saveState(); renderCombat();
};

window.toggleDefeated=function(id){
  const camp=getActiveCampaign(); if(!camp||!camp.activeCombat) return;
  const c=camp.activeCombat.combatants.find(x=>x.id===id); if(!c) return;
  c.defeated=!c.defeated; if(c.defeated) c.hp=0; else c.hp=Math.max(1,c.maxHp);
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
  const name=document.getElementById('ac-name').value.trim()||'Unknown';
  const hp=parseInt(document.getElementById('ac-hp').value)||10;
  const ac=parseInt(document.getElementById('ac-ac').value)||12;
  const init=parseInt(document.getElementById('ac-init').value)||10;
  const type=document.getElementById('ac-type').value;
  camp.activeCombat.combatants.push({id:uuid(),name,type,emoji:type==='player'?'🧙':'👹',initiative:init,initBonus:0,hp,maxHp:hp,ac,conditions:[],notes:'',defeated:false});
  camp.activeCombat.combatants.sort((a,b)=>b.initiative-a.initiative);
  saveState(); closeModal(); renderCombat();
};

window.endCombat=function(){
  if (!confirm('End combat and save to history?')) return;
  const camp=getActiveCampaign(); if(!camp||!camp.activeCombat) return;
  camp.combatHistory.push({...camp.activeCombat, ended:Date.now()});
  camp.activeCombat=null;
  saveState(); buildSidebar(); navigate('dashboard');
};

// ── Lore ──────────────────────────────────────────────────────────────────────

function renderLore() {
  setContent(`
    <div class="view-header"><h1>📖 Wildemount Lore Reference</h1></div>
    <div class="lore-tabs" id="lore-tabs">
      <button class="lore-tab active" onclick="showLoreTab('factions',this)">Factions</button>
      <button class="lore-tab" onclick="showLoreTab('regions',this)">Regions</button>
      <button class="lore-tab" onclick="showLoreTab('deities',this)">Deities</button>
      <button class="lore-tab" onclick="showLoreTab('plots',this)">Plot Seeds</button>
      <button class="lore-tab" onclick="showLoreTab('names',this)">Name Generator</button>
    </div>
    <div id="lore-content"></div>
  `);
  showLoreTab('factions', document.querySelector('.lore-tab'));
}

window.showLoreTab=function(tab, btn){
  document.querySelectorAll('.lore-tab').forEach(b=>b.classList.remove('active'));
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
