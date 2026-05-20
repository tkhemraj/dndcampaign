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
document.addEventListener('keydown', e => { if (e.key === 'Escape') { closeModal(); document.getElementById('confirm-overlay').classList.add('hidden'); } });

// ── Confirm dialog ──────────────────────────────────────────────────────────
window.confirmModal = function(msg, onConfirm, dangerous = true) {
  const overlay = document.getElementById('confirm-overlay');
  document.getElementById('confirm-msg').textContent = msg;

  const oldOk = document.getElementById('confirm-ok');
  const newOk = oldOk.cloneNode(true);
  newOk.className = `btn ${dangerous ? 'btn-danger' : 'btn-primary'} btn-sm`;
  newOk.textContent = dangerous ? 'Delete' : 'Confirm';
  oldOk.parentNode.replaceChild(newOk, oldOk);

  const oldCancel = document.getElementById('confirm-cancel');
  const newCancel = oldCancel.cloneNode(true);
  oldCancel.parentNode.replaceChild(newCancel, oldCancel);

  const close = () => overlay.classList.add('hidden');
  document.getElementById('confirm-ok').addEventListener('click',     () => { close(); onConfirm(); }, { once: true });
  document.getElementById('confirm-cancel').addEventListener('click', close, { once: true });
  overlay.addEventListener('click', e => { if (e.target === overlay) close(); }, { once: true });
  overlay.classList.remove('hidden');
};

// ── Input modal (replaces all prompt() calls) ───────────────────────────────
window.inputModal = function(title, fields, onSubmit, submitLabel = 'Save') {
  const body = document.getElementById('modal-body');
  body.innerHTML = `
    <h2 style="font-family:'Cinzel',serif;color:var(--accent);margin-bottom:20px">${title}</h2>
    ${fields.map(f => {
      if (f.type === 'select') return `
        <div class="form-group"><label>${f.label}</label>
        <select id="im-${f.id}">${(f.options || []).map(o => {
          const val = typeof o === 'object' ? o.value : o;
          const lbl = typeof o === 'object' ? o.label : o;
          return `<option value="${val}"${f.value === val ? ' selected' : ''}>${lbl}</option>`;
        }).join('')}</select></div>`;
      return `
        <div class="form-group"><label>${f.label}</label>
        <input id="im-${f.id}" type="${f.type || 'text'}" value="${f.value ?? ''}"
          placeholder="${f.placeholder || ''}"${f.min !== undefined ? ` min="${f.min}"` : ''}/></div>`;
    }).join('')}
    <div style="display:flex;gap:8px;margin-top:20px">
      <button class="btn btn-primary" id="im-submit">${submitLabel}</button>
      <button class="btn btn-secondary" id="im-cancel">Cancel</button>
    </div>`;
  openModal();

  const submit = () => {
    const result = {};
    fields.forEach(f => {
      const el = document.getElementById(`im-${f.id}`);
      result[f.id] = f.type === 'number' ? (parseInt(el.value) || 0) : (el.value || '');
    });
    closeModal();
    onSubmit(result);
  };

  document.getElementById('im-submit').addEventListener('click', submit);
  document.getElementById('im-cancel').addEventListener('click', closeModal);
  const textInputs = fields.filter(f => f.type !== 'select');
  if (textInputs.length) {
    document.getElementById(`im-${textInputs[textInputs.length - 1].id}`)
      ?.addEventListener('keydown', e => { if (e.key === 'Enter') submit(); });
  }
  setTimeout(() => document.getElementById(`im-${fields[0].id}`)?.focus(), 60);
};

// ── Condition picker modal ──────────────────────────────────────────────────
const _ALL_CONDITIONS = ['Blinded','Charmed','Deafened','Frightened','Grappled',
  'Incapacitated','Invisible','Paralyzed','Petrified','Poisoned','Prone',
  'Restrained','Stunned','Unconscious'];

window.conditionPickerModal = function(current, onSave) {
  const active = new Set(current);
  const body = document.getElementById('modal-body');
  body.innerHTML = `
    <h2 style="font-family:'Cinzel',serif;color:var(--accent);margin-bottom:16px">Conditions</h2>
    <p style="color:var(--muted);font-size:12px;margin-bottom:14px">Click to toggle. Active conditions are highlighted.</p>
    <div class="cond-chips">
      ${_ALL_CONDITIONS.map(c => `
        <div class="cond-chip${active.has(c) ? ' active' : ''}" data-cond="${c}">${c}</div>`).join('')}
    </div>
    <div style="display:flex;gap:8px;margin-top:4px">
      <button class="btn btn-primary" id="cond-save">Apply</button>
      <button class="btn btn-secondary btn-sm" id="cond-clear">Clear All</button>
      <button class="btn btn-secondary" id="cond-cancel" style="margin-left:auto">Cancel</button>
    </div>`;
  openModal();

  body.querySelectorAll('.cond-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      const c = chip.dataset.cond;
      if (active.has(c)) { active.delete(c); chip.classList.remove('active'); }
      else               { active.add(c);    chip.classList.add('active'); }
    });
  });
  document.getElementById('cond-clear').addEventListener('click', () => {
    active.clear();
    body.querySelectorAll('.cond-chip').forEach(c => c.classList.remove('active'));
  });
  document.getElementById('cond-save').addEventListener('click', () => { closeModal(); onSave([...active]); });
  document.getElementById('cond-cancel').addEventListener('click', closeModal);
};

