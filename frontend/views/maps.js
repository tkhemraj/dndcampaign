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

let _currentMap = null;

window.renderMapsView = async function(campaignId) {
  const el = document.getElementById('content');
  el.innerHTML = `
    <div class="view-header">
      <h1>🗺 Maps</h1>
      <span class="subtitle">Procedural combat & exploration maps</span>
    </div>

    <div class="card" style="margin-bottom:16px">
      <div style="display:grid;grid-template-columns:repeat(5,1fr) auto;gap:12px;align-items:end">
        <div class="form-group" style="margin-bottom:0">
          <label>Type</label>
          <select id="map-type-sel">
            <option value="dungeon">Dungeon</option>
            <option value="outdoor">Outdoor</option>
            <option value="interior">Interior</option>
            <option value="wildemount">Wildemount</option>
          </select>
        </div>
        <div class="form-group" style="margin-bottom:0">
          <label>Subtype</label>
          <select id="map-sub-sel"></select>
        </div>
        <div class="form-group" style="margin-bottom:0">
          <label>Width</label>
          <input id="map-w" type="number" value="60" min="20" max="100"/>
        </div>
        <div class="form-group" style="margin-bottom:0">
          <label>Height</label>
          <input id="map-h" type="number" value="40" min="15" max="80"/>
        </div>
        <div class="form-group" style="margin-bottom:0">
          <label>Name</label>
          <input id="map-name" type="text" value="New Map"/>
        </div>
        <button class="btn btn-purple" id="btn-do-gen">⚙ Generate</button>
      </div>
    </div>

    <div id="map-canvas-wrap" style="margin-bottom:16px"></div>
    <div id="map-list"></div>
  `;

  const subtypes = {
    dungeon:    ['generic','cave','temple','ruins_aeor'],
    outdoor:    ['forest','plains','tundra','badlands','coastal','jungle'],
    interior:   ['tavern','castle','ship','temple','mansion'],
    wildemount: ['xhorhas_wastes','aeor_ruins','rosohna_streets','dwendalian_keep',
                 'menagerie_port','savalirwood','eiselcross_tundra','kryn_temple','cerberus_lab','cavern_bazzoxan'],
  };

  const updateSubtypes = () => {
    const sel  = document.getElementById('map-sub-sel');
    const type = document.getElementById('map-type-sel').value;
    sel.innerHTML = subtypes[type].map(s =>
      `<option value="${s}">${s.replace(/_/g,' ')}</option>`).join('');
  };
  updateSubtypes();
  document.getElementById('map-type-sel').addEventListener('change', updateSubtypes);

  document.getElementById('btn-do-gen').addEventListener('click', async () => {
    const type = document.getElementById('map-type-sel').value;
    const sub  = document.getElementById('map-sub-sel').value;
    const w    = document.getElementById('map-w').value;
    const h    = document.getElementById('map-h').value;
    const name = document.getElementById('map-name').value || 'Map';
    const cid  = campaignId ? `&campaign_id=${campaignId}` : '';
    const btn  = document.getElementById('btn-do-gen');

    btn.disabled = true; btn.innerHTML = '<span class="spinner"></span>';
    try {
      const res = await api(
        `/api/maps/generate?map_type=${type}&subtype=${sub}&width=${w}&height=${h}&name=${encodeURIComponent(name)}${cid}`,
        'POST');
      _currentMap = res;
      renderCanvas(res);
      await loadMapList(campaignId);
      document.getElementById('map-canvas-wrap').scrollIntoView({ behavior:'smooth' });
      toast(`Map generated — ${name}`, 'success');
    } finally {
      btn.disabled = false; btn.textContent = '⚙ Generate';
    }
  });

  await loadMapList(campaignId);
};

async function loadMapList(campaignId) {
  const url  = campaignId ? `/api/maps/?campaign_id=${campaignId}` : '/api/maps/';
  const maps = await api(url);
  const el   = document.getElementById('map-list');

  if (!maps.length) {
    el.innerHTML = `<div class="empty-state">
      <div class="empty-state-icon">🗺</div>
      <div class="empty-state-title">No maps generated yet</div>
      <div class="empty-state-sub">Choose a type and subtype above and hit Generate to create your first map.</div>
    </div>`;
    return;
  }

  el.innerHTML = `<div class="section-title">Saved Maps</div>
    <div class="table-wrap"><table>
      <thead><tr><th>Name</th><th>Type</th><th>Subtype</th><th>Size</th><th>Created</th><th></th></tr></thead>
      <tbody>${maps.map(m => `<tr onclick="loadMap(${m.id})">
        <td><strong>${m.name}</strong></td>
        <td>${m.map_type}</td>
        <td>${(m.subtype||'—').replace(/_/g,' ')}</td>
        <td style="color:var(--muted);font-size:12px">${m.width}×${m.height}</td>
        <td style="color:var(--muted);font-size:12px">${m.created_at?.slice(0,16)||''}</td>
        <td style="display:flex;gap:4px" onclick="event.stopPropagation()">
          <button class="btn btn-secondary btn-sm" onclick="loadMap(${m.id})">View</button>
          <button class="btn btn-danger btn-sm"    onclick="deleteMap(${m.id})">✕</button>
        </td>
      </tr>`).join('')}</tbody>
    </table></div>`;
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

  wrap.innerHTML = `
    <div style="margin-bottom:10px;display:flex;align-items:center;gap:12px;flex-wrap:wrap">
      <strong style="font-family:'Cinzel',serif;color:var(--accent)">${mapData.name || 'Map'}</strong>
      <span style="color:var(--muted);font-size:12px">${data.map_type} / ${(data.subtype||'').replace(/_/g,' ')} · ${W}×${H}</span>
      <button class="btn btn-secondary btn-sm" id="btn-share-map">👥 Share</button>
      <button class="btn btn-secondary btn-sm" id="btn-export-map" style="margin-left:auto">⬇ Export PNG</button>
    </div>
    <div id="map-container"><canvas id="map-canvas"></canvas></div>
    <div id="map-legend"></div>
  `;

  const canvas = document.getElementById('map-canvas');
  canvas.width  = W * TILE_SIZE;
  canvas.height = H * TILE_SIZE;
  const ctx = canvas.getContext('2d');

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

  const usedTiles = new Set(tiles.flat());
  document.getElementById('map-legend').innerHTML = [...usedTiles].map(t => `
    <div class="legend-item">
      <div class="legend-swatch" style="background:${TILE_COLORS[t]||'#111'}"></div>
      ${TILE_LABELS[t]||t}
    </div>`).join('');

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
    const tx = Math.floor((e.clientX - rect.left) / TILE_SIZE);
    const ty = Math.floor((e.clientY - rect.top)  / TILE_SIZE);
    if (tx >= 0 && tx < W && ty >= 0 && ty < H)
      canvas.title = `(${tx},${ty}) ${TILE_LABELS[tiles[ty][tx]]||tiles[ty][tx]}`;
  });
}
