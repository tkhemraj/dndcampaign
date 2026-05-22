'use strict';

const _DIFF_COLORS = {
  easy:   'var(--ok)',
  medium: 'var(--warn)',
  hard:   '#e07030',
  deadly: 'var(--crit)',
};

window.renderDashboardView = async function(campaignId) {
  const el = document.getElementById('content');

  // ── No campaign selected: splash screen ──────────────────────────────────
  if (!campaignId) {
    el.innerHTML = `
      <div class="splash">
        <div class="splash-inner">
          <div class="splash-badge">⚔</div>
          <h1 class="splash-title">D&D Campaign<br>Generator</h1>
          <p class="splash-tagline">
            Everything a Dungeon Master needs — procedurally generated,<br>
            locally run, zero subscriptions.
          </p>

          <div class="splash-features">
            ${[
              ['🗺', 'Procedural Maps',     'Dungeons, wilderness & towns'],
              ['👥', 'Rich NPCs',            'Full backstory, secrets & stats'],
              ['📜', 'Quest Hooks',          'Three-act structures with twists'],
              ['⚔',  'Encounter Builder',   'Tactical combat with XP budgets'],
              ['📖', 'Wildemount Lore',      'Factions, deities & locations'],
              ['🎵', 'Live Music',           'Synthesised scores, no files'],
            ].map(([icon, name, desc]) => `
              <div class="splash-feat">
                <div class="splash-feat-icon">${icon}</div>
                <div class="splash-feat-name">${name}</div>
                <div class="splash-feat-desc">${desc}</div>
              </div>
            `).join('')}
          </div>

          <button class="btn btn-primary splash-cta" id="btn-splash-new">
            + Create Your First Campaign
          </button>
          <p class="splash-footer">No internet required · No external APIs · No subscriptions</p>
        </div>
      </div>`;
    document.getElementById('btn-splash-new').addEventListener('click', showNewCampaignModal);
    return;
  }

  // ── Loading placeholder ───────────────────────────────────────────────────
  el.innerHTML = `<div class="loading-overlay"><div class="spinner spinner-lg"></div></div>`;

  // ── Fetch all data in parallel ────────────────────────────────────────────
  const [campaign, npcs, quests, encounters, maps, sessions] = await Promise.all([
    api(`/api/campaigns/${campaignId}`),
    api(`/api/npcs/?campaign_id=${campaignId}`),
    api(`/api/quests/?campaign_id=${campaignId}`),
    api(`/api/encounters/?campaign_id=${campaignId}`),
    api(`/api/maps/?campaign_id=${campaignId}`),
    api(`/api/lore/?campaign_id=${campaignId}&category=session`),
  ]);

  const sortedSessions  = sessions.sort((a,b) => b.created_at.localeCompare(a.created_at));
  const activeQuests    = quests.filter(q => q.status === 'active');
  const aliveNpcs       = npcs.filter(n => n.status === 'alive');
  const lastSession     = sortedSessions[0];
  const activeEncounter = encounters.find(e => e.status === 'active');

  // ── Render ────────────────────────────────────────────────────────────────
  el.innerHTML = `

    <div class="view-header">
      <div>
        <h1>${campaign.name}</h1>
        <span class="subtitle">
          ${campaign.setting}${campaign.created_at ? ` · Started ${campaign.created_at.slice(0,10)}` : ''}${lastSession ? ` · Last session ${lastSession.created_at.slice(0,10)}` : ''}
        </span>
      </div>
      <div class="view-actions">
        <button class="btn btn-secondary btn-sm" id="btn-edit-campaign">⚙ Edit</button>
      </div>
    </div>

    ${campaign.description ? `
      <p class="dash-desc">${campaign.description}</p>
    ` : ''}

    ${activeEncounter ? `
      <div class="dash-combat-alert" onclick="navigate('encounters')">
        <span class="dash-combat-pulse"></span>
        <span style="font-size:20px">⚔</span>
        <div style="flex:1">
          <div class="dash-combat-title">Active Encounter — ${activeEncounter.name}</div>
          <div class="dash-combat-sub">Combat is in progress · Click to manage initiative</div>
        </div>
        <span class="dash-combat-arrow">→</span>
      </div>
    ` : ''}

    <!-- Summary stat cards -->
    <div class="summary-grid">
      <div class="summary-card" style="border-top-color:var(--ok)">
        <div class="summary-icon">👥</div>
        <div class="summary-label">NPCs</div>
        <div class="summary-val" style="color:var(--ok)">${npcs.length}</div>
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
        <div class="summary-val" style="color:var(--crit)">${encounters.length}</div>
        <div class="summary-sub">${encounters.filter(e=>e.status==='completed').length} completed</div>
      </div>
      <div class="summary-card" style="border-top-color:var(--accent2)">
        <div class="summary-icon">📓</div>
        <div class="summary-label">Sessions</div>
        <div class="summary-val" style="color:var(--accent2)">${sortedSessions.length}</div>
        <div class="summary-sub">${maps.length} map${maps.length !== 1 ? 's' : ''} generated</div>
      </div>
    </div>

    <!-- Quick nav strip -->
    <div class="dash-nav-strip">
      <button class="dns-btn" onclick="navigate('maps')">      <span>🗺</span> Maps</button>
      <button class="dns-btn" onclick="navigate('npcs')">      <span>👥</span> NPCs</button>
      <button class="dns-btn" onclick="navigate('quests')">    <span>📜</span> Quests</button>
      <button class="dns-btn" onclick="navigate('encounters')"> <span>⚔</span> Encounters</button>
      <button class="dns-btn" onclick="navigate('lore')">      <span>📖</span> Lore</button>
      <button class="dns-btn" onclick="navigate('music')">     <span>🎵</span> Music</button>
      <button class="dns-btn dns-btn-accent" id="btn-log-session-strip"><span>📓</span> Log Session</button>
    </div>

    <!-- Two-column main layout -->
    <div class="dash-layout">

      <!-- Left: quests + sessions -->
      <div class="dash-main">

        <div class="section-title">
          Active Quests
          ${activeQuests.length ? `<span style="color:var(--accent);font-size:11px;margin-left:2px">${activeQuests.length}</span>` : ''}
        </div>

        ${activeQuests.length ? `
          <div class="dash-quests">
            ${activeQuests.slice(0,5).map(q => `
              <div class="dash-qi" onclick="navigate('quests')">
                <div class="dash-qi-bar" style="background:${_DIFF_COLORS[q.difficulty]||'var(--border)'}"></div>
                <div class="dash-qi-body">
                  <div class="dash-qi-header">
                    <span class="dash-qi-title">${q.title}</span>
                    <span class="badge badge-${q.difficulty}">${q.difficulty}</span>
                  </div>
                  ${q.faction ? `<span class="chip" style="margin:2px 0 4px;display:inline-block">${q.faction}</span>` : ''}
                  ${q.description ? `<p class="dash-qi-desc">${q.description.slice(0,160)}${q.description.length>160?'…':''}</p>` : ''}
                </div>
              </div>`).join('')}
            ${activeQuests.length > 5 ? `
              <div class="dash-more" onclick="navigate('quests')">+ ${activeQuests.length - 5} more quests →</div>
            ` : ''}
          </div>
        ` : `
          <p class="dash-empty-row">
            No active quests.
            <span class="dash-empty-link" onclick="navigate('quests')">Generate some →</span>
          </p>
        `}

        <div class="section-title" style="margin-top:28px">
          Session Journal
          <button class="btn btn-secondary btn-sm" id="btn-log-session-inline" style="margin-left:6px;font-size:11px">+ Log</button>
        </div>

        ${sortedSessions.length ? `
          <div class="session-timeline">
            ${sortedSessions.slice(0,4).map(s => `
              <div class="session-node">
                <div class="session-node-content">
                  <div class="session-node-header">
                    <span class="session-node-date">${s.created_at?.slice(0,10)}</span>
                    <span class="session-node-title">${s.title}</span>
                    <div class="session-node-actions">
                      <button class="btn btn-secondary btn-sm sess-edit-btn" data-id="${s.id}">Edit</button>
                      <button class="btn btn-danger btn-sm sess-del-btn" data-id="${s.id}" data-title="${s.title.replace(/"/g,'&quot;')}">✕</button>
                    </div>
                  </div>
                  ${s.content ? `<p class="session-node-text">${s.content.slice(0,200)}${s.content.length>200?'…':''}</p>` : ''}
                </div>
              </div>`).join('')}
            ${sortedSessions.length > 4 ? `
              <div class="dash-more" onclick="navigate('lore')">+ ${sortedSessions.length - 4} more sessions →</div>
            ` : ''}
          </div>
        ` : `
          <p class="dash-empty-row">
            No sessions logged yet.
            <span class="dash-empty-link" id="btn-log-session-empty">Log your first →</span>
          </p>
        `}

      </div><!-- /.dash-main -->

      <!-- Right: NPC panel -->
      <div class="dash-panel">
        <div class="dash-panel-header">
          <span>NPCs</span>
          <span onclick="navigate('npcs')" style="cursor:pointer;color:var(--accent);font-size:10px;font-weight:600;letter-spacing:0">View all →</span>
        </div>
        <div class="dash-panel-body">
          ${npcs.length ? npcs.slice(0,10).map(n => {
            const initials = n.name.trim().split(/\s+/).map(w=>w[0]).join('').slice(0,2).toUpperCase();
            const meta = [n.race, n.npc_class, n.level > 1 ? `Lvl ${n.level}` : ''].filter(Boolean).join(' · ');
            return `
              <div class="npc-roster-item status-${n.status}" onclick="navigate('npcs')">
                <div class="nri-avatar">${initials}</div>
                <div class="nri-info">
                  <div class="nri-name">${n.name}</div>
                  <div class="nri-meta">${meta || '—'}${n.faction ? ` · ${n.faction}` : ''}</div>
                </div>
                <div class="nri-dot ${n.status}"></div>
              </div>`;
          }).join('') : `
            <div style="padding:20px;text-align:center;color:var(--muted);font-size:13px">
              No NPCs yet.<br>
              <span style="color:var(--accent);cursor:pointer" onclick="navigate('npcs')">Generate some →</span>
            </div>
          `}
          ${npcs.length > 10 ? `<div class="dash-more" style="padding:6px 4px" onclick="navigate('npcs')">+ ${npcs.length-10} more →</div>` : ''}
        </div>
      </div>

    </div><!-- /.dash-layout -->
  `;

  // ── Wire buttons ───────────────────────────────────────────────────────────
  document.getElementById('btn-edit-campaign').addEventListener('click', () => showNewCampaignModal(campaign));

  document.querySelectorAll('.sess-edit-btn').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      const sess = sortedSessions.find(s => s.id === parseInt(btn.dataset.id));
      if (sess) _editSessionModal(sess, () => renderDashboardView(campaignId));
    });
  });
  document.querySelectorAll('.sess-del-btn').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      confirmModal(`Delete "${btn.dataset.title}"?`, async () => {
        await api(`/api/lore/${btn.dataset.id}`, 'DELETE');
        toast('Session deleted', 'info');
        await renderDashboardView(campaignId);
      });
    });
  });

  const openLogSession = () => _showLogSessionModal(campaignId, sortedSessions.length, () => renderDashboardView(campaignId));

  document.getElementById('btn-log-session-strip').addEventListener('click', openLogSession);
  document.getElementById('btn-log-session-inline').addEventListener('click', openLogSession);
  document.getElementById('btn-log-session-empty')?.addEventListener('click', openLogSession);
};

