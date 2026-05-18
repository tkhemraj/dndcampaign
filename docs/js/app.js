'use strict';
// App state, router, all view renderers, music engine, combat tracker

// ── Music Engine ──────────────────────────────────────────────────────────────

const MOODS = {
  tavern:    {icon:'🍺',name:'Tavern',    bpm:126,desc:'Warm folk — Ruby Sunrise vibes',       when:'A warm interior, between adventures',
    melody:['C4','E4','G4','A4','G4','E4','C5','B4','A4','G4','F4','E4','D4','C4','E4','G4'],
    bass:['C2','G2','F2','G2'],chord:[['C3','E3','G3'],['F3','A3','C4'],['G3','B3','D4'],['C3','E3','G3']],perc:true,purple:false},
  dungeon:   {icon:'💀',name:'Dungeon',   bpm:52, desc:'Dark, sparse, unsettling',             when:'Slow exploration, the dark between rooms',
    melody:['D3','F3','Ab3','D3','C3','Eb3','F3','D3',null,null,'D3','Bb2',null,'F2',null,null],
    bass:['D1','D1','A1','D1'],chord:[['D2','F2','Ab2'],['Bb1','D2','F2'],['A1','C2','Eb2'],['D2','F2','Ab2']],perc:false,purple:false},
  combat:    {icon:'⚔',name:'Combat',   bpm:152,desc:'Fast, driving, relentless',             when:'Standard fights — fast and kinetic',
    melody:['E4','G4','A4','E4','D4','E4','B3','E4','G4','A4','C5','B4','G4','E4','F#4','E4'],
    bass:['E2','A1','B1','E2'],chord:[['E2','G2','B2'],['A1','C2','E2'],['B1','D2','F#2'],['E2','G2','B2']],perc:true,purple:false},
  boss:      {icon:'🐉',name:'Boss Fight',bpm:168,desc:'Epic, crushing, terrifying',           when:'The thing at the end of the hall',
    melody:['B3','C4','B3','G3','B3','F3','B3','E3','B3','C4','D4','C4','B3',null,'G3','B3'],
    bass:['B1','E1','F1','B1'],chord:[['B1','D2','F2'],['C2','E2','G2'],['E1','G1','B1'],['B1','D2','F2']],perc:true,purple:false},
  wilderness:{icon:'🌲',name:'Wilderness',bpm:84, desc:'Flowing, open, vast',                  when:'Travel, Greying Wildlands, open sky',
    melody:['G4','A4','B4','D5','G4','A4','G4','E4','D4','G4','A4','B4','D5','B4','A4','G4'],
    bass:['G2','D2','C2','G2'],chord:[['G2','B2','D3'],['D2','F#2','A2'],['C2','E2','G2'],['G2','B2','D3']],perc:false,purple:false},
  kryn:      {icon:'🌑',name:'Xhorhas / Kryn',bpm:68,desc:'Ethereal, alien, Dunamantic',       when:'Rosohna, Dunamancy, the Dynasty',
    melody:['F#3','A3','B3','F#3','E3','F#3','C#4','B3','A3','F#3',null,'E3','F#3','G#3','A3','F#3'],
    bass:['F#1','B1','C#2','F#1'],chord:[['F#2','A2','C#3'],['B1','D2','F#2'],['C#2','E2','G#2'],['F#2','A2','C#3']],perc:false,purple:true},
  calamity:  {icon:'💥',name:'The Calamity',bpm:60,desc:'Apocalyptic, ancient horror',         when:'Eiselcross, Aeor ruins, ancient dread',
    melody:['C3',null,'Db3',null,'D3','Eb3',null,'F3',null,'Gb3','G3','Ab3',null,'A3','Bb3',null],
    bass:['C1','F#1','C1','Bb0'],chord:[['C2','Eb2','Gb2'],['F#1','A1','C2'],['Bb1','Db2','E2'],['C2','Eb2','Gb2']],perc:false,purple:true},
  triumph:   {icon:'🏆',name:'Victory',    bpm:112,desc:'Bright fanfare — they survived. Barely.',when:'Session end, major victory',
    melody:['C4','E4','G4','C5','B4','G4','A4','F4','G4','E4','C4','E4','G4','B4','C5',null],
    bass:['C2','G2','F2','C2'],chord:[['C3','E3','G3'],['G2','B2','D3'],['F2','A2','C3'],['C3','E3','G3']],perc:true,purple:false},
};

let _mParts=[], _mSynths=[], _mActive=null, _mVol=-14;

function musicStop() {
  _mParts.forEach(p=>{try{p.stop();p.dispose();}catch(_){}});
  _mSynths.forEach(s=>{try{s.dispose();}catch(_){}});
  _mParts=[]; _mSynths=[];
  Tone.getTransport().stop();
  Tone.getTransport().cancel();
  _mActive=null;
  updateMusicMini();
}

