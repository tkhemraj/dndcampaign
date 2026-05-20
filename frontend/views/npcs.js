'use strict';
const MOD = s => { const m = Math.floor((s - 10) / 2); return m >= 0 ? `+${m}` : `${m}`; };

let _npcView = 'cards';

window.renderNpcsView = async function(campaignId) {
  const el = document.getElementById('content');
  el.innerHTML = `
    <div class="view-header">
      <h1>👥 NPCs</h1>
      <div class="view-actions">
        <div style="display:flex;gap:2px;background:var(--surface2);border:1px solid var(--border);border-radius:var(--radius-sm);padding:2px">
          <button class="btn btn-sm" id="btn-view-cards" title="Card view" style="padding:3px 9px;font-size:14px">⊞</button>
          <button class="btn btn-sm" id="btn-view-table" title="Table view" style="padding:3px 9px;font-size:14px">☰</button>
        </div>
        <button class="btn btn-purple" id="btn-gen-npc">⚙ Generate NPC</button>
        <button class="btn btn-primary" id="btn-new-npc">+ Add</button>
      </div>
    </div>

    <div id="gen-controls" class="card" style="margin-bottom:16px">
      <div style="display:grid;grid-template-columns:1fr 1fr auto;gap:12px;align-items:end">
        <div class="form-group" style="margin-bottom:0"><label>Region</label>
          <select id="npc-region">
            <option value="">Any</option>
            <option>Western Wynandir</option><option>Xhorhas</option>
            <option>Menagerie Coast</option><option>Greying Wildlands</option><option>Eiselcross</option>
          </select>
        </div>
        <div class="form-group" style="margin-bottom:0"><label>Faction</label>
          <select id="npc-faction">
            <option value="">Any</option>
            <option>Dwendalian Empire</option><option>Cerberus Assembly</option>
            <option>Kryn Dynasty</option><option>Cobalt Soul</option>
            <option>The Revelry</option><option>The Myriad</option><option>The Clovis Concord</option>
          </select>
        </div>
        <button class="btn btn-primary" id="btn-do-gen-npc">Generate</button>
      </div>
    </div>

    <div id="npc-list"></div>
  `;

  _syncViewToggle();

  const loadList = async () => {
    const url  = campaignId ? `/api/npcs/?campaign_id=${campaignId}` : '/api/npcs/';
    const npcs = await api(url);
    _npcView === 'cards' ? _renderNpcCards(npcs) : _renderNpcTable(npcs);
  };
  await loadList();

  document.getElementById('btn-view-cards').addEventListener('click', () => {
    _npcView = 'cards'; _syncViewToggle(); loadList();
  });
  document.getElementById('btn-view-table').addEventListener('click', () => {
    _npcView = 'table'; _syncViewToggle(); loadList();
  });

  document.getElementById('btn-do-gen-npc').addEventListener('click', async () => {
    const region  = document.getElementById('npc-region').value  || null;
    const faction = document.getElementById('npc-faction').value || null;
    const params  = new URLSearchParams();
    if (campaignId) params.set('campaign_id', campaignId);
    if (region)     params.set('region', region);
    if (faction)    params.set('faction', faction);
    const btn = document.getElementById('btn-do-gen-npc');
    btn.disabled = true; btn.innerHTML = '<span class="spinner"></span>';
    try {
      const npc = await api(`/api/npcs/generate?${params}`);
      showNpcModal(npc, true, async () => { await loadList(); });
    } finally {
      btn.disabled = false; btn.textContent = 'Generate';
    }
  });

  document.getElementById('btn-gen-npc').addEventListener('click', () =>
    document.getElementById('btn-do-gen-npc').click());

  document.getElementById('btn-new-npc').addEventListener('click', () => {
    showNpcModal({ campaign_id: campaignId, level: 1, status: 'alive' }, true,
      async () => { await loadList(); });
  });

  window.viewNpc = async id => {
    const npc = await api(`/api/npcs/${id}`);
    showNpcModal(npc, false, async () => { await loadList(); });
  };
  window.deleteNpc = id => {
    confirmModal(`Delete this NPC?`, async () => {
      await api(`/api/npcs/${id}`, 'DELETE');
      await loadList();
      toast('NPC deleted', 'info');
    });
  };
};

function _syncViewToggle() {
  const cards = document.getElementById('btn-view-cards');
  const table = document.getElementById('btn-view-table');
  if (!cards) return;
  cards.className = `btn btn-sm ${_npcView === 'cards' ? 'btn-primary' : 'btn-secondary'}`;
  table.className = `btn btn-sm ${_npcView === 'table' ? 'btn-primary' : 'btn-secondary'}`;
  cards.style.padding = table.style.padding = '3px 9px';
  cards.style.fontSize = table.style.fontSize = '14px';
}

