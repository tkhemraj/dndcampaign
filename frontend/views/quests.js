'use strict';

const _Q_DIFF_COLORS = {
  easy:   'var(--ok)',
  medium: 'var(--warn)',
  hard:   '#e07030',
  deadly: 'var(--crit)',
};

const _Q_STATUS_ICONS = { active:'⚔', completed:'✓', failed:'✗', abandoned:'◌' };

window.renderQuestsView = async function(campaignId) {
  const el = document.getElementById('content');
  el.innerHTML = `
    <div class="view-header">
      <div>
        <h1>Quests</h1>
        <span class="subtitle">Plot hooks, missions & objectives</span>
      </div>
      <div class="view-actions">
        <button class="btn btn-primary" id="btn-new-q">+ Add Quest</button>
      </div>
    </div>

    <div class="gen-panel">
      <div class="gen-panel-fields">
        <div class="form-group" style="margin-bottom:0">
          <label>Region</label>
          <select id="q-region">
            <option value="">Any region</option>
            <option>Western Wynandir</option><option>Xhorhas</option>
            <option>Menagerie Coast</option><option>Greying Wildlands</option><option>Eiselcross</option>
          </select>
        </div>
        <div class="form-group" style="margin-bottom:0">
          <label>Faction</label>
          <select id="q-faction">
            <option value="">Any faction</option>
            <option>Dwendalian Empire</option><option>Cerberus Assembly</option>
            <option>Kryn Dynasty</option><option>Cobalt Soul</option>
            <option>The Revelry</option><option>The Myriad</option>
          </select>
        </div>
      </div>
      <button class="btn btn-purple gen-panel-btn" id="btn-do-gen-q">⚙ Generate Hook</button>
    </div>

    <div class="filter-pills" id="quest-tabs">
      ${[['active','⚔ Active'],['completed','✓ Completed'],['failed','✗ Failed'],['','All']].map(([s,l]) => `
        <button class="filter-pill${s === 'active' ? ' active' : ''}" data-status="${s}">${l}</button>`).join('')}
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
      el2.innerHTML = `<div class="empty-state">
        <div class="empty-state-icon">📜</div>
        <div class="empty-state-title">No ${filterStatus || ''} quests</div>
        <div class="empty-state-sub">${filterStatus === 'active'
          ? 'Generate a faction-aware plot hook above, or add one manually.'
          : `No ${filterStatus} quests to show.`}</div>
      </div>`;
      return;
    }

    el2.innerHTML = `<div class="quest-list-stack">${quests.map(q => `
      <div class="quest-item" onclick="openQuestModal(${q.id})">
        <div class="quest-item-bar" style="background:${_Q_DIFF_COLORS[q.difficulty]||'var(--border)'}"></div>
        <div class="quest-item-body">
          <div class="quest-item-header">
            <span class="quest-item-title">${q.title}</span>
            <div class="quest-item-badges">
              <span class="badge badge-${q.status}">${_Q_STATUS_ICONS[q.status]||''} ${q.status}</span>
              <span class="badge badge-${q.difficulty}">${q.difficulty}</span>
            </div>
          </div>
          <div class="quest-item-chips">
            ${q.faction ? `<span class="chip">${q.faction}</span>` : ''}
            ${q.region  ? `<span class="chip">${q.region}</span>`  : ''}
          </div>
          ${q.description ? `<p class="quest-item-desc">${q.description.slice(0,200)}${q.description.length>200?'…':''}</p>` : ''}
          ${q.reward ? `<div class="quest-item-reward">💰 ${q.reward.slice(0,100)}${q.reward.length>100?'…':''}</div>` : ''}
        </div>
        <div class="quest-item-arrow">→</div>
      </div>`).join('')}</div>`;
  };
  await loadList();

  document.querySelectorAll('.filter-pill').forEach(btn => {
    btn.addEventListener('click', async () => {
      filterStatus = btn.dataset.status;
      document.querySelectorAll('.filter-pill').forEach(b =>
        b.classList.toggle('active', b.dataset.status === filterStatus));
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
    btn.disabled = true; btn.innerHTML = '<span class="spinner"></span> Generating…';
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
    <h2 class="modal-title">${isNew && !q.id ? 'New Quest' : q.title || 'Quest'}</h2>
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
    <div class="modal-actions">
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
