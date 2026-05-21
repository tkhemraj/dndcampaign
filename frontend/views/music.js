'use strict';
// ---------------------------------------------------------------------------
// Tone.js procedural music engine
// Each mood is a self-contained pattern generator with appropriate
// scale, tempo, instrumentation, and rhythm for the scene.
// ---------------------------------------------------------------------------

const MOODS = {
  tavern: {
    icon: '🍺', name: 'Tavern',
    desc: 'Warm, lively folk — Ruby Sunrise vibes',
    bpm: 126, key: 'C', scale: 'major',
    melody: ['C4','E4','G4','A4','G4','E4','C5','B4','A4','G4','F4','E4','D4','C4','E4','G4'],
    bass:   ['C2','G2','F2','G2'],
    chord:  [['C3','E3','G3'],['F3','A3','C4'],['G3','B3','D4'],['C3','E3','G3']],
  },
  dungeon: {
    icon: '💀', name: 'Dungeon',
    desc: 'Dark, sparse, unsettling',
    bpm: 52, key: 'D', scale: 'diminished',
    melody: ['D3','F3','Ab3','D3','C3','Eb3','F3','D3',null,null,'D3','Bb2',null,'F2',null,null],
    bass:   ['D1','D1','A1','D1'],
    chord:  [['D2','F2','Ab2'],['Bb1','D2','F2'],['A1','C2','Eb2'],['D2','F2','Ab2']],
  },
  combat: {
    icon: '⚔', name: 'Combat',
    desc: 'Fast, driving, relentless',
    bpm: 152, key: 'E', scale: 'minor',
    melody: ['E4','G4','A4','E4','D4','E4','B3','E4','G4','A4','C5','B4','G4','E4','F#4','E4'],
    bass:   ['E2','A1','B1','E2'],
    chord:  [['E2','G2','B2'],['A1','C2','E2'],['B1','D2','F#2'],['E2','G2','B2']],
  },
  boss: {
    icon: '🐉', name: 'Boss Fight',
    desc: 'Epic, crushing, terrifying',
    bpm: 168, key: 'B', scale: 'phrygian',
    melody: ['B3','C4','B3','G3','B3','F3','B3','E3','B3','C4','D4','C4','B3',null,'G3','B3'],
    bass:   ['B1','E1','F1','B1'],
    chord:  [['B1','D2','F2'],['C2','E2','G2'],['E1','G1','B1'],['B1','D2','F2']],
  },
  wilderness: {
    icon: '🌲', name: 'Wilderness',
    desc: 'Flowing, open, vast — Greying Wildlands',
    bpm: 84, key: 'G', scale: 'pentatonic',
    melody: ['G4','A4','B4','D5','G4','A4','G4','E4','D4','G4','A4','B4','D5','B4','A4','G4'],
    bass:   ['G2','D2','C2','G2'],
    chord:  [['G2','B2','D3'],['D2','F#2','A2'],['C2','E2','G2'],['G2','B2','D3']],
  },
  kryn: {
    icon: '🌑', name: 'Xhorhas / Kryn',
    desc: 'Ethereal, alien, Dunamantic — the Dynasty',
    bpm: 68, key: 'F#', scale: 'dorian',
    melody: ['F#3','A3','B3','F#3','E3','F#3','C#4','B3','A3','F#3',null,'E3','F#3','G#3','A3','F#3'],
    bass:   ['F#1','B1','C#2','F#1'],
    chord:  [['F#2','A2','C#3'],['B1','D2','F#2'],['C#2','E2','G#2'],['F#2','A2','C#3']],
  },
  calamity: {
    icon: '💥', name: 'The Calamity',
    desc: 'Apocalyptic, Eiselcross — ancient horror',
    bpm: 60, key: 'C', scale: 'octatonic',
    melody: ['C3',null,'Db3',null,'D3','Eb3',null,'F3',null,'Gb3','G3','Ab3',null,'A3','Bb3',null],
    bass:   ['C1','F#1','C1','Bb0'],
    chord:  [['C2','Eb2','Gb2'],['F#1','A1','C2'],['Bb1','Db2','E2'],['C2','Eb2','Gb2']],
  },
  triumph: {
    icon: '🏆', name: 'Victory',
    desc: 'Bright, triumphant, fanfare',
    bpm: 112, key: 'C', scale: 'major',
    melody: ['C4','E4','G4','C5','B4','G4','A4','F4','G4','E4','C4','E4','G4','B4','C5',null],
    bass:   ['C2','G2','F2','C2'],
    chord:  [['C3','E3','G3'],['G2','B2','D3'],['F2','A2','C3'],['C3','E3','G3']],
  },
};

