'use strict';

const TILE_SIZE = 18;
const TILE_COLORS = {
  0:'#0a0806', 1:'#3a3020', 2:'#7a5020', 3:'#1a3a5a', 4:'#7a2800',
  5:'#1a4a10', 6:'#5a4020', 7:'#2a2218', 8:'#4a3a28', 9:'#7a6a18',
  10:'#404860', 11:'#5a0a0a', 12:'#2a4a18', 13:'#4a3a18', 14:'#6a8a9a',
};
const TILE_LABELS = {
  0:'Wall', 1:'Floor', 2:'Door', 3:'Water', 4:'Lava', 5:'Trees', 6:'Road',
  7:'Rubble', 8:'Pillar', 9:'Chest', 10:'Stairs', 11:'Trap', 12:'Grass', 13:'Dirt', 14:'Snow',
};
const FEATURE_COLORS = {
  chest:'#f0c040', stairs_up:'#6080ff', stairs_down:'#8040ff', trap:'#ff2020',
  altar:'#c060ff', pillar:'#806040', fireplace:'#ff6020', throne:'#c0a020',
  ruins:'#604838', campfire:'#ff8020', luxon_beacon_fragment:'#40c0ff',
  luxon_altar:'#8040ff', betrayer_god_shrine:'#800020',
};

const MAP_TYPES = [
  { key:'dungeon',    icon:'💀', label:'Dungeon'    },
  { key:'outdoor',   icon:'🌲', label:'Outdoor'    },
  { key:'interior',  icon:'🏠', label:'Interior'   },
  { key:'wildemount',icon:'🗺', label:'Wildemount' },
];

const MAP_SUBTYPES = {
  dungeon:    ['generic','cave','temple','ruins_aeor'],
  outdoor:    ['forest','plains','tundra','badlands','coastal','jungle'],
  interior:   ['tavern','castle','ship','temple','mansion'],
  wildemount: ['xhorhas_wastes','aeor_ruins','rosohna_streets','dwendalian_keep',
               'menagerie_port','savalirwood','eiselcross_tundra','kryn_temple','cerberus_lab','cavern_bazzoxan'],
};

let _currentMap  = null;
let _activeType  = 'dungeon';
let _activeSub   = 'generic';

window.renderMapsView = async function(campaignId) {
  const el = document.getElementById('content');
  el.innerHTML = `
    <div class="view-header">
      <div>
        <h1>Maps</h1>
        <span class="subtitle">Procedural combat & exploration maps</span>
      </div>
    </div>

    <div class="map-gen-panel">
      <div class="map-gen-top">
        <div class="map-gen-section">
          <div class="map-gen-label">Map Type</div>
          <div class="map-type-pills" id="map-type-pills">
            ${MAP_TYPES.map(t => `
              <button class="map-type-pill${t.key === _activeType ? ' active' : ''}" data-type="${t.key}">
                <span class="map-type-pill-icon">${t.icon}</span>
                <span class="map-type-pill-label">${t.label}</span>
              </button>`).join('')}
          </div>
        </div>
        <div class="map-gen-section">
          <div class="map-gen-label">Subtype</div>
          <div class="map-sub-pills" id="map-sub-pills"></div>
        </div>
      </div>
      <div class="map-gen-bottom">
        <div class="map-size-row">
          <div class="form-group" style="margin-bottom:0">
            <label>Name</label>
            <input id="map-name" type="text" value="New Map" style="min-width:160px"/>
          </div>
          <div class="form-group" style="margin-bottom:0">
            <label>Width</label>
            <input id="map-w" type="number" value="60" min="20" max="100" style="width:80px"/>
          </div>
          <div class="form-group" style="margin-bottom:0">
            <label>Height</label>
            <input id="map-h" type="number" value="40" min="15" max="80" style="width:80px"/>
          </div>
        </div>
        <button class="btn btn-primary map-gen-btn" id="btn-do-gen">
          <span class="map-gen-btn-icon">⚙</span> Generate Map
        </button>
      </div>
    </div>

    <div id="map-canvas-wrap" style="margin-bottom:20px"></div>
    <div id="map-list"></div>
  `;

  _renderSubPills();

  document.getElementById('map-type-pills').addEventListener('click', e => {
    const pill = e.target.closest('.map-type-pill');
    if (!pill) return;
    _activeType = pill.dataset.type;
    _activeSub  = MAP_SUBTYPES[_activeType][0];
    document.querySelectorAll('.map-type-pill').forEach(p => p.classList.toggle('active', p.dataset.type === _activeType));
    _renderSubPills();
  });

  document.getElementById('btn-do-gen').addEventListener('click', async () => {
    const w    = document.getElementById('map-w').value;
    const h    = document.getElementById('map-h').value;
    const name = document.getElementById('map-name').value || 'Map';
    const cid  = campaignId ? `&campaign_id=${campaignId}` : '';
    const btn  = document.getElementById('btn-do-gen');

    btn.disabled = true;
    btn.innerHTML = '<span class="spinner"></span> Generating…';
    try {
      const res = await api(
        `/api/maps/generate?map_type=${_activeType}&subtype=${_activeSub}&width=${w}&height=${h}&name=${encodeURIComponent(name)}${cid}`,
        'POST');
      _currentMap = res;
      renderCanvas(res);
      await loadMapList(campaignId);
      document.getElementById('map-canvas-wrap').scrollIntoView({ behavior:'smooth' });
      toast(`${name} generated`, 'success');
    } finally {
      btn.disabled = false;
      btn.innerHTML = '<span class="map-gen-btn-icon">⚙</span> Generate Map';
    }
  });

  await loadMapList(campaignId);
};

