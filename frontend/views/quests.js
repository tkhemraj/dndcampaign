'use strict';
window.renderQuestsView = async function(campaignId) {
  const el = document.getElementById('content');
  el.innerHTML = `
    <div class="view-header">
      <h1>📜 Quests</h1>
      <div class="view-actions">
        <button class="btn btn-purple" id="btn-gen-q">⚙ Generate Hook</button>
        <button class="btn btn-primary" id="btn-new-q">+ Add Quest</button>
      </div>
    </div>
    <div id="quest-gen-panel" class="card" style="margin-bottom:16px">
      <div class="form-row">
        <div class="form-group"><label>Region</label>
          <select id="q-region"><option value="">Any</option>
            <option>Western Wynandir</option><option>Xhorhas</option>
            <option>Menagerie Coast</option><option>Greying Wildlands</option><option>Eiselcross</option>
          </select></div>
        <div class="form-group"><label>Faction</label>
          <select id="q-faction"><option value="">Any</option>
            <option>Dwendalian Empire</option><option>Cerberus Assembly</option>
            <option>Kryn Dynasty</option><option>Cobalt Soul</option>
            <option>The Revelry</option><option>The Myriad</option>
          </select></div>
        <div class="form-group" style="justify-content:flex-end">
          <button class="btn btn-primary" id="btn-do-gen-q">Generate</button>
        </div>
      </div>
    </div>
    <div id="quest-tabs" style="display:flex;gap:8px;margin-bottom:12px">
      ${['active','completed','failed'].map(s=>`<button class="btn btn-secondary btn-sm quest-tab" data-status="${s}">${s}</button>`).join('')}
      <button class="btn btn-secondary btn-sm quest-tab" data-status="">All</button>
    </div>
    <div id="quest-list"></div>
  `;

  let filterStatus = 'active';
  const loadList = async () => {
    const params = new URLSearchParams();
    if (campaignId) params.set('campaign_id', campaignId);
    if (filterStatus) params.set('status', filterStatus);
    const quests = await api(`/api/quests/?${params}`);
    const el2 = document.getElementById('quest-list');
    if (!quests.length) { el2.innerHTML = '<p style="color:var(--muted)">No quests.</p>'; return; }
    el2.innerHTML = `<div class="card-grid">${quests.map(q => `
      <div class="card" onclick="openQuestModal(${q.id})" style="cursor:pointer">
        <div style="display:flex;align-items:flex-start;gap:8px;margin-bottom:8px">
          <strong style="flex:1;color:var(--accent)">${q.title}</strong>
          <span class="badge badge-${q.status}">${q.status}</span>
        </div>
        <p style="color:var(--muted);font-size:12px;margin-bottom:8px">${q.description?.slice(0,120)||''}${(q.description?.length||0)>120?'…':''}</p>
        <div style="display:flex;gap:8px;flex-wrap:wrap;font-size:11px;color:var(--muted)">
          ${q.faction ? `<span>🏛 ${q.faction}</span>` : ''}
          ${q.region  ? `<span>📍 ${q.region}</span>`  : ''}
          <span class="badge-${q.difficulty}">${q.difficulty}</span>
        </div>
      </div>`).join('')}</div>`;
  };
  await loadList();

  document.querySelectorAll('.quest-tab').forEach(btn => btn.addEventListener('click', async () => {
    filterStatus = btn.dataset.status;
    document.querySelectorAll('.quest-tab').forEach(b => b.classList.remove('btn-primary'));
    btn.classList.add('btn-primary');
    await loadList();
  }));

  document.getElementById('btn-do-gen-q').addEventListener('click', async () => {
    const region  = document.getElementById('q-region').value || null;
    const faction = document.getElementById('q-faction').value || null;
    const params  = new URLSearchParams();
    if (campaignId) params.set('campaign_id', campaignId);
    if (region) params.set('region', region);
    if (faction) params.set('faction', faction);
    const q = await api(`/api/quests/generate?${params}`);
    openQuestEdit(q, true, async () => { await loadList(); });
  });

  document.getElementById('btn-new-q').addEventListener('click', () => {
    openQuestEdit({ campaign_id: campaignId, status: 'active', difficulty: 'medium' }, true, async () => { await loadList(); });
  });

  window.openQuestModal = async id => {
    const q = await api(`/api/quests/${id}`);
    openQuestEdit(q, false, async () => { await loadList(); });
  };
};

function openQuestEdit(q, isNew, onSave) {
  const body = document.getElementById('modal-body');
  body.innerHTML = `
    <h2 style="color:var(--accent);margin-bottom:16px">${isNew && !q.id ? 'New Quest' : 'Edit Quest'}</h2>
    <div class="form-group"><label>Title</label><input id="q-title" value="${q.title||''}"/></div>
    <div class="form-group"><label>Description / Hook</label><textarea id="q-desc" style="min-height:100px">${q.description||''}</textarea></div>
    <div class="form-row">
      <div class="form-group"><label>Faction</label><input id="q-fact" value="${q.faction||''}"/></div>
      <div class="form-group"><label>Region</label><input id="q-reg" value="${q.region||''}"/></div>
    </div>
    <div class="form-row">
      <div class="form-group"><label>Difficulty</label>
        <select id="q-diff">${['easy','medium','hard','deadly'].map(d=>`<option ${q.difficulty===d?'selected':''}>${d}</option>`).join('')}</select>
      </div>
      <div class="form-group"><label>Status</label>
        <select id="q-status">${['active','completed','failed','abandoned'].map(s=>`<option ${q.status===s?'selected':''}>${s}</option>`).join('')}</select>
      </div>
    </div>
    <div class="form-group"><label>Reward</label><textarea id="q-reward">${q.reward||''}</textarea></div>
    <div class="form-group"><label>Notes</label><textarea id="q-notes">${q.notes||''}</textarea></div>
    <div style="display:flex;gap:8px;margin-top:16px">
      <button class="btn btn-primary" id="btn-save-q">Save</button>
      ${q.id ? `<button class="btn btn-danger" id="btn-del-q">Delete</button>` : ''}
    </div>
  `;
  openModal();
  document.getElementById('btn-save-q').addEventListener('click', async () => {
    const payload = {
      campaign_id: q.campaign_id,
      title: document.getElementById('q-title').value,
      description: document.getElementById('q-desc').value,
      faction: document.getElementById('q-fact').value,
      region: document.getElementById('q-reg').value,
      difficulty: document.getElementById('q-diff').value,
      status: document.getElementById('q-status').value,
      reward: document.getElementById('q-reward').value,
      notes: document.getElementById('q-notes').value,
    };
    if (q.id) await api(`/api/quests/${q.id}`, 'PUT', payload);
    else await api('/api/quests/', 'POST', payload);
    closeModal(); await onSave();
    toast(q.id ? 'Quest saved' : 'Quest created', 'success');
  });
  if (q.id) {
    document.getElementById('btn-del-q').addEventListener('click', () => {
      confirmModal(`Delete "${q.title}"?`, async () => {
        await api(`/api/quests/${q.id}`, 'DELETE');
        closeModal(); await onSave();
        toast('Quest deleted', 'info');
      });
    });
  }
}
