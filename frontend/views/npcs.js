'use strict';
const MOD = s => { const m = Math.floor((s - 10) / 2); return m >= 0 ? `+${m}` : `${m}`; };

let _npcView = 'cards';
let _allNpcs = [];

window.renderNpcsView = async function(campaignId) {
  const el = document.getElementById('content');
  el.innerHTML = `
    <div class="view-header">
      <div>
        <h1>NPCs</h1>
        <span class="subtitle">Characters, allies & enemies</span>
      </div>
      <div class="view-actions">
        <div class="view-toggle" id="view-toggle">
          <button class="view-toggle-btn${_npcView === 'cards' ? ' active' : ''}" id="btn-view-cards" title="Card view">⊞</button>
          <button class="view-toggle-btn${_npcView === 'table' ? ' active' : ''}" id="btn-view-table" title="Table view">☰</button>
        </div>
        <button class="btn btn-primary" id="btn-new-npc">+ Add NPC</button>
      </div>
    </div>

    <div class="search-row">
      <input type="search" id="npc-search" class="search-input" placeholder="Search by name, race, class, faction…"/>
    </div>

    <div class="gen-panel">
      <div class="gen-panel-fields">
        <div class="form-group" style="margin-bottom:0">
          <label>Region</label>
          <select id="npc-region">
            <option value="">Any region</option>
            <option>Western Wynandir</option><option>Xhorhas</option>
            <option>Menagerie Coast</option><option>Greying Wildlands</option><option>Eiselcross</option>
          </select>
        </div>
        <div class="form-group" style="margin-bottom:0">
          <label>Faction</label>
          <select id="npc-faction">
            <option value="">Any faction</option>
            <option>Dwendalian Empire</option><option>Cerberus Assembly</option>
            <option>Kryn Dynasty</option><option>Cobalt Soul</option>
            <option>The Revelry</option><option>The Myriad</option><option>The Clovis Concord</option>
          </select>
        </div>
      </div>
      <button class="btn btn-purple gen-panel-btn" id="btn-do-gen-npc">⚙ Generate NPC</button>
    </div>

    <div id="npc-list"></div>
  `;

  const renderNpcList = (npcs) => {
    const q = (document.getElementById('npc-search')?.value || '').toLowerCase();
    const filtered = q ? npcs.filter(n =>
      (n.name      || '').toLowerCase().includes(q) ||
      (n.race      || '').toLowerCase().includes(q) ||
      (n.npc_class || '').toLowerCase().includes(q) ||
      (n.faction   || '').toLowerCase().includes(q)
    ) : npcs;
    _npcView === 'cards' ? _renderNpcCards(filtered) : _renderNpcTable(filtered);
  };

  const loadList = async () => {
    const url = campaignId ? `/api/npcs/?campaign_id=${campaignId}` : '/api/npcs/';
    _allNpcs = await api(url);
    renderNpcList(_allNpcs);
  };
  await loadList();

  document.getElementById('npc-search').addEventListener('input', () => renderNpcList(_allNpcs));

  document.getElementById('btn-view-cards').addEventListener('click', () => {
    _npcView = 'cards';
    document.getElementById('btn-view-cards').classList.add('active');
    document.getElementById('btn-view-table').classList.remove('active');
    renderNpcList(_allNpcs);
  });
  document.getElementById('btn-view-table').addEventListener('click', () => {
    _npcView = 'table';
    document.getElementById('btn-view-table').classList.add('active');
    document.getElementById('btn-view-cards').classList.remove('active');
    renderNpcList(_allNpcs);
  });

  document.getElementById('btn-do-gen-npc').addEventListener('click', async () => {
    const region  = document.getElementById('npc-region').value  || null;
    const faction = document.getElementById('npc-faction').value || null;
    const params  = new URLSearchParams();
    if (campaignId) params.set('campaign_id', campaignId);
    if (region)     params.set('region', region);
    if (faction)    params.set('faction', faction);
    const btn = document.getElementById('btn-do-gen-npc');
    btn.disabled = true; btn.innerHTML = '<span class="spinner"></span> Generating…';
    try {
      const npc = await api(`/api/npcs/generate?${params}`);
      showNpcModal(npc, true, async () => { await loadList(); });
    } finally {
      btn.disabled = false; btn.textContent = '⚙ Generate NPC';
    }
  });

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

function _getInitials(name) {
  return (name||'?').trim().split(/\s+/).map(w=>w[0]).join('').slice(0,2).toUpperCase();
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
  el.innerHTML = `<div class="npc-card-grid">${npcs.map(n => {
    const initials = _getInitials(n.name);
    const sub = [n.race, n.npc_class, n.level > 1 ? `Lv${n.level}` : ''].filter(Boolean).join(' · ') || 'Unknown';
    return `
    <div class="npc-card2 status-${n.status}" onclick="viewNpc(${n.id})">
      <div class="npc-card2-avatar">${initials}</div>
      <div class="npc-card2-body">
        <div class="npc-card2-header">
          <div class="npc-card2-name">${n.name}</div>
          <div class="nri-dot ${n.status}"></div>
        </div>
        <div class="npc-card2-sub">${sub}</div>
        <div class="npc-card2-chips">
          ${n.faction ? `<span class="chip">${n.faction}</span>` : ''}
          ${n.region  ? `<span class="chip">${n.region}</span>`  : ''}
        </div>
        ${n.personality ? `<p class="npc-card2-quote">"${n.personality.slice(0,80)}${n.personality.length>80?'…':''}"</p>` : ''}
        ${n.hp ? `<div class="npc-card2-stats">HP ${n.hp} · AC ${n.ac||'—'} · ${n.alignment||'—'}</div>` : ''}
      </div>
      <div class="npc-card2-actions" onclick="event.stopPropagation()">
        <button class="btn btn-secondary btn-sm" onclick="viewNpc(${n.id})">View</button>
        <button class="btn btn-danger btn-sm"    onclick="deleteNpc(${n.id})">✕</button>
      </div>
    </div>`;
  }).join('')}</div>`;
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
    <thead><tr><th></th><th>Name</th><th>Race</th><th>Class</th><th>Lvl</th><th>Faction</th><th>Status</th><th></th></tr></thead>
    <tbody>${npcs.map(n => `<tr onclick="viewNpc(${n.id})" style="cursor:pointer">
      <td style="width:32px;padding:8px 4px 8px 12px">
        <div class="npc-tbl-avatar">${_getInitials(n.name)}</div>
      </td>
      <td><strong>${n.name}</strong></td>
      <td style="color:var(--muted)">${n.race||'—'}</td>
      <td style="color:var(--muted)">${n.npc_class||'—'}</td>
      <td style="color:var(--muted)">${n.level}</td>
      <td>${n.faction ? `<span class="chip">${n.faction}</span>` : '<span style="color:var(--muted)">—</span>'}</td>
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
  const STAT_KEYS = ['str_score','dex_score','con_score','int_score','wis_score','cha_score'];
  const STAT_IDS  = ['str','dex','con','int','wis','cha'];
  const STAT_LBLS = ['STR','DEX','CON','INT','WIS','CHA'];

  const body = document.getElementById('modal-body');
  body.innerHTML = `
    <h2 class="modal-title">${isNew && !npc.id ? 'New NPC' : npc.name || 'NPC'}</h2>
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

    <div class="modal-section-sep">Combat Stats</div>
    <div class="form-row">
      <div class="form-group"><label>HP</label><input id="f-hp" type="number" value="${npc.hp||8}" min="1"/></div>
      <div class="form-group"><label>AC</label><input id="f-ac" type="number" value="${npc.ac||10}" min="1"/></div>
    </div>
    <div class="form-row" style="flex-wrap:wrap">
      ${STAT_LBLS.map((lbl, i) => `
        <div class="form-group stat-input-group">
          <label>${lbl}</label>
          <input id="f-${STAT_IDS[i]}" type="number" value="${npc[STAT_KEYS[i]]||10}" min="1" max="30"/>
          <div class="stat-mod-preview" id="mod-${STAT_IDS[i]}">${MOD(npc[STAT_KEYS[i]]||10)}</div>
        </div>`).join('')}
    </div>

    <div class="modal-actions">
      <button class="btn btn-primary" id="btn-save-npc">Save</button>
      ${npc.id ? `<button class="btn btn-danger" id="btn-del-npc">Delete</button>` : ''}
    </div>
  `;

  STAT_IDS.forEach(sid => {
    document.getElementById(`f-${sid}`).addEventListener('input', e => {
      document.getElementById(`mod-${sid}`).textContent = MOD(parseInt(e.target.value) || 10);
    });
  });
  openModal();

  document.getElementById('btn-save-npc').addEventListener('click', async () => {
    const payload = {
      campaign_id: npc.campaign_id, name: v('f-name'), race: v('f-race'),
      npc_class: v('f-class'), level: parseInt(v('f-level')),
      faction: v('f-faction'), region: v('f-region'), alignment: v('f-align'),
      status: v('f-status'), personality: v('f-personality'),
      ideal: v('f-ideal'), bond: v('f-bond'), flaw: v('f-flaw'),
      backstory: v('f-backstory'), notes: v('f-notes'),
      hp: parseInt(v('f-hp')) || 0, ac: parseInt(v('f-ac')) || 10,
      str_score: parseInt(v('f-str')) || 10, dex_score: parseInt(v('f-dex')) || 10,
      con_score: parseInt(v('f-con')) || 10, int_score: parseInt(v('f-int')) || 10,
      wis_score: parseInt(v('f-wis')) || 10, cha_score: parseInt(v('f-cha')) || 10,
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
    <div class="stat-block-meta">
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