function _renderSubPills() {
  const container = document.getElementById('map-sub-pills');
  if (!container) return;
  const subs = MAP_SUBTYPES[_activeType] || [];
  container.innerHTML = subs.map(s => `
    <button class="map-sub-chip${s === _activeSub ? ' active' : ''}" data-sub="${s}">
      ${s.replace(/_/g,' ')}
    </button>`).join('');
  container.addEventListener('click', e => {
    const chip = e.target.closest('.map-sub-chip');
    if (!chip) return;
    _activeSub = chip.dataset.sub;
    container.querySelectorAll('.map-sub-chip').forEach(c => c.classList.toggle('active', c.dataset.sub === _activeSub));
  });
}

async function loadMapList(campaignId) {
  const url  = campaignId ? `/api/maps/?campaign_id=${campaignId}` : '/api/maps/';
  const maps = await api(url);
  const el   = document.getElementById('map-list');

  if (!maps.length) {
    el.innerHTML = `<div class="empty-state">
      <div class="empty-state-icon">🗺</div>
      <div class="empty-state-title">No maps yet</div>
      <div class="empty-state-sub">Choose a type and subtype above and hit Generate to create your first map.</div>
    </div>`;
    return;
  }

  const TYPE_COLORS = { dungeon:'#5a2a0a', outdoor:'#1a4a10', interior:'#3a2a5a', wildemount:'#1a3a4a' };
  const TYPE_ICONS  = { dungeon:'💀', outdoor:'🌲', interior:'🏠', wildemount:'🗺' };

  el.innerHTML = `
    <div class="section-title" style="margin-bottom:14px">Saved Maps <span style="color:var(--muted);font-weight:400;font-size:11px">${maps.length}</span></div>
    <div class="map-saved-grid">
      ${maps.map(m => `
        <div class="map-saved-card" onclick="loadMap(${m.id})">
          <div class="map-saved-swatch" style="background:${TYPE_COLORS[m.map_type]||'#2a2218'}">
            <span class="map-saved-icon">${TYPE_ICONS[m.map_type]||'🗺'}</span>
            <span class="map-saved-size">${m.width}×${m.height}</span>
          </div>
          <div class="map-saved-info">
            <div class="map-saved-name">${m.name}</div>
            <div class="map-saved-meta">${m.map_type}${m.subtype ? ' / ' + m.subtype.replace(/_/g,' ') : ''}</div>
            <div class="map-saved-date">${m.created_at?.slice(0,10)||''}</div>
          </div>
          <div class="map-saved-actions" onclick="event.stopPropagation()">
            <button class="btn btn-secondary btn-sm" onclick="loadMap(${m.id})">View</button>
            <button class="btn btn-danger btn-sm"    onclick="deleteMap(${m.id})">✕</button>
          </div>
        </div>`).join('')}
    </div>`;
}

