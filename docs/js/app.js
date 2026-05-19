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

const MAP_TS = 32;
let _currentMap = null;

function _ht(x, y, i) {
  let h = (Math.imul(x * 374761393 + i * 134775813, 1) + Math.imul(y, 1013904223)) >>> 0;
  h = Math.imul(h ^ (h >>> 13), 1540483477) >>> 0;
  return ((h ^ (h >>> 15)) >>> 0) / 4294967295;
}

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
  _currentMap=generateMap(type,sub);
  drawMapCanvas(_currentMap);
  document.getElementById('btn-export').style.display='';
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

  const titleEl = document.createElement('div');
  titleEl.className = 'map-title';
  titleEl.textContent = mapData.title;
  wrap.appendChild(titleEl);

  const canvas = document.createElement('canvas');
  canvas.id = 'map-canvas';
  canvas.width = W * TS; canvas.height = H * TS;
  canvas.style.maxWidth = '100%';
  canvas.style.height = 'auto';
  canvas.style.display = 'block';
  canvas.style.borderRadius = '3px';
  wrap.appendChild(canvas);

  const ctx = canvas.getContext('2d');
  const g = mapData.grid;

  function tileAt(tx, ty) {
    if (tx < 0 || ty < 0 || tx >= W || ty >= H) return T.WALL;
    return (g[ty]?.[tx]) ?? T.WALL;
  }
  function blocksAO(tx, ty) {
    const t = tileAt(tx, ty);
    return t === T.WALL || t === T.TREES;
  }

  // Pass 1 — base tile fill
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) _mapBase(ctx, x, y, tileAt(x,y), TS);

  // Pass 2 — ambient occlusion (walls cast shadows onto adjacent floor tiles)
  const aoW = TS * 0.68;
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (blocksAO(x, y)) continue;
      const px = x*TS, py = y*TS;
      [[0,-1, px,    py,    px,    py+aoW],
       [0, 1, px,    py+TS, px,    py+TS-aoW],
       [-1,0, px,    py,    px+aoW,py],
       [1, 0, px+TS, py,    px+TS-aoW,py]
      ].forEach(([dx,dy,gx0,gy0,gx1,gy1]) => {
        if (!blocksAO(x+dx, y+dy)) return;
        const gr = ctx.createLinearGradient(gx0,gy0,gx1,gy1);
        gr.addColorStop(0,'rgba(0,0,0,0.52)');
        gr.addColorStop(1,'rgba(0,0,0,0)');
        ctx.fillStyle = gr; ctx.fillRect(px, py, TS, TS);
      });
    }
  }

  // Pass 3 — feature overlays (pillars, chests, stairs, traps)
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) _mapFeature(ctx, x, y, tileAt(x,y), TS);

  // Pass 4 — subtle 5-foot grid
  ctx.strokeStyle = 'rgba(0,0,0,0.06)'; ctx.lineWidth = 0.5;
  for (let xi = 0; xi <= W; xi++) { ctx.beginPath(); ctx.moveTo(xi*TS,0); ctx.lineTo(xi*TS,H*TS); ctx.stroke(); }
  for (let yi = 0; yi <= H; yi++) { ctx.beginPath(); ctx.moveTo(0,yi*TS); ctx.lineTo(W*TS,yi*TS); ctx.stroke(); }

  // Pass 5 — room labels
  if (mapData.labels && mapData.labels.length) {
    const fs = Math.max(8, Math.floor(TS * 0.36));
    ctx.font = `bold ${fs}px sans-serif`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    mapData.labels.forEach(l => {
      const tx = l.x*TS+TS/2, ty = l.y*TS+TS/2;
      const tw = ctx.measureText(l.text).width;
      ctx.fillStyle = 'rgba(10,8,5,0.78)';
      ctx.fillRect(tx-tw/2-3, ty-fs/2-2, tw+6, fs+4);
      ctx.fillStyle = '#f0c040';
      ctx.fillText(l.text, tx, ty);
    });
  }

  const legendEl = document.getElementById('map-legend');
  if (legendEl) legendEl.innerHTML = [
    ['#1e1812','Wall'],['#7a5c3a','Floor'],['#5a2e10','Door'],['#1e4a70','Water'],
    ['#380902','Lava'],['#142210','Trees'],['#8a7558','Road'],['#3a2e1e','Rubble'],
    ['#5c3212','Chest'],['#8c6c48','Stairs'],['#2a4a1a','Grass'],['#d0e0f0','Snow'],
  ].map(([c,n])=>`<span class="legend-item"><span class="legend-dot" style="background:${c}"></span>${n}</span>`).join('');
}