function _renderNpcCards(npcs) {
  const el = document.getElementById('npc-list');
  if (!npcs.length) {
    el.innerHTML = `<div class="empty-state">
      <div class="empty-state-icon">👥</div>
      <div class="empty-state-title">No NPCs yet</div>
      <div class="empty-state-sub">Generate a Wildemount NPC above, or add one manually to get started.</div>
    </div>`;
    return;
  }
  el.innerHTML = `<div class="card-grid">${npcs.map(n => `
    <div class="npc-card status-${n.status}" onclick="viewNpc(${n.id})">
      <div style="display:flex;align-items:flex-start;gap:8px;margin-bottom:7px">
        <div style="flex:1;min-width:0">
          <div style="font-family:'Cinzel',serif;color:var(--accent);font-weight:600;font-size:14px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${n.name}</div>
          <div style="font-size:11px;color:var(--muted);margin-top:2px">
            ${[n.race, n.npc_class, n.level > 1 ? `Level ${n.level}` : ''].filter(Boolean).join(' · ') || 'Unknown'}
          </div>
        </div>
        <span class="badge badge-${n.status}" style="flex-shrink:0">${n.status}</span>
      </div>
      <div style="display:flex;gap:4px;flex-wrap:wrap;margin-bottom:${n.personality ? 6 : 10}px">
        ${n.faction ? `<span class="chip">${n.faction}</span>` : ''}
        ${n.region  ? `<span class="chip">${n.region}</span>`  : ''}
      </div>
      ${n.hp ? `<div style="font-size:11px;color:var(--muted2);margin-bottom:6px">HP ${n.hp} &middot; AC ${n.ac||'—'} &middot; ${n.alignment||''}</div>` : ''}
      ${n.personality ? `<p style="font-size:11px;color:var(--muted);font-style:italic;line-height:1.45;margin-bottom:10px">
        "${n.personality.slice(0,90)}${n.personality.length > 90 ? '…' : ''}"</p>` : ''}
      <div style="display:flex;gap:4px;margin-top:auto" onclick="event.stopPropagation()">
        <button class="btn btn-secondary btn-sm" onclick="viewNpc(${n.id})">View</button>
        <button class="btn btn-danger btn-sm"    onclick="deleteNpc(${n.id})">✕</button>
      </div>
    </div>`).join('')}</div>`;
}

function _renderNpcTable(npcs) {
  const el = document.getElementById('npc-list');
  if (!npcs.length) {
    el.innerHTML = `<div class="empty-state">
      <div class="empty-state-icon">👥</div>
      <div class="empty-state-title">No NPCs yet</div>
      <div class="empty-state-sub">Generate a Wildemount NPC above, or add one manually.</div>
    </div>`;
    return;
  }
  el.innerHTML = `<div class="table-wrap"><table>
    <thead><tr><th>Name</th><th>Race</th><th>Class</th><th>Lvl</th><th>Faction</th><th>Status</th><th></th></tr></thead>
    <tbody>${npcs.map(n => `<tr onclick="viewNpc(${n.id})">
      <td><strong>${n.name}</strong></td>
      <td>${n.race||'—'}</td><td>${n.npc_class||'—'}</td><td>${n.level}</td>
      <td>${n.faction ? `<span class="chip">${n.faction}</span>` : '—'}</td>
      <td><span class="badge badge-${n.status}">${n.status}</span></td>
      <td style="display:flex;gap:4px" onclick="event.stopPropagation()">
        <button class="btn btn-secondary btn-sm" onclick="viewNpc(${n.id})">View</button>
        <button class="btn btn-danger btn-sm"    onclick="deleteNpc(${n.id})">✕</button>
      </td>
    </tr>`).join('')}</tbody>
  </table></div>`;
}