window.loadMap = async function(id) {
  const res = await api(`/api/maps/${id}`);
  _currentMap = res;
  renderCanvas(res);
  document.getElementById('map-canvas-wrap').scrollIntoView({ behavior:'smooth' });
};

window.deleteMap = async function(id) {
  confirmModal('Delete this map?', async () => {
    await api(`/api/maps/${id}`, 'DELETE');
    await loadMapList(window._activeCampaignId);
    toast('Map deleted', 'info');
  });
};

function renderCanvas(mapData) {
  const wrap = document.getElementById('map-canvas-wrap');
  const data = mapData.data || mapData;
  const tiles = data.tiles;
  const W = data.width, H = data.height;

  let _zoom = 1.0;
  const ZOOM_STEP = 0.25, ZOOM_MIN = 0.25, ZOOM_MAX = 4.0;

  wrap.innerHTML = `
    <div class="map-frame">
      <div class="map-frame-header">
        <div class="map-frame-title">${mapData.name || 'Map'}</div>
        <div class="map-frame-meta">${data.map_type}${data.subtype ? ' / ' + data.subtype.replace(/_/g,' ') : ''} · ${W}×${H}</div>
        <div class="map-zoom-controls">
          <button class="map-zoom-btn" id="btn-zoom-out" title="Zoom out (scroll down)">−</button>
          <span class="map-zoom-label" id="map-zoom-label">100%</span>
          <button class="map-zoom-btn" id="btn-zoom-in"  title="Zoom in (scroll up)">+</button>
          <button class="map-zoom-btn map-zoom-reset" id="btn-zoom-reset" title="Reset zoom">⤢</button>
        </div>
        <div class="map-frame-actions">
          <button class="btn btn-secondary btn-sm" id="btn-share-map">👥 Share</button>
          <button class="btn btn-secondary btn-sm" id="btn-export-map">⬇ Export PNG</button>
        </div>
      </div>
      <div class="map-scroll" id="map-container"><canvas id="map-canvas"></canvas></div>
      <div id="map-legend"></div>
    </div>`;

  const canvas    = document.getElementById('map-canvas');
  const container = document.getElementById('map-container');
  canvas.width  = W * TILE_SIZE;
  canvas.height = H * TILE_SIZE;
  const ctx = canvas.getContext('2d');

  // ── Draw ──────────────────────────────────────────────────────────────────
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const t = tiles[y][x];
      ctx.fillStyle = TILE_COLORS[t] || '#111';
      ctx.fillRect(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
    }
  }

  ctx.strokeStyle = 'rgba(255,255,255,0.04)';
  ctx.lineWidth   = 0.5;
  for (let x = 0; x <= W; x++) { ctx.beginPath(); ctx.moveTo(x*TILE_SIZE,0); ctx.lineTo(x*TILE_SIZE,H*TILE_SIZE); ctx.stroke(); }
  for (let y = 0; y <= H; y++) { ctx.beginPath(); ctx.moveTo(0,y*TILE_SIZE); ctx.lineTo(W*TILE_SIZE,y*TILE_SIZE); ctx.stroke(); }

  (data.features || []).forEach(f => {
    const col = FEATURE_COLORS[f.type] || '#ffffff';
    const cx  = f.x * TILE_SIZE + TILE_SIZE / 2;
    const cy  = f.y * TILE_SIZE + TILE_SIZE / 2;
    ctx.beginPath(); ctx.arc(cx, cy, TILE_SIZE / 3, 0, Math.PI * 2);
    ctx.fillStyle   = col + '99'; ctx.fill();
    ctx.strokeStyle = col; ctx.lineWidth = 1.5; ctx.stroke();
  });

  if (data.rooms) {
    ctx.font         = `${TILE_SIZE * 0.55}px sans-serif`;
    ctx.fillStyle    = 'rgba(255,255,200,0.45)';
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'middle';
    data.rooms.forEach(r => {
      ctx.fillText((r.type||'').replace(/_/g,' '), (r.x+r.w/2)*TILE_SIZE, (r.y+r.h/2)*TILE_SIZE);
    });
  }

  // ── Zoom helpers ───────────────────────────────────────────────────────────
  function applyZoom(pivotX, pivotY) {
    // preserve scroll position relative to pivot point
    const oldW = canvas.offsetWidth || W * TILE_SIZE;
    const oldH = canvas.offsetHeight || H * TILE_SIZE;
    const newW = Math.round(W * TILE_SIZE * _zoom);
    const newH = Math.round(H * TILE_SIZE * _zoom);
    const ratioX = (container.scrollLeft + (pivotX || container.clientWidth  / 2)) / oldW;
    const ratioY = (container.scrollTop  + (pivotY || container.clientHeight / 2)) / oldH;
    canvas.style.width  = newW + 'px';
    canvas.style.height = newH + 'px';
    canvas.style.imageRendering = _zoom >= 2 ? 'pixelated' : 'auto';
    container.scrollLeft = ratioX * newW - (pivotX || container.clientWidth  / 2);
    container.scrollTop  = ratioY * newH - (pivotY || container.clientHeight / 2);
    document.getElementById('map-zoom-label').textContent = Math.round(_zoom * 100) + '%';
  }

  function zoomBy(delta, pivotX, pivotY) {
    _zoom = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, Math.round((_zoom + delta) * 100) / 100));
    applyZoom(pivotX, pivotY);
  }

  applyZoom();

  document.getElementById('btn-zoom-in').addEventListener('click',    () => zoomBy(+ZOOM_STEP));
  document.getElementById('btn-zoom-out').addEventListener('click',   () => zoomBy(-ZOOM_STEP));
  document.getElementById('btn-zoom-reset').addEventListener('click', () => { _zoom = 1.0; applyZoom(); });

  container.addEventListener('wheel', e => {
    e.preventDefault();
    const rect = container.getBoundingClientRect();
    zoomBy(e.deltaY < 0 ? +ZOOM_STEP : -ZOOM_STEP,
           e.clientX - rect.left,
           e.clientY - rect.top);
  }, { passive: false });

  // ── Legend ─────────────────────────────────────────────────────────────────
  const usedTiles = new Set(tiles.flat());
  document.getElementById('map-legend').innerHTML = [...usedTiles].map(t => `
    <div class="legend-item">
      <div class="legend-swatch" style="background:${TILE_COLORS[t]||'#111'}"></div>
      ${TILE_LABELS[t]||t}
    </div>`).join('');

  // ── Actions ────────────────────────────────────────────────────────────────
  document.getElementById('btn-export-map').addEventListener('click', () => {
    const a = document.createElement('a');
    a.download = `${(mapData.name||'map').replace(/\s+/g,'-')}.png`;
    a.href = canvas.toDataURL('image/png');
    a.click();
  });

  document.getElementById('btn-share-map').addEventListener('click', async () => {
    const btn = document.getElementById('btn-share-map');
    btn.disabled = true;
    try {
      await api('/api/live/broadcast', 'POST', { map: { name: mapData.name, data } });
      toast('Map shared with players', 'success');
      btn.textContent = '✓ Shared';
      setTimeout(() => { btn.textContent = '👥 Share'; btn.disabled = false; }, 2500);
    } catch(e) {
      btn.disabled = false;
      toast('Share failed', 'error');
    }
  });

  canvas.addEventListener('mousemove', e => {
    const rect = canvas.getBoundingClientRect();
    const tx = Math.floor((e.clientX - rect.left) / (TILE_SIZE * _zoom));
    const ty = Math.floor((e.clientY - rect.top)  / (TILE_SIZE * _zoom));
    if (tx >= 0 && tx < W && ty >= 0 && ty < H)
      canvas.title = `(${tx},${ty}) ${TILE_LABELS[tiles[ty][tx]]||tiles[ty][tx]}`;
  });
}
