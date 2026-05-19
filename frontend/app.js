'use strict';
// ---------------------------------------------------------------------------
// App shell — routing, campaign selector, API helper, modal helpers
// ---------------------------------------------------------------------------

window._activeCampaignId = null;

// ── API helper ──────────────────────────────────────────────────────────────
window.api = async function(url, method = 'GET', body = null) {
  const opts = { method, headers: { 'Content-Type': 'application/json' } };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(url, opts);
  if (res.status === 204) return null;
  if (!res.ok) { const t = await res.text(); console.error(url, res.status, t); throw new Error(t); }
  return res.json();
};

// ── Toast notifications ─────────────────────────────────────────────────────
window.toast = function(msg, type = 'info', duration = 3000) {
  const container = document.getElementById('toast-container');
  const el = document.createElement('div');
  el.className = `toast toast-${type}`;
  el.style.setProperty('--toast-delay', `${duration / 1000 - 0.3}s`);
  el.textContent = msg;
  container.appendChild(el);
  el.addEventListener('animationend', e => { if (e.animationName === 'toastOut') el.remove(); });
};

// ── Modal helpers ───────────────────────────────────────────────────────────
window.openModal  = () => document.getElementById('modal-overlay').classList.remove('hidden');
window.closeModal = () => document.getElementById('modal-overlay').classList.add('hidden');
document.getElementById('modal-close').addEventListener('click', closeModal);
document.getElementById('modal-overlay').addEventListener('click', e => { if (e.target === document.getElementById('modal-overlay')) closeModal(); });

// ── Router ──────────────────────────────────────────────────────────────────
const VIEWS = {
  dashboard:  (cid) => renderDashboardView(cid),
  maps:       (cid) => renderMapsView(cid),
  npcs:       (cid) => renderNpcsView(cid),
  quests:     (cid) => renderQuestsView(cid),
  encounters: (cid) => renderEncountersView(cid),
  lore:       (cid) => renderLoreView(cid),
  music:      ()    => renderMusicView(),
};

let _activeView = 'dashboard';
function navigate(view) {
  _activeView = view;
  document.querySelectorAll('#nav-links li').forEach(li => {
    li.classList.toggle('active', li.dataset.view === view);
  });
  VIEWS[view]?.(_activeCampaignId);
}
document.querySelectorAll('#nav-links li').forEach(li => {
  li.addEventListener('click', () => navigate(li.dataset.view));
});

// ── Campaign selector ───────────────────────────────────────────────────────
async function loadCampaigns() {
  const campaigns = await api('/api/campaigns/');
  const sel = document.getElementById('campaign-select');
  const prev = sel.value;
  sel.innerHTML = '<option value="">— Select Campaign —</option>' +
    campaigns.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
  if (prev) sel.value = prev;
  if (_activeCampaignId) sel.value = _activeCampaignId;
}

document.getElementById('campaign-select').addEventListener('change', async e => {
  _activeCampaignId = e.target.value ? parseInt(e.target.value) : null;
  navigate(_activeView);
});

document.getElementById('btn-new-campaign').addEventListener('click', () => showNewCampaignModal());

window.showNewCampaignModal = function(existing = null) {
  const body = document.getElementById('modal-body');
  body.innerHTML = `
    <h2 style="color:var(--accent);margin-bottom:16px">${existing ? 'Edit Campaign' : 'New Campaign'}</h2>
    <div class="form-group"><label>Name</label><input id="c-name" value="${existing?.name || ''}"/></div>
    <div class="form-group"><label>Setting</label>
      <select id="c-setting">
        ${['Wildemount','Forgotten Realms','Greyhawk','Homebrew','Tal\'Dorei','Ravenloft'].map(s=>
          `<option ${(existing?.setting||'Wildemount')===s?'selected':''}>${s}</option>`).join('')}
      </select></div>
    <div class="form-group"><label>Description</label><textarea id="c-desc">${existing?.description||''}</textarea></div>
    <div style="display:flex;gap:8px;margin-top:16px">
      <button class="btn btn-primary" id="btn-save-c">Save</button>
      ${existing ? `<button class="btn btn-danger" id="btn-del-c">Delete Campaign</button>` : ''}
    </div>
  `;
  openModal();
  document.getElementById('btn-save-c').addEventListener('click', async () => {
    const payload = { name: document.getElementById('c-name').value,
      setting: document.getElementById('c-setting').value,
      description: document.getElementById('c-desc').value };
    let campaign;
    if (existing) {
      campaign = await api(`/api/campaigns/${existing.id}`, 'PUT', payload);
    } else {
      campaign = await api('/api/campaigns/', 'POST', payload);
      _activeCampaignId = campaign.id;
    }
    closeModal();
    await loadCampaigns();
    document.getElementById('campaign-select').value = campaign.id;
    navigate(_activeView);
  });
  if (existing) {
    document.getElementById('btn-del-c').addEventListener('click', async () => {
      if (!confirm(`Delete "${existing.name}" and all its content?`)) return;
      await api(`/api/campaigns/${existing.id}`, 'DELETE');
      _activeCampaignId = null;
      closeModal();
      await loadCampaigns();
      navigate('dashboard');
    });
  }
};

// ── Init ─────────────────────────────────────────────────────────────────────
(async () => {
  await loadCampaigns();
  navigate('dashboard');
})();