let _transport = null;
let _parts = [];
let _activeMood = null;
let _synths = [];
let _volume = -12;

function initMusic() {
  Tone.getTransport().bpm.value = 120;
}

function stopAll() {
  _parts.forEach(p => { try { p.stop(); p.dispose(); } catch(_) {} });
  _synths.forEach(s => { try { s.dispose(); } catch(_) {} });
  _parts = [];
  _synths = [];
  Tone.getTransport().stop();
  Tone.getTransport().cancel();
}

async function playMood(moodKey) {
  await Tone.start();
  stopAll();

  const mood = MOODS[moodKey];
  if (!mood) return;
  _activeMood = moodKey;

  Tone.getTransport().bpm.value = mood.bpm;

  const vol = new Tone.Volume(_volume).toDestination();
  const reverb = new Tone.Reverb({ decay: moodKey === 'dungeon' ? 4 : 1.5, wet: 0.3 }).connect(vol);
  await reverb.ready;

  // Melody synth
  const melSynth = new Tone.Synth({
    oscillator: { type: moodKey === 'kryn' ? 'sine' : moodKey === 'combat' ? 'sawtooth' : 'triangle' },
    envelope: { attack: 0.05, decay: 0.1, sustain: 0.6, release: 0.8 },
    volume: -8,
  }).connect(reverb);
  _synths.push(melSynth);

  const stepDur = moodKey === 'dungeon' || moodKey === 'calamity' ? '4n' : '8n';
  const melPart = new Tone.Sequence((time, note) => {
    if (note) melSynth.triggerAttackRelease(note, stepDur, time);
  }, mood.melody, stepDur);
  melPart.loop = true;
  _parts.push(melPart);

  // Bass synth
  const bassSynth = new Tone.Synth({
    oscillator: { type: 'sine' },
    envelope: { attack: 0.1, decay: 0.3, sustain: 0.8, release: 1.0 },
    volume: -6,
  }).connect(vol);
  _synths.push(bassSynth);

  const bassLoop = new Tone.Sequence((time, note) => {
    bassSynth.triggerAttackRelease(note, '2n', time);
  }, mood.bass, '2n');
  bassLoop.loop = true;
  _parts.push(bassLoop);

  // Chord pad
  const padSynth = new Tone.PolySynth(Tone.Synth, {
    oscillator: { type: moodKey === 'kryn' || moodKey === 'calamity' ? 'sawtooth' : 'triangle' },
    envelope: { attack: 0.4, decay: 0.2, sustain: 0.7, release: 1.5 },
    volume: -18,
  }).connect(reverb);
  _synths.push(padSynth);

  const chordLoop = new Tone.Sequence((time, chord) => {
    padSynth.triggerAttackRelease(chord, '1n', time);
  }, mood.chord, '1n');
  chordLoop.loop = true;
  _parts.push(chordLoop);

  // Percussion for non-ambient moods
  if (['tavern', 'combat', 'boss', 'triumph'].includes(moodKey)) {
    const kickSynth = new Tone.MembraneSynth({ volume: -10 }).connect(vol);
    const snareSynth = new Tone.NoiseSynth({
      noise: { type: 'white' }, envelope: { attack: 0.005, decay: 0.1, sustain: 0, release: 0.1 },
      volume: -16,
    }).connect(vol);
    _synths.push(kickSynth, snareSynth);

    const kickPat = moodKey === 'combat' || moodKey === 'boss'
      ? ['8n', null, '8n', null, '8n', null, '8n', null]
      : ['4n', null, null, null, '4n', null, null, null];
    const drumPart = new Tone.Sequence((time, hit) => {
      if (hit) kickSynth.triggerAttackRelease('C1', '8n', time);
    }, kickPat, '8n');
    drumPart.loop = true;
    _parts.push(drumPart);

    const snarePart = new Tone.Sequence((time, hit) => {
      if (hit) snareSynth.triggerAttackRelease('8n', time);
    }, [null, null, '4n', null, null, null, '4n', null], '8n');
    snarePart.loop = true;
    _parts.push(snarePart);
  }

  _parts.forEach(p => p.start(0));
  Tone.getTransport().start();

  // Update mini player in sidebar
  document.getElementById('music-mini-label').textContent = `♪ ${mood.name}`;
  document.getElementById('btn-music-toggle').textContent = '⏹';
  document.getElementById('music-mini').classList.add('playing');
}