async function musicPlay(key) {
  await Tone.start();
  musicStop();
  const mood=MOODS[key]; if(!mood) return;
  _mActive=key;
  Tone.getTransport().bpm.value=mood.bpm;

  const vol=new Tone.Volume(_mVol).toDestination();
  const rev=new Tone.Reverb({decay:mood.bpm<80?4:1.8,wet:0.25}).connect(vol);
  _mSynths.push(rev);

  // Melody
  const mel=new Tone.Synth({oscillator:{type:mood.bpm<80?'triangle':'sawtooth'},envelope:{attack:0.04,decay:0.18,sustain:0.5,release:0.7},volume:-8}).connect(rev);
  _mSynths.push(mel);
  const melPart=new Tone.Sequence((t,n)=>{if(n)mel.triggerAttackRelease(n,'8n',t);},mood.melody,'8n');
  melPart.loop=true; _mParts.push(melPart);

  // Bass
  const bas=new Tone.Synth({oscillator:{type:'triangle'},envelope:{attack:0.06,decay:0.3,sustain:0.4,release:0.8},volume:-4}).connect(vol);
  _mSynths.push(bas);
  const basPart=new Tone.Sequence((t,n)=>{if(n)bas.triggerAttackRelease(n,'4n',t);},mood.bass,'4n');
  basPart.loop=true; _mParts.push(basPart);

  // Pad
  const pad=new Tone.PolySynth(Tone.Synth,{oscillator:{type:'sine'},envelope:{attack:0.4,decay:0.6,sustain:0.7,release:1.2},volume:-14}).connect(rev);
  _mSynths.push(pad);
  const padPart=new Tone.Sequence((t,ch)=>{if(ch&&ch.length)pad.triggerAttackRelease(ch,'2n',t);},mood.chord,'2n');
  padPart.loop=true; _mParts.push(padPart);

  // Percussion
  if (mood.perc) {
    const kick=new Tone.MembraneSynth({volume:-10}).connect(vol);
    const snare=new Tone.NoiseSynth({noise:{type:'white'},envelope:{attack:0.005,decay:0.1,sustain:0,release:0.1},volume:-16}).connect(vol);
    _mSynths.push(kick,snare);
    const fast=key==='combat'||key==='boss';
    const kp=new Tone.Sequence((t,h)=>{if(h)kick.triggerAttackRelease('C1','8n',t);},fast?['8n',null,'8n',null,'8n',null,'8n',null]:['4n',null,null,null,'4n',null,null,null],'8n');
    kp.loop=true; _mParts.push(kp);
    const sp=new Tone.Sequence((t,h)=>{if(h)snare.triggerAttackRelease('8n',t);},[null,null,'4n',null,null,null,'4n',null],'8n');
    sp.loop=true; _mParts.push(sp);
  }

  _mParts.forEach(p=>p.start(0));
  Tone.getTransport().start();
  updateMusicMini();
}

function updateMusicMini() {
  const mini=document.getElementById('music-mini');
  if (!mini) return;
  const m=_mActive?MOODS[_mActive]:null;
  mini.innerHTML=m
    ? `<span class="mini-dot playing"></span><span class="mini-label">${m.icon} ${m.name}</span><button onclick="musicStop()" class="mini-stop">⏹</button>`
    : `<span class="mini-dot"></span><span class="mini-label" style="color:var(--muted)">No music</span>`;
}

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

  updateMusicMini();
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

