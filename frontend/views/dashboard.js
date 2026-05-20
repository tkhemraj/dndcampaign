'use strict';

window.renderDashboardView = async function(campaignId) {
  const el = document.getElementById('content');

  if (!campaignId) {
    el.innerHTML = `
      <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:70vh;gap:0;text-align:center">
        <div style="font-size:44px;margin-bottom:16px;opacity:0.6">⚔</div>
        <h1 style="font-family:'Cinzel Decorative',serif;font-size:22px;color:var(--accent);letter-spacing:0.04em;margin-bottom:6px">D&D Campaign Generator</h1>
        <p style="color:var(--muted);font-size:13px;margin-bottom:32px;max-width:380px;line-height:1.6">
          Procedural maps · NPC briefs · Quest hooks<br>
          Encounter builder · Live synthesised music
        </p>
        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:32px;max-width:400px;width:100%">
          ${[['🗺','Maps'],['👥','NPCs'],['📜','Quests'],['⚔','Encounters'],['📖','Lore'],['🎵','Music']].map(([icon,label])=>`
            <div style="background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);padding:12px 8px;text-align:center">
              <div style="font-size:20px;margin-bottom:4px">${icon}</div>
              <div style="font-size:11px;color:var(--muted);font-weight:600;text-transform:uppercase;letter-spacing:.05em">${label}</div>
            </div>`).join('')}
        </div>
        <button class="btn btn-primary" style="padding:10px 28px;font-size:14px" id="btn-splash-new">+ Create Campaign</button>
        <p style="color:var(--muted2);font-size:11px;margin-top:14px">All content generated locally · No external APIs · No subscriptions</p>
      </div>`;
    document.getElementById('btn-splash-new').addEventListener('click', showNewCampaignModal);
    return;
  }

  // ── Fetch all data in parallel ─────────────────────────────────────────────
  const [campaign, npcs, quests, encounters, maps, sessions] = await Promise.all([
    api(`/api/campaigns/${campaignId}`),
    api(`/api/npcs/?campaign_id=${campaignId}`),
    api(`/api/quests/?campaign_id=${campaignId}`),
    api(`/api/encounters/?campaign_id=${campaignId}`),
    api(`/api/maps/?campaign_id=${campaignId}`),
    api(`/api/lore/?campaign_id=${campaignId}&category=session`),
  ]);

  const sortedSessions = sessions.sort((a,b) => b.created_at.localeCompare(a.created_at));
  const activeQuests   = quests.filter(q => q.status === 'active');
  const aliveNpcs      = npcs.filter(n => n.status === 'alive');
  const lastSession    = sortedSessions[0];

  // ── Render ─────────────────────────────────────────────────────────────────
  el.innerHTML = `
    <div class="view-header">
      <div>
        <h1>${campaign.name}</h1>
        <span class="subtitle">
          ${campaign.setting} · Started ${campaign.created_at?.slice(0,10)}
          ${lastSession ? ` · Last session ${lastSession.created_at.slice(0,10)}` : ''}
        </span>
      </div>
      <div class="view-actions">
        <button class="btn btn-secondary btn-sm" id="btn-edit-campaign">Edit</button>
      </div>
    </div>
    ${campaign.description ? `<p style="color:var(--muted);margin-bottom:20px;font-size:13px;line-height:1.55">${campaign.description}</p>` : ''}

    <!-- Stat cards -->
    <div class="summary-grid">
      <div class="summary-card" style="border-top-color:var(--ok)">
        <div class="summary-icon">👥</div>
        <div class="summary-label">NPCs</div>
        <div class="summary-val">${npcs.length}</div>
        <div class="summary-sub">${aliveNpcs.length} alive · ${npcs.length - aliveNpcs.length} dead</div>
      </div>
      <div class="summary-card" style="border-top-color:var(--accent)">
        <div class="summary-icon">📜</div>
        <div class="summary-label">Active Quests</div>
        <div class="summary-val">${activeQuests.length}</div>
        <div class="summary-sub">${quests.filter(q=>q.status==='completed').length} completed</div>
      </div>
      <div class="summary-card" style="border-top-color:var(--crit)">
        <div class="summary-icon">⚔</div>
        <div class="summary-label">Encounters</div>
        <div class="summary-val">${encounters.length}</div>
        <div class="summary-sub">${encounters.filter(e=>e.status==='completed').length} completed</div>
      </div>
      <div class="summary-card" style="border-top-color:var(--accent2)">
        <div class="summary-icon">📓</div>
        <div class="summary-label">Sessions</div>
        <div class="summary-val">${sortedSessions.length}</div>
        <div class="summary-sub">${maps.length} map${maps.length !== 1 ? 's' : ''} generated</div>
      </div>
    </div>

    <!-- Quick actions -->
    <div class="section-title">Jump to</div>
    <div class="quick-actions" style="margin-bottom:28px">
      <button class="quick-btn" onclick="navigate('npcs')">
        <div class="quick-btn-icon">👥</div>
        <div class="quick-btn-label">NPCs</div>
      </button>
      <button class="quick-btn" onclick="navigate('quests')">
        <div class="quick-btn-icon">📜</div>
        <div class="quick-btn-label">Quests</div>
      </button>
      <button class="quick-btn" onclick="navigate('encounters')">
        <div class="quick-btn-icon">⚔</div>
        <div class="quick-btn-label">Encounters</div>
      </button>
      <button class="quick-btn" onclick="navigate('maps')">
        <div class="quick-btn-icon">🗺</div>
        <div class="quick-btn-label">Maps</div>
      </button>
      <button class="quick-btn" onclick="navigate('lore')">
        <div class="quick-btn-icon">📖</div>
        <div class="quick-btn-label">Lore</div>
      </button>
      <button class="quick-btn" onclick="navigate('music')">
        <div class="quick-btn-icon">🎵</div>
        <div class="quick-btn-label">Music</div>
      </button>
      <button class="quick-btn" id="btn-log-session-quick">
        <div class="quick-btn-icon">📓</div>
        <div class="quick-btn-label">Log Session</div>
      </button>
    </div>

    <!-- Active quests -->
    <div class="section-title">Active Quests</div>
    ${activeQuests.length
      ? activeQuests.slice(0,4).map(q=>`
          <div class="quest-card diff-${q.difficulty}" onclick="navigate('quests')" style="margin-bottom:8px">
            <div style="display:flex;align-items:flex-start;gap:10px">
              <div style="flex:1">
                <strong style="color:var(--accent)">${q.title}</strong>
                ${q.faction ? `<span class="chip" style="margin-left:8px">${q.faction}</span>` : ''}
                <p style="color:var(--muted);font-size:12px;margin-top:5px;line-height:1.45">
                  ${(q.description||'').slice(0,160)}${(q.description?.length||0)>160?'…':''}
                </p>
              </div>
              <span class="badge badge-${q.difficulty}" style="flex-shrink:0">${q.difficulty}</span>
            </div>
          </div>`).join('')
      : `<div style="color:var(--muted);font-size:13px;padding:6px 0 16px">
           No active quests. <span style="cursor:pointer;color:var(--accent);text-decoration:underline" onclick="navigate('quests')">Generate some →</span>
         </div>`}

    <!-- Session journal -->
    <div class="section-title" style="margin-top:28px">
      Session Journal
      <button class="btn btn-secondary btn-sm" id="btn-log-session-inline" style="margin-left:8px;font-size:11px">+ Log Session</button>
    </div>
    <div id="sessions-list">
      ${sortedSessions.length
        ? sortedSessions.slice(0,3).map(s=>`
            <div class="session-entry">
              <div class="session-date">${s.created_at?.slice(0,10)} &middot; ${s.title}</div>
              <div class="session-summary">${(s.content||'<em>No notes.</em>').slice(0,280)}${(s.content?.length||0)>280?'…':''}</div>
            </div>`).join('')
        : `<div style="color:var(--muted);font-size:13px;padding:6px 0">
             No sessions logged yet.
             <span style="cursor:pointer;color:var(--accent);text-decoration:underline" id="btn-log-session-empty">Log your first session →</span>
           </div>`}
    </div>

    <!-- Recent NPCs -->
    <div class="section-title" style="margin-top:28px">Recent NPCs</div>
    ${npcs.length
      ? `<div class="card-grid">
           ${npcs.slice(0,6).map(n=>`
             <div class="npc-card status-${n.status}" onclick="navigate('npcs')">
               <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">
                 <strong style="color:var(--accent);flex:1">${n.name}</strong>
                 <span class="badge badge-${n.status}">${n.status}</span>
               </div>
               <div style="font-size:12px;color:var(--muted)">
                 ${[n.race, n.npc_class, n.level > 1 ? `Lvl ${n.level}` : ''].filter(Boolean).join(' · ')||'—'}
               </div>
               ${n.faction ? `<span class="chip" style="margin-top:6px;display:inline-block">${n.faction}</span>` : ''}
               ${n.personality ? `<p style="font-size:11px;color:var(--muted);margin-top:7px;font-style:italic;line-height:1.4">
                 ${n.personality.slice(0,90)}${n.personality.length>90?'…':''}</p>` : ''}
             </div>`).join('')}
         </div>`
      : `<div style="color:var(--muted);font-size:13px;padding:6px 0">
           No NPCs yet. <span style="cursor:pointer;color:var(--accent);text-decoration:underline" onclick="navigate('npcs')">Generate some →</span>
         </div>`}
  `;

  // ── Wire buttons ───────────────────────────────────────────────────────────
  document.getElementById('btn-edit-campaign').addEventListener('click',
    () => showNewCampaignModal(campaign));

  const openLogSession = () => _showLogSessionModal(campaignId, sortedSessions.length, () => {
    renderDashboardView(campaignId);
  });

  document.getElementById('btn-log-session-quick').addEventListener('click', openLogSession);
  document.getElementById('btn-log-session-inline').addEventListener('click', openLogSession);
  document.getElementById('btn-log-session-empty')?.addEventListener('click', openLogSession);
};

