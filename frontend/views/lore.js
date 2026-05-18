'use strict';
window.renderLoreView = async function(campaignId) {
  const el = document.getElementById('content');
  el.innerHTML = `
    <div class="view-header">
      <h1>📖 Lore & Notes</h1>
      <div class="view-actions">
        <button class="btn btn-purple" id="btn-wm-ref">🌍 Wildemount Reference</button>
        <button class="btn btn-primary" id="btn-new-lore">+ Add Entry</button>
      </div>
    </div>
    <div id="lore-cat-tabs" style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px">
      ${['','location','faction','deity','history','misc'].map(c=>`
        <button class="btn btn-secondary btn-sm lore-tab" data-cat="${c}">${c||'All'}</button>`).join('')}
    </div>
    <div id="lore-list"></div>
  `;

  let filterCat = '';
  const loadList = async () => {
    const params = new URLSearchParams();
    if (campaignId) params.set('campaign_id', campaignId);
    if (filterCat) params.set('category', filterCat);
    const entries = await api(`/api/lore/?${params}`);
    const el2 = document.getElementById('lore-list');
    if (!entries.length) { el2.innerHTML = '<p style="color:var(--muted)">No entries yet.</p>'; return; }
    el2.innerHTML = `<div class="card-grid">${entries.map(e => `
      <div class="card" onclick="openLoreModal(${e.id})" style="cursor:pointer">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">
          <strong style="color:var(--accent);flex:1">${e.title}</strong>
          <span style="font-size:11px;color:var(--muted)">${e.category}</span>
        </div>
        <p style="color:var(--muted);font-size:12px">${(e.content||'').slice(0,150)}${(e.content?.length||0)>150?'…':''}</p>
        ${e.tags ? `<div style="margin-top:6px;font-size:11px;color:var(--accent2)">${e.tags}</div>` : ''}
      </div>`).join('')}</div>`;
  };
  await loadList();

  document.querySelectorAll('.lore-tab').forEach(btn => btn.addEventListener('click', async () => {
    filterCat = btn.dataset.cat;
    document.querySelectorAll('.lore-tab').forEach(b => b.classList.remove('btn-primary'));
    btn.classList.add('btn-primary');
    await loadList();
  }));

  document.getElementById('btn-new-lore').addEventListener('click', () => {
    openLoreEdit({ campaign_id: campaignId, category: 'misc' }, true, loadList);
  });

  document.getElementById('btn-wm-ref').addEventListener('click', async () => {
    const ref = await api('/api/lore/wildemount');
    showWildemountRef(ref);
  });

  window.openLoreModal = async id => {
    const e = await api(`/api/lore/${id}`);
    openLoreEdit(e, false, loadList);
  };
};

function openLoreEdit(e, isNew, onSave) {
  const body = document.getElementById('modal-body');
  body.innerHTML = `
    <h2 style="color:var(--accent);margin-bottom:16px">${isNew && !e.id ? 'New Entry' : 'Edit Entry'}</h2>
    <div class="form-group"><label>Title</label><input id="l-title" value="${e.title||''}"/></div>
    <div class="form-group"><label>Category</label>
      <select id="l-cat">${['location','faction','deity','history','misc'].map(c=>`<option ${e.category===c?'selected':''}>${c}</option>`).join('')}</select>
    </div>
    <div class="form-group"><label>Content</label><textarea id="l-content" style="min-height:200px">${e.content||''}</textarea></div>
    <div class="form-group"><label>Tags (comma-separated)</label><input id="l-tags" value="${e.tags||''}"/></div>
    <div style="display:flex;gap:8px;margin-top:16px">
      <button class="btn btn-primary" id="btn-save-l">Save</button>
      ${e.id ? `<button class="btn btn-danger" id="btn-del-l">Delete</button>` : ''}
    </div>
  `;
  openModal();
  document.getElementById('btn-save-l').addEventListener('click', async () => {
    const payload = { campaign_id: e.campaign_id, title: document.getElementById('l-title').value,
      category: document.getElementById('l-cat').value, content: document.getElementById('l-content').value,
      tags: document.getElementById('l-tags').value };
    if (e.id) await api(`/api/lore/${e.id}`, 'PUT', payload);
    else await api('/api/lore/', 'POST', payload);
    closeModal(); await onSave();
  });
  if (e.id) document.getElementById('btn-del-l').addEventListener('click', async () => {
    if (!confirm('Delete?')) return;
    await api(`/api/lore/${e.id}`, 'DELETE');
    closeModal(); await onSave();
  });
}

function showWildemountRef(ref) {
  const body = document.getElementById('modal-body');
  body.innerHTML = `
    <h2 style="color:var(--accent);margin-bottom:16px">🌍 Wildemount Reference</h2>
    <div class="section-title">Factions</div>
    ${ref.factions.map(f => `
      <div class="card" style="margin-bottom:8px">
        <strong style="color:var(--accent)">${f.name}</strong>
        <span style="color:var(--muted);font-size:11px;margin-left:8px">${f.region} · ${f.alignment}</span>
        <p style="font-size:12px;color:var(--muted);margin:4px 0">${f.description}</p>
        <details><summary style="font-size:11px;color:var(--accent2);cursor:pointer">Plot hooks</summary>
          <ul style="margin:6px 0 0 16px;font-size:12px;color:var(--muted)">${f.hooks.map(h=>`<li>${h}</li>`).join('')}</ul>
        </details>
      </div>`).join('')}
    <div class="section-title" style="margin-top:16px">Regions</div>
    ${Object.entries(ref.regions).map(([name, r]) => `
      <div class="card" style="margin-bottom:8px">
        <strong style="color:var(--accent)">${name}</strong>
        <p style="font-size:12px;color:var(--muted);margin:4px 0">${r.description}</p>
        <div style="font-size:11px;color:var(--accent2)">${r.locations.join(' · ')}</div>
      </div>`).join('')}
    <div class="section-title" style="margin-top:16px">Deities</div>
    ${ref.deities.map(d => `
      <div style="padding:6px 0;border-bottom:1px solid var(--border);font-size:12px">
        <strong style="color:var(--accent)">${d.name}</strong>
        <span style="color:var(--muted);margin:0 8px">${d.domain}</span>
        <span style="color:var(--muted)">${d.alignment}</span>
        <p style="color:var(--muted);margin-top:2px">${d.description}</p>
      </div>`).join('')}
    <div class="section-title" style="margin-top:16px">Wildemount Subclasses</div>
    ${ref.subclasses.map(s => `
      <div style="padding:6px 0;font-size:12px">
        <strong style="color:var(--accent2)">${s.name}</strong>
        <span style="color:var(--muted);margin-left:8px">${s.class}</span>
        <p style="color:var(--muted)">${s.description}</p>
      </div>`).join('')}
    <div class="section-title" style="margin-top:16px">Plot Seeds</div>
    <ul style="color:var(--muted);font-size:12px;margin-left:16px">${ref.plot_seeds.map(s=>`<li style="margin-bottom:6px">${s}</li>`).join('')}</ul>
  `;
  openModal();
}
