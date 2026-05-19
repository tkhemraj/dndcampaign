'use strict';

let _activeEncounterId = null;
let _currentTurnIdx = 0;

window.renderEncountersView = async function(campaignId) {
  const el = document.getElementById('content');
  el.innerHTML = `
    <div class="view-header">
      <h1>⚔ Encounters</h1>
      <div class="view-actions">
        <button class="btn btn-purple" id="btn-gen-enc">⚙ Generate</button>
        <button class="btn btn-primary" id="btn-new-enc">+ New</button>
      </div>
    </div>
    <div id="gen-enc-panel" class="card" style="margin-bottom:16px">
      <div class="form-row">
        <div class="form-group"><label>Party Size</label><input id="enc-size" type="number" value="4" min="1" max="10"/></div>
        <div class="form-group"><label>Party Level</label><input id="enc-level" type="number" value="5" min="1" max="20"/></div>
        <div class="form-group"><label>Difficulty</label>
          <select id="enc-diff"><option>easy</option><option selected>medium</option><option>hard</option><option>deadly</option></select>
        </div>
        <div class="form-group" style="flex-direction:row;align-items:flex-end;gap:8px">
          <label style="white-space:nowrap"><input type="checkbox" id="enc-wm"/> Wildemount only</label>
          <button class="btn btn-primary" id="btn-do-gen-enc">Generate</button>
        </div>
      </div>
    </div>
    <div id="encounter-list" style="margin-bottom:24px"></div>
    <div id="combat-tracker"></div>
  `;

  const loadList = async () => {
    const url = campaignId ? `/api/encounters/?campaign_id=${campaignId}` : '/api/encounters/';
    const encs = await api(url);
    const el2 = document.getElementById('encounter-list');
    if (!encs.length) {
      el2.innerHTML = `<div class="empty-state">
        <div class="empty-state-icon">⚔</div>
        <div class="empty-state-title">No encounters yet</div>
        <div class="empty-state-sub">Generate a CR-balanced encounter or add one manually.</div>
      </div>`;
      return;
    }
    el2.innerHTML = `<div class="table-wrap"><table>
      <thead><tr><th>Name</th><th>Difficulty</th><th>Status</th><th></th></tr></thead>
      <tbody>${encs.map(e => `<tr>
        <td><strong>${e.name}</strong></td>
        <td><span class="badge badge-${e.difficulty}">${e.difficulty}</span></td>
        <td><span class="badge badge-${e.status}">${e.status}</span></td>
        <td style="display:flex;gap:4px">
          <button class="btn btn-secondary btn-sm" onclick="openCombatTracker(${e.id})">▶ Run</button>
          <button class="btn btn-danger btn-sm" onclick="deleteEnc(${e.id})">✕</button>
        </td>
      </tr>`).join('')}</tbody>
    </table></div>`;
  };
  await loadList();

  document.getElementById('btn-do-gen-enc').addEventListener('click', async () => {
    const size  = document.getElementById('enc-size').value;
    const level = document.getElementById('enc-level').value;
    const diff  = document.getElementById('enc-diff').value;
    const wm    = document.getElementById('enc-wm').checked;
    const cid   = campaignId ? `&campaign_id=${campaignId}` : '';
    const btn   = document.getElementById('btn-do-gen-enc');
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner"></span>';
    try {
      const enc = await api(`/api/encounters/generate?party_size=${size}&party_level=${level}&difficulty=${diff}&wildemount_only=${wm}${cid}`);
      const saved = await api('/api/encounters/', 'POST', { campaign_id: campaignId, name: enc.name, difficulty: enc.difficulty, notes: enc.notes });
      for (const c of (enc.combatants || [])) {
        await api(`/api/encounters/${saved.id}/combatants`, 'POST', c);
      }
      await loadList();
      openCombatTracker(saved.id);
      toast(`Encounter generated — ${enc.name}`, 'success');
    } finally {
      btn.disabled = false;
      btn.textContent = 'Generate';
    }
  });

  document.getElementById('btn-new-enc').addEventListener('click', () => {
    inputModal('New Encounter', [
      { id: 'name', label: 'Encounter Name', placeholder: 'e.g. Goblin Ambush', value: '' },
    ], async ({ name }) => {
      if (!name.trim()) return;
      const enc = await api('/api/encounters/', 'POST', { campaign_id: campaignId, name: name.trim() });
      await loadList();
      openCombatTracker(enc.id);
    });
  });

  window.deleteEnc = id => {
    confirmModal('Delete this encounter and all its combatants?', async () => {
      await api(`/api/encounters/${id}`, 'DELETE');
      if (_activeEncounterId === id) document.getElementById('combat-tracker').innerHTML = '';
      await loadList();
      toast('Encounter deleted', 'info');
    });
  };

  window.openCombatTracker = async id => {
    _activeEncounterId = id;
    _currentTurnIdx = 0;
    await refreshTracker();
    document.getElementById('combat-tracker').scrollIntoView({ behavior: 'smooth' });
  };
};