function setVolume(db) {
  _volume = db;
}

// ── View ────────────────────────────────────────────────────────────────────

window.renderMusicView = function() {
  const el = document.getElementById('content');
  el.innerHTML = `
    <div class="view-header">
      <h1>🎵 Music</h1>
      <span class="subtitle">Procedural background scores for every scene</span>
    </div>
    <p style="color:var(--muted);margin-bottom:16px;font-size:13px;">
      Music is generated live in the browser using synthesis — no audio files required.
      Click a mood to start. Click again or press Stop to silence it.
    </p>
    <div class="mood-grid" id="mood-grid"></div>
    <div id="volume-row">
      <label>Volume</label>
      <input id="volume-slider" type="range" min="-40" max="0" value="-12" step="1"/>
      <span id="volume-label" style="color:var(--muted);font-size:12px;min-width:40px">-12 dB</span>
      <button class="btn btn-secondary btn-sm" id="btn-stop-music">⏹ Stop</button>
    </div>
  `;

  const grid = document.getElementById('mood-grid');
  Object.entries(MOODS).forEach(([key, mood]) => {
    const card = document.createElement('div');
    card.className = 'mood-card' + (key === _activeMood && Tone.getTransport().state === 'started' ? ' active' : '');
    card.id = `mood-${key}`;
    card.innerHTML = `<div class="mood-icon">${mood.icon}</div><div class="mood-name">${mood.name}</div><div class="mood-desc">${mood.desc}</div>`;
    card.addEventListener('click', async () => {
      if (_activeMood === key && Tone.getTransport().state === 'started') {
        stopAll(); _activeMood = null;
        document.getElementById('music-mini-label').textContent = '♪ —';
        document.getElementById('btn-music-toggle').textContent = '▶';
        document.getElementById('music-mini').classList.remove('playing');
        document.querySelectorAll('.mood-card').forEach(c => c.classList.remove('active'));
      } else {
        await playMood(key);
        document.querySelectorAll('.mood-card').forEach(c => c.classList.remove('active'));
        card.classList.add('active');
      }
    });
    grid.appendChild(card);
  });

  document.getElementById('volume-slider').addEventListener('input', e => {
    const v = parseInt(e.target.value);
    document.getElementById('volume-label').textContent = `${v} dB`;
    setVolume(v);
  });

  document.getElementById('btn-stop-music').addEventListener('click', () => {
    stopAll(); _activeMood = null;
    document.getElementById('music-mini-label').textContent = '♪ —';
    document.getElementById('btn-music-toggle').textContent = '▶';
    document.getElementById('music-mini').classList.remove('playing');
    document.querySelectorAll('.mood-card').forEach(c => c.classList.remove('active'));
  });
};

// Sidebar mini player
document.getElementById('btn-music-toggle').addEventListener('click', async () => {
  if (Tone.getTransport().state === 'started') {
    stopAll(); _activeMood = null;
    document.getElementById('music-mini-label').textContent = '♪ —';
    document.getElementById('btn-music-toggle').textContent = '▶';
    document.getElementById('music-mini').classList.remove('playing');
  } else if (_activeMood) {
    await playMood(_activeMood);
  }
});

initMusic();