// ── Session log modal ─────────────────────────────────────────────────────────
function _editSessionModal(sess, onSave) {
  const body = document.getElementById('modal-body');
  body.innerHTML = `
    <h2 style="font-family:'Cinzel',serif;color:var(--accent);margin-bottom:20px">📓 Edit Session</h2>
    <div class="form-group">
      <label>Title</label>
      <input id="sess-title" value="${sess.title}"/>
    </div>
    <div class="form-group">
      <label>What happened?</label>
      <textarea id="sess-content" style="min-height:180px">${sess.content || ''}</textarea>
    </div>
    <div style="display:flex;gap:8px;margin-top:20px">
      <button class="btn btn-primary"   id="btn-save-sess">Save</button>
      <button class="btn btn-secondary" id="btn-cancel-sess">Cancel</button>
    </div>`;
  openModal();
  setTimeout(() => document.getElementById('sess-content').focus(), 60);
  document.getElementById('btn-cancel-sess').addEventListener('click', closeModal);
  document.getElementById('btn-save-sess').addEventListener('click', async () => {
    const title   = document.getElementById('sess-title').value.trim() || sess.title;
    const content = document.getElementById('sess-content').value.trim();
    const btn     = document.getElementById('btn-save-sess');
    btn.disabled  = true; btn.innerHTML = '<span class="spinner"></span>';
    try {
      await api(`/api/lore/${sess.id}`, 'PUT', {
        campaign_id: sess.campaign_id, title, category: 'session',
        content, tags: sess.tags || '',
      });
      closeModal();
      toast('Session updated', 'success');
      await onSave();
    } catch(_) {
      toast('Save failed', 'error');
      btn.disabled = false; btn.textContent = 'Save';
    }
  });
}

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
