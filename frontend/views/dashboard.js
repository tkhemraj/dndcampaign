'use strict';
window.renderDashboardView = async function(campaignId) {
  const el = document.getElementById('content');
  if (!campaignId) {
    el.innerHTML = `
      <div style="display:flex;align-items:center;justify-content:center;height:60vh;flex-direction:column;gap:16px;text-align:center">
        <div style="font-size:48px">⚔</div>
        <h1 style="color:var(--accent);font-size:28px">D&D Campaign Generator</h1>
        <p style="color:var(--muted);max-width:440px">Select a campaign from the sidebar or create a new one to get started.<br>Generate maps, NPCs, quests, and encounters — all with Wildemount flavour baked in.</p>
        <button class="btn btn-primary" id="btn-splash-new">+ Create Campaign</button>
      </div>`;
    document.getElementById('btn-splash-new').addEventListener('click', showNewCampaignModal);
    return;
  }

  const [campaign, npcs, quests, encounters, maps] = await Promise.all([
    api(`/api/campaigns/${campaignId}`),
    api(`/api/npcs/?campaign_id=${campaignId}`),
    api(`/api/quests/?campaign_id=${campaignId}`),
    api(`/api/encounters/?campaign_id=${campaignId}`),
    api(`/api/maps/?campaign_id=${campaignId}`),
  ]);

  const activeQuests = quests.filter(q => q.status === 'active').length;

  el.innerHTML = `
    <div class="view-header">
      <div>
        <h1>${campaign.name}</h1>
        <span class="subtitle">${campaign.setting} · Started ${campaign.created_at?.slice(0,10)}</span>
      </div>
      <div class="view-actions">
        <button class="btn btn-secondary" id="btn-edit-campaign">Edit</button>
      </div>
    </div>
    ${campaign.description ? `<p style="color:var(--muted);margin-bottom:16px">${campaign.description}</p>` : ''}

    <div class="summary-grid">
      <div class="summary-card"><div class="summary-label">NPCs</div><div class="summary-val">${npcs.length}</div><div class="summary-sub">${npcs.filter(n=>n.status==='alive').length} alive</div></div>
      <div class="summary-card"><div class="summary-label">Active Quests</div><div class="summary-val">${activeQuests}</div><div class="summary-sub">${quests.length} total</div></div>
      <div class="summary-card"><div class="summary-label">Encounters</div><div class="summary-val">${encounters.length}</div><div class="summary-sub">${encounters.filter(e=>e.status==='completed').length} completed</div></div>
      <div class="summary-card"><div class="summary-label">Maps</div><div class="summary-val">${maps.length}</div></div>
    </div>

    <div class="section-title">Active Quests</div>
    ${quests.filter(q=>q.status==='active').slice(0,4).map(q=>`
      <div class="card" style="margin-bottom:8px;display:flex;align-items:flex-start;gap:12px">
        <div style="flex:1">
          <strong style="color:var(--accent)">${q.title}</strong>
          <p style="color:var(--muted);font-size:12px;margin-top:4px">${q.description?.slice(0,160)||''}</p>
        </div>
        <span class="badge-${q.difficulty}">${q.difficulty}</span>
      </div>`).join('') || '<p style="color:var(--muted)">No active quests.</p>'}

    <div class="section-title">Recent NPCs</div>
    <div class="card-grid">
      ${npcs.slice(0,6).map(n=>`
        <div class="card">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px">
            <strong style="color:var(--accent)">${n.name}</strong>
            <span class="badge badge-${n.status}">${n.status}</span>
          </div>
          <div style="font-size:12px;color:var(--muted)">${n.race||''} ${n.npc_class||''} ${n.level}</div>
          ${n.faction ? `<div style="font-size:11px;color:var(--accent2)">${n.faction}</div>` : ''}
        </div>`).join('')}
    </div>
  `;

  document.getElementById('btn-edit-campaign').addEventListener('click', () => showNewCampaignModal(campaign));
};
