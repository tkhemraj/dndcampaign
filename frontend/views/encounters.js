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
    if (!encs.length) { el2.innerHTML = '<p style="color:var(--muted)">No encounters yet.</p>'; return; }
    el2.innerHTML = `<div class="table-wrap"><table>
      <thead><tr><th>Name</th><th>Difficulty</th><th>Status</th><th></th></tr></thead>
      <tbody>${encs.map(e => `<tr>
        <td><strong>${e.name}</strong></td>
        <td><span class="badge-${e.difficulty}">${e.difficulty}</span></td>
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
    const enc   = await api(`/api/encounters/generate?party_size=${size}&party_level=${level}&difficulty=${diff}&wildemount_only=${wm}${cid}`);
    // Auto-save it
    const saved = await api('/api/encounters/', 'POST', { campaign_id: campaignId, name: enc.name, difficulty: enc.difficulty, notes: enc.notes });
    for (const c of (enc.combatants || [])) {
      await api(`/api/encounters/${saved.id}/combatants`, 'POST', c);
    }
    await loadList();
    openCombatTracker(saved.id);
  });

  document.getElementById('btn-new-enc').addEventListener('click', async () => {
    const name = prompt('Encounter name:');
    if (!name) return;
    const enc = await api('/api/encounters/', 'POST', { campaign_id: campaignId, name });
    await loadList();
    openCombatTracker(enc.id);
  });

  window.deleteEnc = async id => {
    if (!confirm('Delete encounter?')) return;
    await api(`/api/encounters/${id}`, 'DELETE');
    if (_activeEncounterId === id) document.getElementById('combat-tracker').innerHTML = '';
    await loadList();
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
    <div style="display:flex;align-items:center;gap:12px;margin-bottom:12px">
      <h2 style="color:var(--accent)">⚔ ${enc.name}</h2>
      <span class="badge badge-${enc.difficulty}">${enc.difficulty}</span>
      <button class="btn btn-secondary btn-sm" id="btn-roll-init">🎲 Roll Initiative</button>
      <button class="btn btn-secondary btn-sm" id="btn-next-turn">▶ Next Turn</button>
      <button class="btn btn-primary btn-sm" id="btn-add-combatant">+ Add</button>
      <select id="enc-status-sel" class="btn btn-secondary btn-sm">
        ${['planned','active','completed'].map(s=>`<option ${enc.status===s?'selected':''}>${s}</option>`).join('')}
      </select>
    </div>
    <div id="combatant-list">${combatants.map((c, i) => combatantRow(c, i === _currentTurnIdx % combatants.length)).join('')}</div>
    <p style="color:var(--muted);font-size:12px;margin-top:8px">${enc.notes||''}</p>
  `;

  document.getElementById('btn-roll-init').addEventListener('click', async () => {
    await api(`/api/encounters/${_activeEncounterId}/roll-initiative`, 'POST');
    _currentTurnIdx = 0;
    await refreshTracker();
  });

  document.getElementById('btn-next-turn').addEventListener('click', async () => {
    _currentTurnIdx++;
    await refreshTracker();
  });

  document.getElementById('enc-status-sel').addEventListener('change', async e => {
    await api(`/api/encounters/${_activeEncounterId}`, 'PUT', { name: enc.name, difficulty: enc.difficulty, status: e.target.value, notes: enc.notes });
  });

  document.getElementById('btn-add-combatant').addEventListener('click', async () => {
    const name = prompt('Name:'); if (!name) return;
    const hp = parseInt(prompt('Max HP:', '10') || '10');
    const ac = parseInt(prompt('AC:', '12') || '12');
    const type = confirm('Player character? (Cancel = monster)') ? 'player' : 'monster';
    await api(`/api/encounters/${_activeEncounterId}/combatants`, 'POST', { name, hp, max_hp: hp, ac, combatant_type: type });
    await refreshTracker();
  });
}

function combatantRow(c, isActive) {
  const hpPct = Math.max(0, (c.hp / c.max_hp) * 100);
  const hpClass = hpPct <= 25 ? 'crit-low' : hpPct <= 50 ? 'low' : '';
  const dead = c.hp <= 0;
  const conditions = JSON.parse(c.conditions || '[]');
  const ALL_CONDITIONS = ['Blinded','Charmed','Deafened','Frightened','Grappled','Incapacitated','Invisible','Paralyzed','Petrified','Poisoned','Prone','Restrained','Stunned','Unconscious'];

  return `<div class="combatant-row ${isActive ? 'active-turn' : ''} ${dead ? 'dead' : ''}">
    <div style="min-width:30px;text-align:center;font-size:18px;color:var(--gold)">${c.initiative || '—'}</div>
    <div class="combatant-name ${c.combatant_type === 'player' ? 'player' : ''}"
         style="color:${c.combatant_type==='player'?'var(--accent)':'var(--text)'}">
      ${c.combatant_type === 'player' ? '🧙' : '👹'} ${c.name}
    </div>
    <div class="combatant-hp">
      <div>${c.hp}/${c.max_hp} HP</div>
      <div class="hp-bar"><div class="hp-fill ${hpClass}" style="width:${hpPct}%"></div></div>
    </div>
    <div style="min-width:50px;color:var(--muted);font-size:12px">AC ${c.ac}</div>
    <div class="conditions-wrap">${conditions.map(cond => `<span class="condition-tag">${cond}</span>`).join('')}</div>
    <div style="display:flex;gap:4px;margin-left:auto">
      <button class="btn btn-secondary btn-sm" onclick="hpEdit(${c.id}, ${c.max_hp})">HP</button>
      <button class="btn btn-secondary btn-sm" onclick="initEdit(${c.id})">Init</button>
      <button class="btn btn-secondary btn-sm" onclick="condEdit(${c.id}, '${c.conditions}')">Cond</button>
      <button class="btn btn-danger btn-sm" onclick="removeCombatant(${_activeEncounterId},${c.id})">✕</button>
    </div>
    ${c.notes ? `<div style="width:100%;font-size:11px;color:var(--muted);padding-top:2px">${c.notes}</div>` : ''}
  </div>`;
}

window.hpEdit = async (cid, maxHp) => {
  const delta = parseInt(prompt('Damage (negative) or Heal (positive):') || '0');
  if (isNaN(delta)) return;
  await api(`/api/encounters/${_activeEncounterId}/hp`, 'PATCH', { combatant_id: cid, delta });
  await refreshTracker();
};

window.initEdit = async cid => {
  const val = parseInt(prompt('Initiative:') || '0');
  if (isNaN(val)) return;
  await api(`/api/encounters/${_activeEncounterId}/initiative`, 'PATCH', { combatant_id: cid, initiative: val });
  await refreshTracker();
};

window.condEdit = async (cid, condJson) => {
  const ALL = ['Blinded','Charmed','Deafened','Frightened','Grappled','Incapacitated','Invisible','Paralyzed','Petrified','Poisoned','Prone','Restrained','Stunned','Unconscious'];
  const current = JSON.parse(condJson || '[]');
  const input = prompt(`Conditions (comma-separated):\nOptions: ${ALL.join(', ')}`, current.join(', '));
  if (input === null) return;
  const conditions = input.split(',').map(s => s.trim()).filter(Boolean);
  await api(`/api/encounters/${_activeEncounterId}/conditions`, 'PATCH', { combatant_id: cid, conditions });
  await refreshTracker();
};

window.removeCombatant = async (eid, cid) => {
  await api(`/api/encounters/${eid}/combatants/${cid}`, 'DELETE');
  await refreshTracker();
};
