'use strict';
const MOD = s => { const m = Math.floor((s - 10) / 2); return m >= 0 ? `+${m}` : `${m}`; };

window.renderNpcsView = async function(campaignId) {
  const el = document.getElementById('content');
  el.innerHTML = `
    <div class="view-header">
      <h1>👥 NPCs</h1>
      <div class="view-actions">
        <button class="btn btn-purple" id="btn-gen-npc">⚙ Generate NPC</button>
        <button class="btn btn-primary" id="btn-new-npc">+ Add NPC</button>
      </div>
    </div>
    <div id="gen-controls" class="card" style="margin-bottom:16px">
      <div class="form-row">
        <div class="form-group"><label>Region</label>
          <select id="npc-region">
            <option value="">Any</option>
            <option>Western Wynandir</option><option>Xhorhas</option>
            <option>Menagerie Coast</option><option>Greying Wildlands</option><option>Eiselcross</option>
          </select></div>
        <div class="form-group"><label>Faction</label>
          <select id="npc-faction">
            <option value="">Any</option>
            <option>Dwendalian Empire</option><option>Cerberus Assembly</option>
            <option>Kryn Dynasty</option><option>Cobalt Soul</option>
            <option>The Revelry</option><option>The Myriad</option><option>The Clovis Concord</option>
          </select></div>
        <div class="form-group" style="justify-content:flex-end">
          <button class="btn btn-primary" id="btn-do-gen-npc">Generate</button>
        </div>
      </div>
    </div>
    <div id="npc-list"></div>
  `;

  const loadList = async () => {
    const url = campaignId ? `/api/npcs/?campaign_id=${campaignId}` : '/api/npcs/';
    const npcs = await api(url);
    const el2 = document.getElementById('npc-list');
    if (!npcs.length) { el2.innerHTML = '<p style="color:var(--muted)">No NPCs yet.</p>'; return; }
    el2.innerHTML = `<div class="table-wrap"><table>
      <thead><tr><th>Name</th><th>Race</th><th>Class</th><th>Lvl</th><th>Faction</th><th>Region</th><th>Status</th><th></th></tr></thead>
      <tbody>${npcs.map(n => `<tr>
        <td><strong>${n.name}</strong></td><td>${n.race||'—'}</td>
        <td>${n.npc_class||'—'}</td><td>${n.level}</td>
        <td>${n.faction||'—'}</td><td>${n.region||'—'}</td>
        <td><span class="badge badge-${n.status}">${n.status}</span></td>
        <td style="display:flex;gap:4px">
          <button class="btn btn-secondary btn-sm" onclick="viewNpc(${n.id})">View</button>
          <button class="btn btn-danger btn-sm" onclick="deleteNpc(${n.id},loadList)">✕</button>
        </td>
      </tr>`).join('')}</tbody>
    </table></div>`;
  };
  await loadList();

  document.getElementById('btn-do-gen-npc').addEventListener('click', async () => {
    const region  = document.getElementById('npc-region').value || null;
    const faction = document.getElementById('npc-faction').value || null;
    const params  = new URLSearchParams();
    if (campaignId) params.set('campaign_id', campaignId);
    if (region) params.set('region', region);
    if (faction) params.set('faction', faction);
    const npc = await api(`/api/npcs/generate?${params}`);
    showNpcModal(npc, true, async () => { await loadList(); });
  });

  document.getElementById('btn-new-npc').addEventListener('click', () => {
    showNpcModal({ campaign_id: campaignId, level: 1, status: 'alive' }, true, async () => { await loadList(); });
  });

  window.viewNpc = async id => {
    const npc = await api(`/api/npcs/${id}`);
    showNpcModal(npc, false, async () => { await loadList(); });
  };
  window.deleteNpc = async (id) => {
    confirmModal('Delete this NPC?', async () => {
      await api(`/api/npcs/${id}`, 'DELETE');
      await loadList();
      toast('NPC deleted', 'info');
    });
  };
};

function showNpcModal(npc, isNew, onSave) {
  const body = document.getElementById('modal-body');
  body.innerHTML = `
    <h2 style="color:var(--accent);margin-bottom:16px">${isNew && !npc.id ? 'New NPC' : npc.name || 'NPC'}</h2>
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
        <select id="f-status">
          ${['alive','dead','unknown'].map(s=>`<option ${npc.status===s?'selected':''}>${s}</option>`).join('')}
        </select></div>
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
      campaign_id: npc.campaign_id, name: v('f-name'), race: v('f-race'), npc_class: v('f-class'),
      level: parseInt(v('f-level')), faction: v('f-faction'), region: v('f-region'),
      alignment: v('f-align'), status: v('f-status'), personality: v('f-personality'),
      ideal: v('f-ideal'), bond: v('f-bond'), flaw: v('f-flaw'),
      backstory: v('f-backstory'), notes: v('f-notes'),
      hp: npc.hp, ac: npc.ac, str_score: npc.str_score, dex_score: npc.dex_score,
      con_score: npc.con_score, int_score: npc.int_score, wis_score: npc.wis_score, cha_score: npc.cha_score,
    };
    if (npc.id) await api(`/api/npcs/${npc.id}`, 'PUT', payload);
    else await api('/api/npcs/', 'POST', payload);
    closeModal();
    await onSave();
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
  return `<div class="stat-block" style="margin-bottom:16px">
    <h3>${n.name} — ${n.race||''} ${n.npc_class||''} ${n.level}</h3>
    <div style="font-size:12px;color:var(--muted);margin-bottom:8px">
      AC ${n.ac||'—'} · HP ${n.hp||'—'} · ${n.alignment||''}
    </div>
    <div class="stat-row">
      ${['STR','DEX','CON','INT','WIS','CHA'].map((s,i)=>{
        const key=['str_score','dex_score','con_score','int_score','wis_score','cha_score'][i];
        const val = n[key]||10;
        return `<div class="stat-box"><div class="stat-label">${s}</div><div class="stat-val">${val}</div><div class="stat-mod">${MOD(val)}</div></div>`;
      }).join('')}
    </div>
  </div>`;
}

function v(id) { return document.getElementById(id)?.value || ''; }