// ── NPC modal ─────────────────────────────────────────────────────────────────
function showNpcModal(npc, isNew, onSave) {
  const body = document.getElementById('modal-body');
  body.innerHTML = `
    <h2 style="font-family:'Cinzel',serif;color:var(--accent);margin-bottom:16px">${isNew && !npc.id ? 'New NPC' : npc.name || 'NPC'}</h2>
    ${npc.id ? statBlockHtml(npc) : ''}
    <div class="form-row">
      <div class="form-group"><label>Name</label><input id="f-name" value="${npc.name||''}"/></div>
      <div class="form-group"><label>Race</label><input id="f-race" value="${npc.race||''}"/></div>
    </div>
    <div class="form-row">
      <div class="form-group"><label>Class</label><input id="f-class" value="${npc.npc_class||''}"/></div>
      <div class="form-group"><label>Level</label><input id="f-level" type="number" value="${npc.level||1}"/></div>
    </div>
    <div class="form-row">
      <div class="form-group"><label>Faction</label><input id="f-faction" value="${npc.faction||''}"/></div>
      <div class="form-group"><label>Region</label><input id="f-region" value="${npc.region||''}"/></div>
    </div>
    <div class="form-row">
      <div class="form-group"><label>Alignment</label><input id="f-align" value="${npc.alignment||''}"/></div>
      <div class="form-group"><label>Status</label>
        <select id="f-status">${['alive','dead','unknown'].map(s=>`<option ${npc.status===s?'selected':''}>${s}</option>`).join('')}</select>
      </div>
    </div>
    <div class="form-group"><label>Personality</label><textarea id="f-personality">${npc.personality||''}</textarea></div>
    <div class="form-group"><label>Ideal</label><textarea id="f-ideal">${npc.ideal||''}</textarea></div>
    <div class="form-group"><label>Bond</label><textarea id="f-bond">${npc.bond||''}</textarea></div>
    <div class="form-group"><label>Flaw</label><textarea id="f-flaw">${npc.flaw||''}</textarea></div>
    <div class="form-group"><label>Backstory</label><textarea id="f-backstory" style="min-height:100px">${npc.backstory||''}</textarea></div>
    <div class="form-group"><label>Notes</label><textarea id="f-notes">${npc.notes||''}</textarea></div>
    <div style="display:flex;gap:8px;margin-top:16px">
      <button class="btn btn-primary" id="btn-save-npc">Save</button>
      ${npc.id ? `<button class="btn btn-danger" id="btn-del-npc">Delete</button>` : ''}
    </div>
  `;
  openModal();

  document.getElementById('btn-save-npc').addEventListener('click', async () => {
    const payload = {
      campaign_id: npc.campaign_id, name: v('f-name'), race: v('f-race'),
      npc_class: v('f-class'), level: parseInt(v('f-level')),
      faction: v('f-faction'), region: v('f-region'), alignment: v('f-align'),
      status: v('f-status'), personality: v('f-personality'),
      ideal: v('f-ideal'), bond: v('f-bond'), flaw: v('f-flaw'),
      backstory: v('f-backstory'), notes: v('f-notes'),
      hp: npc.hp, ac: npc.ac,
      str_score: npc.str_score, dex_score: npc.dex_score, con_score: npc.con_score,
      int_score: npc.int_score, wis_score: npc.wis_score, cha_score: npc.cha_score,
    };
    if (npc.id) await api(`/api/npcs/${npc.id}`, 'PUT', payload);
    else await api('/api/npcs/', 'POST', payload);
    closeModal(); await onSave();
    toast(npc.id ? 'NPC saved' : 'NPC created', 'success');
  });

  if (npc.id) {
    document.getElementById('btn-del-npc').addEventListener('click', () => {
      confirmModal(`Delete ${npc.name}?`, async () => {
        await api(`/api/npcs/${npc.id}`, 'DELETE');
        closeModal(); await onSave();
        toast('NPC deleted', 'info');
      });
    });
  }
}

function statBlockHtml(n) {
  if (!n.str_score) return '';
  return `<div class="stat-block" style="margin-bottom:20px">
    <h3>${n.name}${n.race ? ` — ${n.race}` : ''}${n.npc_class ? ` ${n.npc_class}` : ''}${n.level > 1 ? ` ${n.level}` : ''}</h3>
    <div style="font-size:12px;color:var(--muted);margin-bottom:10px">
      AC ${n.ac||'—'} &middot; HP ${n.hp||'—'} &middot; ${n.alignment||''}
      ${n.faction ? `&middot; <span class="chip">${n.faction}</span>` : ''}
    </div>
    <div class="stat-row">
      ${['STR','DEX','CON','INT','WIS','CHA'].map((s,i) => {
        const key = ['str_score','dex_score','con_score','int_score','wis_score','cha_score'][i];
        const val = n[key] || 10;
        return `<div class="stat-box"><div class="stat-label">${s}</div><div class="stat-val">${val}</div><div class="stat-mod">${MOD(val)}</div></div>`;
      }).join('')}
    </div>
  </div>`;
}

function v(id) { return document.getElementById(id)?.value || ''; }