// ── HP edit modal ───────────────────────────────────────────────────────────
window.hpModal = function(name, currentHp, maxHp, onApply) {
  const body = document.getElementById('modal-body');
  body.innerHTML = `
    <h2 style="font-family:'Cinzel',serif;color:var(--accent);margin-bottom:4px">${name}</h2>
    <p style="color:var(--muted);font-size:12px;margin-bottom:18px">${currentHp} / ${maxHp} HP</p>
    <div class="form-group">
      <label>Amount — positive to heal, negative to damage</label>
      <input id="hp-delta" type="number" value="" placeholder="e.g. -8 or 5"/>
    </div>
    <div class="hp-presets">
      ${[-20,-10,-5,-1].map(n=>`<button class="btn hp-preset dmg" data-v="${n}">${n}</button>`).join('')}
      ${[1,5,10,20].map(n=>`<button class="btn hp-preset heal" data-v="${n}">+${n}</button>`).join('')}
      <button class="btn hp-preset heal" data-v="${maxHp - currentHp}" style="margin-left:auto">Full Heal</button>
      <button class="btn hp-preset dmg"  data-v="${-currentHp}">Kill</button>
    </div>
    <div style="display:flex;gap:8px;margin-top:20px">
      <button class="btn btn-primary" id="hp-apply">Apply</button>
      <button class="btn btn-secondary" id="hp-cancel">Cancel</button>
    </div>`;
  openModal();

  const input = document.getElementById('hp-delta');
  body.querySelectorAll('.hp-preset').forEach(btn => {
    btn.addEventListener('click', () => { input.value = btn.dataset.v; input.focus(); });
  });

  const apply = () => {
    const delta = parseInt(input.value);
    if (!isNaN(delta) && delta !== 0) { closeModal(); onApply(delta); }
  };
  document.getElementById('hp-apply').addEventListener('click', apply);
  document.getElementById('hp-cancel').addEventListener('click', closeModal);
  input.addEventListener('keydown', e => { if (e.key === 'Enter') apply(); });
  setTimeout(() => input.focus(), 60);
};

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
  document.getElementById('content').dataset.view = view;
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
    document.getElementById('btn-del-c').addEventListener('click', () => {
      confirmModal(`Delete "${existing.name}" and all its content? This cannot be undone.`, async () => {
        await api(`/api/campaigns/${existing.id}`, 'DELETE');
        _activeCampaignId = null;
        closeModal();
        await loadCampaigns();
        navigate('dashboard');
        toast(`Campaign deleted`, 'info');
      });
    });
  }
};

// ── Player View share modal ─────────────────────────────────────────────────
document.getElementById('player-link').addEventListener('click', async () => {
  const body = document.getElementById('modal-body');
  body.innerHTML = `
    <h2 style="font-family:'Cinzel',serif;color:var(--accent);margin-bottom:6px">Share Player View</h2>
    <p style="color:var(--muted);font-size:12px;margin-bottom:20px">Give players one of these links. Both show live map &amp; combat updates from this session.</p>
    <div id="pv-loading" style="color:var(--muted);font-size:13px">Detecting LAN address…</div>
    <div id="pv-urls" class="hidden"></div>`;
  openModal();

  try {
    const info = await api('/api/live/host-info');
    document.getElementById('pv-loading').remove();
    document.getElementById('pv-urls').innerHTML = `
      <div class="pv-url-block">
        <div class="pv-url-label">Local network (LAN) — always works</div>
        <div class="pv-url-row">
          <input class="pv-url-input" readonly value="${info.local_url}" id="pv-local"/>
          <button class="btn btn-secondary btn-sm" onclick="navigator.clipboard.writeText('${info.local_url}').then(()=>{this.textContent='✓';setTimeout(()=>this.textContent='Copy',1500)})">Copy</button>
          <a class="btn btn-secondary btn-sm" href="${info.local_url}" target="_blank">Open</a>
        </div>
        <div class="pv-url-note">Players must be on the same WiFi / LAN as this machine.</div>
      </div>
      <div class="pv-url-block">
        <div class="pv-url-label">GitHub Pages — works anywhere (requires host param)</div>
        <div class="pv-url-row">
          <input class="pv-url-input" readonly value="${info.gh_url}" id="pv-gh"/>
          <button class="btn btn-secondary btn-sm" onclick="navigator.clipboard.writeText('${info.gh_url}').then(()=>{this.textContent='✓';setTimeout(()=>this.textContent='Copy',1500)})">Copy</button>
          <a class="btn btn-secondary btn-sm" href="${info.gh_url}" target="_blank">Open</a>
        </div>
        <div class="pv-url-note">⚠ Browser may block HTTP→HTTPS connections. If it doesn't load, use the LAN link above.</div>
      </div>`;
    document.getElementById('pv-urls').classList.remove('hidden');
  } catch(e) {
    document.getElementById('pv-loading').textContent = 'Could not detect server address. Is the backend running?';
  }
});

// ── Init ─────────────────────────────────────────────────────────────────────
(async () => {
  await loadCampaigns();
  navigate('dashboard');
})();
