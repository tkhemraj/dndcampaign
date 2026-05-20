'use strict';
window.renderQuestsView = async function(campaignId) {
  const el = document.getElementById('content');
  el.innerHTML = `
    <div class="view-header">
      <h1>📜 Quests</h1>
      <div class="view-actions">
        <button class="btn btn-primary" id="btn-new-q">+ Add Quest</button>
      </div>
    </div>

    <div class="card" style="margin-bottom:16px">
      <div style="display:grid;grid-template-columns:1fr 1fr auto;gap:12px;align-items:end">
        <div class="form-group" style="margin-bottom:0"><label>Region</label>
          <select id="q-region">
            <option value="">Any</option>
            <option>Western Wynandir</option><option>Xhorhas</option>
            <option>Menagerie Coast</option><option>Greying Wildlands</option><option>Eiselcross</option>
          </select>
        </div>
        <div class="form-group" style="margin-bottom:0"><label>Faction</label>
          <select id="q-faction">
            <option value="">Any</option>
            <option>Dwendalian Empire</option><option>Cerberus Assembly</option>
            <option>Kryn Dynasty</option><option>Cobalt Soul</option>
            <option>The Revelry</option><option>The Myriad</option>
          </select>
        </div>
        <button class="btn btn-purple" id="btn-do-gen-q">⚙ Generate Hook</button>
      </div>
    </div>

    <div style="display:flex;gap:6px;margin-bottom:16px" id="quest-tabs">
      ${[['active','Active'],['completed','Completed'],['failed','Failed'],['','All']].map(([s,l]) => `
        <button class="btn btn-sm quest-tab ${s === 'active' ? 'btn-primary' : 'btn-secondary'}" data-status="${s}">${l}</button>`).join('')}
    </div>

    <div id="quest-list"></div>
  `;

  let filterStatus = 'active';

  const loadList = async () => {
    const params = new URLSearchParams();
    if (campaignId)  params.set('campaign_id', campaignId);
    if (filterStatus) params.set('status', filterStatus);
    const quests = await api(`/api/quests/?${params}`);
    const el2 = document.getElementById('quest-list');

    if (!quests.length) {
      const label = filterStatus || 'quests';
      el2.innerHTML = `<div class="empty-state">
        <div class="empty-state-icon">📜</div>
        <div class="empty-state-title">No ${label} quests</div>
        <div class="empty-state-sub">${filterStatus === 'active'
          ? 'Generate a faction-aware plot hook above, or add one manually.'
          : `No ${label} quests to show.`}</div>
      </div>`;
      return;
    }

    el2.innerHTML = `<div class="card-grid">${quests.map(q => `
      <div class="quest-card diff-${q.difficulty}" onclick="openQuestModal(${q.id})">
        <div style="display:flex;align-items:flex-start;gap:8px;margin-bottom:8px">
          <strong style="color:var(--accent);flex:1;font-size:14px;line-height:1.3">${q.title}</strong>
          <span class="badge badge-${q.status}" style="flex-shrink:0">${q.status}</span>
        </div>
        <p style="color:var(--muted);font-size:12px;margin-bottom:10px;line-height:1.5">
          ${(q.description||'').slice(0,150)}${(q.description?.length||0)>150?'…':''}
        </p>
        <div style="display:flex;gap:6px;flex-wrap:wrap;align-items:center">
          ${q.faction ? `<span class="chip">${q.faction}</span>` : ''}
          ${q.region  ? `<span class="chip">${q.region}</span>`  : ''}
          <span class="badge badge-${q.difficulty}" style="margin-left:auto">${q.difficulty}</span>
        </div>
      </div>`).join('')}</div>`;
  };
  await loadList();

  document.querySelectorAll('.quest-tab').forEach(btn => {
    btn.addEventListener('click', async () => {
      filterStatus = btn.dataset.status;
      document.querySelectorAll('.quest-tab').forEach(b => {
        b.className = `btn btn-sm quest-tab ${b.dataset.status === filterStatus ? 'btn-primary' : 'btn-secondary'}`;
      });
      await loadList();
    });
  });

  document.getElementById('btn-do-gen-q').addEventListener('click', async () => {
    const region  = document.getElementById('q-region').value  || null;
    const faction = document.getElementById('q-faction').value || null;
    const params  = new URLSearchParams();
    if (campaignId) params.set('campaign_id', campaignId);
    if (region)     params.set('region', region);
    if (faction)    params.set('faction', faction);
    const btn = document.getElementById('btn-do-gen-q');
    btn.disabled = true; btn.innerHTML = '<span class="spinner"></span>';
    try {
      const q = await api(`/api/quests/generate?${params}`);
      openQuestEdit(q, true, async () => { await loadList(); });
    } finally {
      btn.disabled = false; btn.textContent = '⚙ Generate Hook';
    }
  });

  document.getElementById('btn-new-q').addEventListener('click', () => {
    openQuestEdit({ campaign_id: campaignId, status: 'active', difficulty: 'medium' }, true,
      async () => { await loadList(); });
  });

  window.openQuestModal = async id => {
    const q = await api(`/api/quests/${id}`);
    openQuestEdit(q, false, async () => { await loadList(); });
  };
};

function openQuestEdit(q, isNew, onSave) {
  const body = document.getElementById('modal-body');
  body.innerHTML = `
    <h2 style="font-family:'Cinzel',serif;color:var(--accent);margin-bottom:16px">${isNew && !q.id ? 'New Quest' : q.title || 'Quest'}</h2>
    <div class="form-group"><label>Title</label><input id="q-title" value="${q.title||''}"/></div>
    <div class="form-group"><label>Hook / Description</label>
      <textarea id="q-desc" style="min-height:120px">${q.description||''}</textarea>
    </div>
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
      title:       document.getElementById('q-title').value,
      description: document.getElementById('q-desc').value,
      faction:     document.getElementById('q-fact').value,
      region:      document.getElementById('q-reg').value,
      difficulty:  document.getElementById('q-diff').value,
      status:      document.getElementById('q-status').value,
      reward:      document.getElementById('q-reward').value,
      notes:       document.getElementById('q-notes').value,
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
