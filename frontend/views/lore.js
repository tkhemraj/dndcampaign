'use strict';

const _LORE_CATS = [
  { key:'',         icon:'◈', label:'All'       },
  { key:'location', icon:'📍', label:'Locations' },
  { key:'faction',  icon:'⚔', label:'Factions'  },
  { key:'deity',    icon:'✦', label:'Deities'   },
  { key:'history',  icon:'📜', label:'History'   },
  { key:'misc',     icon:'◌', label:'Misc'      },
];

const _LORE_CAT_COLORS = {
  location: 'var(--accent)',
  faction:  'var(--crit)',
  deity:    '#a070e0',
  history:  '#c09040',
  misc:     'var(--muted)',
};

window.renderLoreView = async function(campaignId) {
  const el = document.getElementById('content');
  el.innerHTML = `
    <div class="view-header">
      <div>
        <h1>Lore & Notes</h1>
        <span class="subtitle">World knowledge, factions & history</span>
      </div>
      <div class="view-actions">
        <button class="btn btn-purple" id="btn-wm-ref">🌍 Wildemount Ref</button>
        <button class="btn btn-primary" id="btn-new-lore">+ Add Entry</button>
      </div>
    </div>

    <div class="filter-pills" id="lore-tabs">
      ${_LORE_CATS.map(c => `
        <button class="filter-pill${c.key === '' ? ' active' : ''}" data-cat="${c.key}">
          <span class="filter-pill-icon">${c.icon}</span> ${c.label}
        </button>`).join('')}
    </div>

    <div id="lore-list"></div>
  `;

  let filterCat = '';

  const loadList = async () => {
    const params = new URLSearchParams();
    if (campaignId) params.set('campaign_id', campaignId);
    if (filterCat)  params.set('category', filterCat);
    const entries = await api(`/api/lore/?${params}`);
    const el2 = document.getElementById('lore-list');

    const visible = entries.filter(e => e.category !== 'session');

    if (!visible.length) {
      el2.innerHTML = `<div class="empty-state">
        <div class="empty-state-icon">📖</div>
        <div class="empty-state-title">${filterCat ? `No ${filterCat} entries yet` : 'No lore entries yet'}</div>
        <div class="empty-state-sub">Add world notes, faction details, deity lore, or historical records. Or pull from the Wildemount Reference.</div>
      </div>`;
      return;
    }

    el2.innerHTML = `<div class="lore-grid">${visible.map(e => {
      const catColor = _LORE_CAT_COLORS[e.category] || 'var(--muted)';
      const catIcon  = (_LORE_CATS.find(c => c.key === e.category)||{}).icon || '◌';
      return `
        <div class="lore-card" onclick="openLoreModal(${e.id})" style="border-top-color:${catColor}">
          <div class="lore-card-header">
            <div class="lore-card-cat-icon" style="color:${catColor}">${catIcon}</div>
            <div class="lore-card-title">${e.title}</div>
            <span class="chip lore-cat-chip">${e.category}</span>
          </div>
          <p class="lore-card-body">${(e.content||'').slice(0,180)}${(e.content?.length||0)>180?'…':''}</p>
          ${e.tags ? `<div class="lore-card-tags">${e.tags.split(',').map(t=>`<span class="chip">${t.trim()}</span>`).join('')}</div>` : ''}
        </div>`;
    }).join('')}</div>`;
  };
  await loadList();

  document.querySelectorAll('.filter-pill').forEach(btn => {
    btn.addEventListener('click', async () => {
      filterCat = btn.dataset.cat;
      document.querySelectorAll('.filter-pill').forEach(b =>
        b.classList.toggle('active', b.dataset.cat === filterCat));
      await loadList();
    });
  });

  document.getElementById('btn-new-lore').addEventListener('click', () => {
    openLoreEdit({ campaign_id: campaignId, category: filterCat || 'misc' }, true, loadList);
  });

  document.getElementById('btn-wm-ref').addEventListener('click', async () => {
    const btn = document.getElementById('btn-wm-ref');
    btn.disabled = true; btn.innerHTML = '<span class="spinner"></span>';
    try {
      const ref = await api('/api/lore/wildemount');
      showWildemountRef(ref);
    } finally {
      btn.disabled = false; btn.textContent = '🌍 Wildemount Ref';
    }
  });

  window.openLoreModal = async id => {
    const e = await api(`/api/lore/${id}`);
    openLoreEdit(e, false, loadList);
  };
};