async function refreshTracker() {
  const enc = await api(`/api/encounters/${_activeEncounterId}`);
  const el = document.getElementById('combat-tracker');
  const combatants = (enc.combatants || []).sort((a, b) => b.initiative - a.initiative);

  el.innerHTML = `
    <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:14px">
      <h2 style="font-family:'Cinzel',serif;color:var(--accent)">⚔ ${enc.name}</h2>
      <span class="badge badge-${enc.difficulty}">${enc.difficulty}</span>
      <div style="display:flex;gap:6px;margin-left:auto;flex-wrap:wrap">
        <button class="btn btn-secondary btn-sm" id="btn-roll-init">🎲 Roll Initiative</button>
        <button class="btn btn-secondary btn-sm" id="btn-next-turn">▶ Next Turn</button>
        <button class="btn btn-secondary btn-sm" id="btn-add-combatant">+ Add</button>
        <select id="enc-status-sel" class="btn btn-secondary btn-sm">
          ${['planned','active','completed'].map(s=>`<option ${enc.status===s?'selected':''}>${s}</option>`).join('')}
        </select>
      </div>
    </div>
    <div id="combatant-list">${combatants.length
      ? combatants.map((c, i) => combatantRow(c, i === _currentTurnIdx % combatants.length)).join('')
      : `<p style="color:var(--muted);padding:12px 0">No combatants. Add some or generate an encounter above.</p>`
    }</div>
    ${enc.notes ? `<p style="color:var(--muted);font-size:12px;margin-top:10px">${enc.notes}</p>` : ''}
  `;

  document.getElementById('btn-roll-init').addEventListener('click', async () => {
    await api(`/api/encounters/${_activeEncounterId}/roll-initiative`, 'POST');
    _currentTurnIdx = 0;
    await refreshTracker();
    toast('Initiative rolled!', 'success');
  });

  document.getElementById('btn-next-turn').addEventListener('click', async () => {
    _currentTurnIdx++;
    await refreshTracker();
  });

  document.getElementById('enc-status-sel').addEventListener('change', async e => {
    await api(`/api/encounters/${_activeEncounterId}`, 'PUT',
      { name: enc.name, difficulty: enc.difficulty, status: e.target.value, notes: enc.notes });
    toast(`Status: ${e.target.value}`, 'info');
  });

  document.getElementById('btn-add-combatant').addEventListener('click', () => {
    inputModal('Add Combatant', [
      { id: 'name', label: 'Name',     placeholder: 'e.g. Goblin Archer' },
      { id: 'hp',   label: 'Max HP',   type: 'number', value: 10, min: 1 },
      { id: 'ac',   label: 'AC',       type: 'number', value: 12, min: 1 },
      { id: 'type', label: 'Type',     type: 'select', value: 'monster',
        options: [{ value: 'monster', label: '👹 Monster' }, { value: 'player', label: '🧙 Player' }] },
    ], async ({ name, hp, ac, type }) => {
      if (!name.trim()) return;
      await api(`/api/encounters/${_activeEncounterId}/combatants`, 'POST',
        { name: name.trim(), hp, max_hp: hp, ac, combatant_type: type });
      await refreshTracker();
    }, 'Add');
  });
}

function combatantRow(c, isActive) {
  const hpPct = Math.max(0, (c.hp / c.max_hp) * 100);
  const hpClass = hpPct <= 25 ? 'crit-low' : hpPct <= 50 ? 'low' : '';
  const dead = c.hp <= 0;
  const conditions = JSON.parse(c.conditions || '[]');

  return `<div class="combatant-row ${isActive ? 'active-turn' : ''} ${dead ? 'dead' : ''}">
    <div style="min-width:32px;text-align:center;font-size:17px;font-weight:700;color:var(--gold)">${c.initiative || '—'}</div>
    <div class="combatant-name" style="color:${c.combatant_type==='player'?'var(--accent)':'var(--text)'}">
      ${c.combatant_type === 'player' ? '🧙' : '👹'} ${c.name}
    </div>
    <div class="combatant-hp">
      <div style="font-size:12px">${c.hp}/${c.max_hp} HP</div>
      <div class="hp-bar"><div class="hp-fill ${hpClass}" style="width:${hpPct}%"></div></div>
    </div>
    <div style="min-width:50px;color:var(--muted);font-size:12px">AC ${c.ac}</div>
    <div class="conditions-wrap">${conditions.map(cond => `<span class="condition-tag">${cond}</span>`).join('')}</div>
    <div style="display:flex;gap:4px;margin-left:auto">
      <button class="btn btn-secondary btn-sm" onclick="hpEdit(${c.id},'${c.name}',${c.hp},${c.max_hp})">HP</button>
      <button class="btn btn-secondary btn-sm" onclick="initEdit(${c.id},'${c.name}',${c.initiative||0})">Init</button>
      <button class="btn btn-secondary btn-sm" onclick="condEdit(${c.id},'${c.conditions}')">Cond</button>
      <button class="btn btn-danger btn-sm"    onclick="removeCombatant(${_activeEncounterId},${c.id})">✕</button>
    </div>
    ${c.notes ? `<div style="width:100%;font-size:11px;color:var(--muted);padding-top:2px">${c.notes}</div>` : ''}
  </div>`;
}

window.hpEdit = (cid, name, currentHp, maxHp) => {
  hpModal(name, currentHp, maxHp, async delta => {
    await api(`/api/encounters/${_activeEncounterId}/hp`, 'PATCH', { combatant_id: cid, delta });
    await refreshTracker();
  });
};

window.initEdit = (cid, name, currentInit) => {
  inputModal(`Initiative — ${name}`, [
    { id: 'init', label: 'Initiative Roll', type: 'number', value: currentInit, min: 1 },
  ], async ({ init }) => {
    await api(`/api/encounters/${_activeEncounterId}/initiative`, 'PATCH', { combatant_id: cid, initiative: init });
    await refreshTracker();
  }, 'Set');
};

window.condEdit = (cid, condJson) => {
  const current = JSON.parse(condJson || '[]');
  conditionPickerModal(current, async conditions => {
    await api(`/api/encounters/${_activeEncounterId}/conditions`, 'PATCH', { combatant_id: cid, conditions });
    await refreshTracker();
  });
};

window.removeCombatant = async (eid, cid) => {
  await api(`/api/encounters/${eid}/combatants/${cid}`, 'DELETE');
  await refreshTracker();
};