function _mapBase(ctx, x, y, t, TS) {
  const px = x*TS, py = y*TS;
  const r = (i) => _ht(x, y, i);

  if (t === T.WALL) {
    ctx.fillStyle = '#1e1812'; ctx.fillRect(px, py, TS, TS);
    for (let i = 0; i < 4; i++) {
      const fx = px+r(i*6)*(TS-2)+1, fy = py+r(i*6+1)*(TS-2)+1;
      const fw = 1+r(i*6+2)*4, fh = 1+r(i*6+3)*2;
      ctx.fillStyle = r(i*6+4) > 0.62
        ? `rgba(68,50,32,${0.35+r(i*6+5)*0.25})`
        : `rgba(10,6,3,${0.38+r(i*6+5)*0.28})`;
      ctx.fillRect(fx, fy, fw, fh);
    }
    return;
  }
  if (t === T.FLOOR || t === T.PILLAR || t === T.CHEST || t === T.STAIRS || t === T.TRAP) {
    ctx.fillStyle = ((x+y)&1) ? '#6c4e2e' : '#7c5e3e'; ctx.fillRect(px, py, TS, TS);
    ctx.strokeStyle = 'rgba(22,13,6,0.28)'; ctx.lineWidth = 0.5; ctx.strokeRect(px+.5, py+.5, TS-1, TS-1);
    if (r(90) > 0.87) { ctx.fillStyle = 'rgba(0,0,0,0.06)'; ctx.fillRect(px, py, TS, TS); }
    return;
  }
  if (t === T.DOOR) {
    ctx.fillStyle = ((x+y)&1) ? '#6c4e2e' : '#7c5e3e'; ctx.fillRect(px, py, TS, TS);
    const dw=TS*.55, dh=TS*.80, dx=px+(TS-dw)/2, dy=py+(TS-dh)/2;
    ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.fillRect(dx+2,dy+2,dw,dh);
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
    ctx.strokeStyle = 'rgba(120,200,255,0.2)'; ctx.lineWidth = 1;
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
    ctx.fillStyle = 'rgba(160,40,0,0.09)'; ctx.fillRect(px,py,TS,TS);
    return;
  }
  if (t === T.TREES) {
    ctx.fillStyle = '#142210'; ctx.fillRect(px,py,TS,TS);
    const numT = 1+(r(0)>.58?1:0);
    for (let ti = 0; ti < numT; ti++) {
      const tcx=px+5+r(ti*7+1)*(TS-10), tcy=py+5+r(ti*7+2)*(TS-10), trad=5+r(ti*7+3)*7;
      const green = Math.floor(72+r(ti*7+4)*45);
      ctx.fillStyle = `rgba(22,${green},15,0.93)`; ctx.beginPath(); ctx.arc(tcx,tcy,trad,0,Math.PI*2); ctx.fill();
      ctx.fillStyle = 'rgba(0,0,0,0.22)'; ctx.beginPath(); ctx.arc(tcx+.8,tcy+1,trad*.52,0,Math.PI*2); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.06)'; ctx.beginPath(); ctx.arc(tcx-trad*.28,tcy-trad*.28,trad*.38,0,Math.PI*2); ctx.fill();
    }
    return;
  }
  if (t === T.ROAD) {
    ctx.fillStyle = '#8a7558'; ctx.fillRect(px,py,TS,TS);
    ctx.strokeStyle = 'rgba(55,42,25,0.32)'; ctx.lineWidth = 0.7;
    for (let li = 1; li <= 2; li++) { ctx.beginPath(); ctx.moveTo(px,py+li*TS/3); ctx.lineTo(px+TS,py+li*TS/3); ctx.stroke(); }
    return;
  }
  if (t === T.RUBBLE) {
    ctx.fillStyle = '#3a2e1e'; ctx.fillRect(px,py,TS,TS);
    for (let ri = 0; ri < 6; ri++) {
      const rfx=px+r(ri*7)*TS, rfy=py+r(ri*7+1)*TS, rfw=2+r(ri*7+2)*5, rfh=1+r(ri*7+3)*3;
      ctx.save(); ctx.translate(rfx+rfw/2,rfy+rfh/2); ctx.rotate(r(ri*7+4)*Math.PI);
      ctx.fillStyle = ri%2===0 ? 'rgba(95,78,55,0.85)' : 'rgba(48,38,25,0.85)';
      ctx.fillRect(-rfw/2,-rfh/2,rfw,rfh); ctx.restore();
    }
    return;
  }
  if (t === T.GRASS) {
    const gv = r(40);
    ctx.fillStyle = `rgb(${Math.floor(26+gv*16)},${Math.floor(68+gv*36)},${Math.floor(16+gv*12)})`; ctx.fillRect(px,py,TS,TS);
    ctx.strokeStyle = `rgba(${Math.floor(38+gv*18)},${Math.floor(95+gv*28)},${Math.floor(22+gv*14)},0.42)`; ctx.lineWidth = 0.6;
    for (let gi = 0; gi < 5; gi++) {
      const gsx=px+r(gi*3+41)*TS, gsy=py+r(gi*3+42)*(TS*.62)+TS*.3;
      ctx.beginPath(); ctx.moveTo(gsx,gsy+3); ctx.quadraticCurveTo(gsx+(r(gi*3+43)-.5)*5,gsy,gsx+(r(gi*3+43)-.5)*2,gsy-5); ctx.stroke();
    }
    return;
  }
  if (t === T.DIRT) {
    const dv = r(50);
    ctx.fillStyle = `rgb(${Math.floor(126+dv*26)},${Math.floor(96+dv*20)},${Math.floor(56+dv*16)})`; ctx.fillRect(px,py,TS,TS);
    for (let pi = 0; pi < 3; pi++) {
      ctx.fillStyle = `rgba(75,58,38,${.35+r(pi*4+51)*.25})`;
      ctx.beginPath(); ctx.arc(px+r(pi*4+52)*TS, py+r(pi*4+53)*TS, .8+r(pi*4+54)*1.2,0,Math.PI*2); ctx.fill();
    }
    return;
  }
  if (t === T.SNOW) {
    const sv = r(60);
    ctx.fillStyle = `rgb(${Math.floor(205+sv*45)},${Math.floor(212+sv*38)},${Math.floor(222+sv*30)})`; ctx.fillRect(px,py,TS,TS);
    if (sv > 0.83) { ctx.fillStyle = 'rgba(255,255,255,0.65)'; ctx.beginPath(); ctx.arc(px+r(61)*TS,py+r(62)*TS,.8,0,Math.PI*2); ctx.fill(); }
    return;
  }
  ctx.fillStyle = '#1e1812'; ctx.fillRect(px,py,TS,TS);
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
    const s=TS*.52, tx=m-s/2, ty=n-s/2;
    ctx.strokeStyle = 'rgba(165,45,45,0.42)'; ctx.lineWidth = 0.8; ctx.strokeRect(tx,ty,s,s);
    ctx.beginPath();
    ctx.moveTo(tx+s*.22,ty+s*.22); ctx.lineTo(tx+s*.78,ty+s*.78);
    ctx.moveTo(tx+s*.78,ty+s*.22); ctx.lineTo(tx+s*.22,ty+s*.78);
    ctx.stroke();
    ctx.fillStyle = 'rgba(165,45,45,0.32)'; ctx.beginPath(); ctx.arc(m,n,2,0,Math.PI*2); ctx.fill();
    return;
  }
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
    card.dataset.mood = key;
    if (Music.getActive() === key) card.classList.add('active');
    card.innerHTML = `<span class="mood-bpm">${m.bpm} bpm</span><div class="mood-icon">${m.icon}</div><div class="mood-name">${m.name}</div><div class="mood-desc">${m.desc}</div>`;
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