function openLoreEdit(e, isNew, onSave) {
  const body = document.getElementById('modal-body');
  body.innerHTML = `
    <h2 class="modal-title">${isNew && !e.id ? 'New Entry' : e.title || 'Entry'}</h2>
    <div class="form-group"><label>Title</label><input id="l-title" value="${e.title||''}"/></div>
    <div class="form-group"><label>Category</label>
      <select id="l-cat">${['location','faction','deity','history','misc'].map(c=>
        `<option ${e.category===c?'selected':''}>${c}</option>`).join('')}
      </select>
    </div>
    <div class="form-group"><label>Content</label>
      <textarea id="l-content" style="min-height:220px">${e.content||''}</textarea>
    </div>
    <div class="form-group"><label>Tags (comma-separated)</label>
      <input id="l-tags" value="${e.tags||''}"/>
    </div>
    <div class="modal-actions">
      <button class="btn btn-primary" id="btn-save-l">Save</button>
      ${e.id ? `<button class="btn btn-danger" id="btn-del-l">Delete</button>` : ''}
    </div>
  `;
  openModal();
  setTimeout(() => document.getElementById('l-title').focus(), 60);

  document.getElementById('btn-save-l').addEventListener('click', async () => {
    const payload = {
      campaign_id: e.campaign_id,
      title:    document.getElementById('l-title').value,
      category: document.getElementById('l-cat').value,
      content:  document.getElementById('l-content').value,
      tags:     document.getElementById('l-tags').value,
    };
    if (e.id) await api(`/api/lore/${e.id}`, 'PUT', payload);
    else await api('/api/lore/', 'POST', payload);
    closeModal(); await onSave();
    toast(e.id ? 'Entry saved' : 'Entry created', 'success');
  });

  if (e.id) {
    document.getElementById('btn-del-l').addEventListener('click', () => {
      confirmModal(`Delete "${e.title}"?`, async () => {
        await api(`/api/lore/${e.id}`, 'DELETE');
        closeModal(); await onSave();
        toast('Entry deleted', 'info');
      });
    });
  }
}

function showWildemountRef(ref) {
  const body = document.getElementById('modal-body');
  body.innerHTML = `
    <h2 class="modal-title">🌍 Wildemount Reference</h2>

    <div class="wm-section-title">Factions</div>
    ${ref.factions.map(f => `
      <div class="wm-card">
        <div class="wm-card-header">
          <strong class="wm-card-name">${f.name}</strong>
          <span class="chip">${f.region}</span>
          <span class="chip">${f.alignment}</span>
        </div>
        <p class="wm-card-desc">${f.description}</p>
        <details class="wm-details">
          <summary>Plot hooks (${f.hooks.length})</summary>
          <ul class="wm-hooks">
            ${f.hooks.map(h=>`<li>${h}</li>`).join('')}
          </ul>
        </details>
      </div>`).join('')}

    <div class="wm-section-title">Regions</div>
    ${Object.entries(ref.regions).map(([name, r]) => `
      <div class="wm-card">
        <strong class="wm-card-name">${name}</strong>
        <p class="wm-card-desc">${r.description}</p>
        <div class="wm-chips">
          ${r.locations.map(l=>`<span class="chip">${l}</span>`).join('')}
        </div>
      </div>`).join('')}

    <div class="wm-section-title">Deities</div>
    <div class="wm-deity-grid">
      ${ref.deities.map(d => `
        <div class="wm-deity-card">
          <div class="wm-deity-name">${d.name}</div>
          <div class="wm-chips" style="margin-bottom:6px">
            <span class="chip">${d.domain}</span>
            <span class="chip">${d.alignment}</span>
          </div>
          <p class="wm-card-desc">${d.description}</p>
        </div>`).join('')}
    </div>

    <div class="wm-section-title">Wildemount Subclasses</div>
    ${ref.subclasses.map(s => `
      <div class="wm-subclass">
        <div class="wm-subclass-header">
          <strong class="wm-subclass-name">${s.name}</strong>
          <span class="chip">${s.class}</span>
        </div>
        <p class="wm-card-desc">${s.description}</p>
      </div>`).join('')}

    <div class="wm-section-title">Plot Seeds</div>
    <div class="wm-seeds">
      ${ref.plot_seeds.map(s => `<div class="wm-seed">${s}</div>`).join('')}
    </div>
  `;
  openModal();
}
