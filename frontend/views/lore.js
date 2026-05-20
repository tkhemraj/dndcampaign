'use strict';
window.renderLoreView = async function(campaignId) {
  const el = document.getElementById('content');
  el.innerHTML = `
    <div class="view-header">
      <h1>📖 Lore & Notes</h1>
      <div class="view-actions">
        <button class="btn btn-purple" id="btn-wm-ref">🌍 Wildemount Ref</button>
        <button class="btn btn-primary" id="btn-new-lore">+ Add Entry</button>
      </div>
    </div>

    <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:16px" id="lore-tabs">
      ${[['','All'],['location','Locations'],['faction','Factions'],['deity','Deities'],['history','History'],['misc','Misc']].map(([c,l]) => `
        <button class="btn btn-sm lore-tab ${c === '' ? 'btn-primary' : 'btn-secondary'}" data-cat="${c}">${l}</button>`).join('')}
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

    // Filter out session entries from the lore view (they live on the dashboard)
    const visible = entries.filter(e => e.category !== 'session');

    if (!visible.length) {
      el2.innerHTML = `<div class="empty-state">
        <div class="empty-state-icon">📖</div>
        <div class="empty-state-title">${filterCat ? `No ${filterCat} entries yet` : 'No lore entries yet'}</div>
        <div class="empty-state-sub">Add world notes, faction details, deity lore, or historical records. Or pull from the Wildemount Reference.</div>
      </div>`;
      return;
    }

    el2.innerHTML = `<div class="card-grid">${visible.map(e => `
      <div class="card" onclick="openLoreModal(${e.id})" style="cursor:pointer">
        <div style="display:flex;align-items:flex-start;gap:8px;margin-bottom:8px">
          <strong style="color:var(--accent);flex:1;font-size:14px">${e.title}</strong>
          <span class="chip" style="flex-shrink:0">${e.category}</span>
        </div>
        <p style="color:var(--muted);font-size:12px;line-height:1.5">
          ${(e.content||'').slice(0,160)}${(e.content?.length||0)>160?'…':''}
        </p>
        ${e.tags ? `<div style="margin-top:8px;font-size:11px;color:var(--accent2)">${e.tags}</div>` : ''}
      </div>`).join('')}</div>`;
  };
  await loadList();

  document.querySelectorAll('.lore-tab').forEach(btn => {
    btn.addEventListener('click', async () => {
      filterCat = btn.dataset.cat;
      document.querySelectorAll('.lore-tab').forEach(b => {
        b.className = `btn btn-sm lore-tab ${b.dataset.cat === filterCat ? 'btn-primary' : 'btn-secondary'}`;
      });
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
    <h2 style="font-family:'Cinzel',serif;color:var(--accent);margin-bottom:16px">${isNew && !e.id ? 'New Entry' : e.title || 'Entry'}</h2>
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
    <div style="display:flex;gap:8px;margin-top:16px">
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
    <h2 style="font-family:'Cinzel',serif;color:var(--accent);margin-bottom:20px">🌍 Wildemount Reference</h2>

    <div class="section-title">Factions</div>
    ${ref.factions.map(f => `
      <div class="card" style="margin-bottom:8px">
        <div style="display:flex;align-items:baseline;gap:10px;margin-bottom:4px">
          <strong style="color:var(--accent);font-family:'Cinzel',serif">${f.name}</strong>
          <span class="chip">${f.region}</span>
          <span class="chip">${f.alignment}</span>
        </div>
        <p style="font-size:12px;color:var(--muted);margin-bottom:8px;line-height:1.5">${f.description}</p>
        <details>
          <summary style="font-size:11px;color:var(--accent2);cursor:pointer;user-select:none">Plot hooks (${f.hooks.length})</summary>
          <ul style="margin:8px 0 0 16px;font-size:12px;color:var(--muted)">
            ${f.hooks.map(h=>`<li style="margin-bottom:4px">${h}</li>`).join('')}
          </ul>
        </details>
      </div>`).join('')}

    <div class="section-title" style="margin-top:20px">Regions</div>
    ${Object.entries(ref.regions).map(([name, r]) => `
      <div class="card" style="margin-bottom:8px">
        <strong style="color:var(--accent);font-family:'Cinzel',serif">${name}</strong>
        <p style="font-size:12px;color:var(--muted);margin:6px 0 8px;line-height:1.5">${r.description}</p>
        <div style="display:flex;gap:4px;flex-wrap:wrap">
          ${r.locations.map(l=>`<span class="chip">${l}</span>`).join('')}
        </div>
      </div>`).join('')}

    <div class="section-title" style="margin-top:20px">Deities</div>
    <div class="card-grid" style="margin-bottom:16px">
      ${ref.deities.map(d => `
        <div class="card">
          <div style="font-family:'Cinzel',serif;color:var(--accent);font-weight:600;margin-bottom:4px">${d.name}</div>
          <div style="display:flex;gap:4px;margin-bottom:6px">
            <span class="chip">${d.domain}</span>
            <span class="chip">${d.alignment}</span>
          </div>
          <p style="font-size:12px;color:var(--muted);line-height:1.45">${d.description}</p>
        </div>`).join('')}
    </div>

    <div class="section-title">Wildemount Subclasses</div>
    ${ref.subclasses.map(s => `
      <div style="padding:8px 0;border-bottom:1px solid var(--border)">
        <div style="display:flex;align-items:baseline;gap:8px;margin-bottom:4px">
          <strong style="color:var(--accent2)">${s.name}</strong>
          <span class="chip">${s.class}</span>
        </div>
        <p style="font-size:12px;color:var(--muted);line-height:1.45">${s.description}</p>
      </div>`).join('')}

    <div class="section-title" style="margin-top:20px">Plot Seeds</div>
    <div style="display:flex;flex-direction:column;gap:6px">
      ${ref.plot_seeds.map(s => `
        <div style="padding:8px 12px;background:var(--surface2);border-radius:var(--radius-sm);border-left:3px solid var(--accent-dim);font-size:12px;color:var(--muted);line-height:1.5">${s}</div>`).join('')}
    </div>
  `;
  openModal();
}