const TILE_COLORS=['#2a1f14','#5a3e28','#8b5a1e','#1a3a5a','#6a1a0a','#1a3a14','#6a5030','#3a3028','#4a3018','#c8973c','#4a5a6a','#8a1010','#2a4a1a','#6a5030','#8a9aaa'];
const FEATURE_MARKS={9:'★',10:'⊙',11:'✕',2:'▪',8:'◆'};
let _currentMap=null;

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
  const wrap=document.getElementById('map-wrap');
  wrap.innerHTML='';
  const TS=14;
  const canvas=document.createElement('canvas');
  canvas.id='map-canvas';
  const W=mapData.W, H=mapData.H;
  canvas.width=W*TS; canvas.height=H*TS;
  canvas.style.maxWidth='100%';
  canvas.style.imageRendering='pixelated';
  wrap.appendChild(canvas);

  const ctx=canvas.getContext('2d');
  // Draw tiles
  for (let y=0;y<H;y++) for (let x=0;x<W;x++) {
    const t=mapData.grid[y]?.[x]??0;
    ctx.fillStyle=TILE_COLORS[t]||TILE_COLORS[0];
    ctx.fillRect(x*TS,y*TS,TS,TS);
  }
  // Grid lines (faint)
  ctx.strokeStyle='rgba(0,0,0,0.15)';
  ctx.lineWidth=0.5;
  for (let x=0;x<=W;x++){ctx.beginPath();ctx.moveTo(x*TS,0);ctx.lineTo(x*TS,H*TS);ctx.stroke();}
  for (let y=0;y<=H;y++){ctx.beginPath();ctx.moveTo(0,y*TS);ctx.lineTo(W*TS,y*TS);ctx.stroke();}
  // Feature marks
  ctx.font=`${TS-2}px monospace`;
  ctx.textAlign='center'; ctx.textBaseline='middle';
  for (let y=0;y<H;y++) for (let x=0;x<W;x++) {
    const t=mapData.grid[y]?.[x]??0;
    if (FEATURE_MARKS[t]) {
      ctx.fillStyle=t===9?'#0e0c0a':t===10?'#f0c040':t===11?'#ff6060':'#c8973c';
      ctx.fillText(FEATURE_MARKS[t],x*TS+TS/2,y*TS+TS/2);
    }
  }
  // Room labels
  if (mapData.labels) {
    ctx.font=`bold ${TS-4}px sans-serif`;
    ctx.textAlign='center'; ctx.textBaseline='top';
    mapData.labels.forEach(l=>{
      const px=l.x*TS, py=(l.y+1)*TS+2;
      ctx.fillStyle='rgba(0,0,0,0.7)';
      const w=ctx.measureText(l.text).width;
      ctx.fillRect(px-w/2-2,py-1,w+4,TS-2);
      ctx.fillStyle='#f0c040';
      ctx.fillText(l.text,px,py);
    });
  }

  // Title
  const titleEl=document.createElement('div');
  titleEl.className='map-title';
  titleEl.textContent=mapData.title;
  wrap.insertBefore(titleEl,canvas);

  // Legend
  const legendEl=document.getElementById('map-legend');
  const legendItems=[
    [0,'Wall'],[1,'Floor'],[2,'Door'],[9,'Chest'],[10,'Stairs'],
    [11,'Trap'],[8,'Pillar'],[3,'Water'],[4,'Lava'],[5,'Trees'],[12,'Grass'],[14,'Snow'],
  ];
  legendEl.innerHTML=legendItems.map(([t,n])=>
    `<span class="legend-item"><span class="legend-dot" style="background:${TILE_COLORS[t]}"></span>${n}</span>`
  ).join('');
}

// ── Music ─────────────────────────────────────────────────────────────────────

function renderMusic() {
  setContent(`
    <div class="view-header"><h1>🎵 Music</h1><p class="view-sub">Procedural scores synthesised live in your browser — no audio files</p></div>
    <div class="music-now" id="music-now"><span style="color:var(--muted)">Click a mood to start</span></div>
    <div class="mood-grid" id="mood-grid"></div>
    <div class="music-vol-row">
      <label>Volume</label>
      <input type="range" id="vol-slider" min="-40" max="0" value="${_mVol}" step="1">
      <span id="vol-label" class="vol-label">${_mVol} dB</span>
      <button class="btn btn-secondary btn-sm" onclick="musicStop()">⏹ Stop</button>
    </div>
  `);

  const grid=document.getElementById('grid')||document.getElementById('mood-grid');
  Object.entries(MOODS).forEach(([key,m])=>{
    const card=document.createElement('div');
    card.className='mood-card'+(key===_mActive?' active'+(m.purple?' purple':''):'');
    card.id='mood-'+key;
    card.innerHTML=`<span class="mood-bpm">${m.bpm} bpm</span><div class="mood-icon">${m.icon}</div><div class="mood-name">${m.name}</div><div class="mood-desc">${m.desc}</div>`;
    card.addEventListener('click',async()=>{
      if (_mActive===key&&Tone.getTransport().state==='started') { musicStop(); refreshMoodCards(); }
      else { await musicPlay(key); refreshMoodCards(); updateMusicNow(); }
    });
    document.getElementById('mood-grid').appendChild(card);
  });

  document.getElementById('vol-slider').addEventListener('input',e=>{
    _mVol=parseInt(e.target.value);
    document.getElementById('vol-label').textContent=`${_mVol} dB`;
  });

  updateMusicNow();
}

function refreshMoodCards() {
  document.querySelectorAll('.mood-card').forEach(c=>{
    const k=c.id.replace('mood-','');
    c.classList.remove('active','purple');
    if (k===_mActive) { c.classList.add('active'); if(MOODS[k]?.purple) c.classList.add('purple'); }
  });
}

function updateMusicNow() {
  const el=document.getElementById('music-now');
  if (!el) return;
  const m=_mActive?MOODS[_mActive]:null;
  el.innerHTML=m
    ? `<span class="now-dot playing"></span><strong>${m.icon} ${m.name}</strong> — ${m.desc}`
    : `<span style="color:var(--muted)">Click a mood to start</span>`;
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