// ── Session log modal ──────────────────────────────────────────────────────────
function _showLogSessionModal(campaignId, existingCount, onSave) {
  const n = existingCount + 1;
  const body = document.getElementById('modal-body');
  body.innerHTML = `
    <h2 style="font-family:'Cinzel',serif;color:var(--accent);margin-bottom:20px">📓 Log Session ${n}</h2>
    <div class="form-group">
      <label>Title</label>
      <input id="sess-title" value="Session ${n}" placeholder="Session ${n} — The Siege of Rexxentrum"/>
    </div>
    <div class="form-group">
      <label>What happened?</label>
      <textarea id="sess-content" style="min-height:180px"
        placeholder="Key events · Decisions made · Reveals · NPC moments · How it ended…"></textarea>
    </div>
    <div style="display:flex;gap:8px;margin-top:20px">
      <button class="btn btn-primary"   id="btn-save-sess">Save Session</button>
      <button class="btn btn-secondary" id="btn-cancel-sess">Cancel</button>
    </div>`;
  openModal();

  setTimeout(() => document.getElementById('sess-content').focus(), 60);

  document.getElementById('btn-cancel-sess').addEventListener('click', closeModal);
  document.getElementById('btn-save-sess').addEventListener('click', async () => {
    const title   = document.getElementById('sess-title').value.trim() || `Session ${n}`;
    const content = document.getElementById('sess-content').value.trim();
    const btn     = document.getElementById('btn-save-sess');
    btn.disabled  = true;
    btn.innerHTML = '<span class="spinner"></span>';
    try {
      await api('/api/lore/', 'POST', {
        campaign_id: campaignId,
        title,
        category: 'session',
        content:  content || '',
        tags:     String(n),
      });
      closeModal();
      toast(`${title} logged`, 'success');
      await onSave();
    } catch(e) {
      toast('Save failed', 'error');
      btn.disabled = false;
      btn.textContent = 'Save Session';
    }
  });
}
