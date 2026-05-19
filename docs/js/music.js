'use strict';
/* ═══════════════════════════════════════════════════════════════════════════
   Orchestral music engine — real sampled instruments via soundfont-player
   FluidR3 GM samples served via jsDelivr CDN (fast, cached)
   ═══════════════════════════════════════════════════════════════════════ */

const SF_ROOT = 'https://cdn.jsdelivr.net/gh/gleitz/midi-js-soundfonts@gh-pages/FluidR3_GM/';

// ── Audio state ──────────────────────────────────────────────────────────────
let _ctx = null, _master = null, _dry = null, _wet = null, _conv = null;
const _pool = {};          // instrument name → Soundfont player
let _sched = null;         // active Scheduler instance
let _active = null;        // active mood key
let _loading = false;
let _loadingFor = null;    // mood key currently loading
let _vol = 0.72;

// ── Audio context + hall reverb ──────────────────────────────────────────────
async function ensureCtx() {
  if (_ctx) { if (_ctx.state === 'suspended') await _ctx.resume(); return; }
  _ctx = new (window.AudioContext || window.webkitAudioContext)();

  _master = _ctx.createGain();
  _master.gain.value = _vol;
  _master.connect(_ctx.destination);

  // Synthetic hall reverb (ConvolverNode with shaped noise impulse)
  const sr = _ctx.sampleRate, len = Math.floor(sr * 4.5);
  const ir = _ctx.createBuffer(2, len, sr);
  for (let ch = 0; ch < 2; ch++) {
    const d = ir.getChannelData(ch);
    for (let i = 0; i < len; i++) {
      const env = Math.pow(1 - i / len, 1.4) * (i < sr * 0.015 ? i / (sr * 0.015) : 1);
      d[i] = (Math.random() * 2 - 1) * env;
    }
  }
  _conv = _ctx.createConvolver();
  _conv.buffer = ir;

  _dry = _ctx.createGain(); _dry.gain.value = 0.48; _dry.connect(_master);
  _wet = _ctx.createGain(); _wet.gain.value = 0.62;
  _conv.connect(_wet); _wet.connect(_master);
}

// ── Instrument loader ────────────────────────────────────────────────────────
async function getPlayer(name) {
  if (_pool[name]) return _pool[name];
  await ensureCtx();
  const p = await Soundfont.instrument(_ctx, name, {
    soundfont: 'FluidR3_GM',
    nameToUrl: (n, sf, fmt) => `${SF_ROOT}${n.replace(/-/g, '_')}-${fmt}.js`,
    destination: _conv,
    gain: 2.0,
  });
  _pool[name] = p;
  return p;
}

// ── Lookahead scheduler ───────────────────────────────────────────────────────
// Notes format: [beatInLoop, noteName, durationBeats, velocity 0-1]
class Scheduler {
  constructor(players, comp) {
    this.pl = players;
    this.comp = comp;
    this.beatLen = 60 / comp.bpm;
    this.running = false;
    this.timer = null;
    this.t0 = 0;          // wall-clock start time
    this.scheduled = 0;   // absolute beats scheduled so far
  }
  start() {
    this.t0 = _ctx.currentTime + 0.12;
    this.scheduled = 0;
    this.running = true;
    this._tick();
  }
  stop() { this.running = false; if (this.timer) clearTimeout(this.timer); }
  _tick() {
    if (!this.running) return;
    const elapsed = _ctx.currentTime - this.t0;
    const cur = Math.max(0, elapsed / this.beatLen);
    const target = cur + 0.35 / this.beatLen;   // schedule 350 ms ahead

    if (target > this.scheduled) {
      const L = this.comp.loop;
      this.comp.tracks.forEach(tr => {
        const p = this.pl[tr.inst]; if (!p) return;
        tr.notes.forEach(([nb, note, dur, vel = 0.8]) => {
          const s0 = Math.floor(this.scheduled / L);
          const s1 = Math.floor(target / L);
          for (let lp = s0; lp <= s1; lp++) {
            const ab = lp * L + nb;
            if (ab >= this.scheduled && ab < target) {
              const wt = this.t0 + ab * this.beatLen;
              if (wt > _ctx.currentTime) {
                p.play(note, wt, { duration: dur * this.beatLen * 0.93, gain: vel * tr.vol });
              }
            }
          }
        });
      });
      this.scheduled = target;
    }
    this.timer = setTimeout(() => this._tick(), 28);
  }
}

// ── Compositions ─────────────────────────────────────────────────────────────
// Each entry: { bpm, loop (beats), inst [array], tracks [{inst,vol,notes[]}] }

const COMP = {

  /* ── TAVERN ─ D major folk, 116 bpm, 32 beats = 8 bars ─────────────────── */
  tavern: { bpm: 116, loop: 32,
    inst: ['acoustic-grand-piano', 'pizzicato-strings', 'string-ensemble-1'],
    tracks: [
      { inst: 'acoustic-grand-piano', vol: 0.80, notes: [
        // Phrase A: bright D-major melody
        [0,   'D5',  0.45, 0.88],[0.5, 'F#5', 0.45, 0.82],[1,   'A5',  0.45, 0.90],[1.5, 'G5',  0.45, 0.82],
        [2,   'F#5', 0.85, 0.88],[3,   'E5',  0.45, 0.78],[3.5, 'F#5', 0.45, 0.75],
        [4,   'G5',  0.85, 0.88],[5,   'A5',  0.45, 0.85],[5.5, 'B5',  0.45, 0.80],
        [6,   'A5',  0.45, 0.85],[6.5, 'G5',  0.45, 0.78],[7,   'F#5', 1.80, 0.90],
        // Phrase B: answer
        [9,   'D5',  0.45, 0.85],[9.5, 'E5',  0.45, 0.80],[10,  'F#5', 0.85, 0.88],
        [11,  'G5',  0.45, 0.82],[11.5,'A5',  0.45, 0.78],[12,  'B5',  0.85, 0.90],
        [13,  'A5',  0.45, 0.85],[13.5,'G5',  0.45, 0.80],[14,  'F#5', 0.85, 0.88],
        [15,  'E5',  0.85, 0.82],[16,  'D5',  1.80, 0.90],
        // Phrase C: upper octave
        [18,  'F#6', 0.45, 0.85],[18.5,'E6',  0.45, 0.80],[19,  'D6',  0.45, 0.88],[19.5,'C#6', 0.45, 0.82],
        [20,  'B5',  0.85, 0.85],[21,  'A5',  0.45, 0.80],[21.5,'G5',  0.45, 0.75],[22,  'F#5', 0.85, 0.82],
        [23,  'E5',  0.85, 0.78],
        // Phrase D: close
        [24,  'G5',  0.45, 0.88],[24.5,'F#5', 0.45, 0.82],[25,  'E5',  0.45, 0.85],[25.5,'D5',  0.45, 0.80],
        [26,  'C#5', 0.45, 0.82],[26.5,'D5',  0.45, 0.78],[27,  'E5',  0.45, 0.82],[27.5,'F#5', 0.45, 0.78],
        [28,  'G5',  0.85, 0.85],[29,  'A5',  0.85, 0.88],[30,  'D6',  0.45, 0.88],[30.5,'C#6', 0.45, 0.85],
        [31,  'D6',  0.85, 0.92],
      ]},
      { inst: 'string-ensemble-1', vol: 0.52, notes: [
        // Warm string chords D-G-A-D / D-G-E-A / D-Bm-G-A / D-G-A-D
        [0, 'D4',1.8,.62],[0,'F#4',1.8,.58],[0,'A4',1.8,.60],   [2, 'G3',1.8,.62],[2,'B4',1.8,.58],[2,'D4',1.8,.60],
        [4, 'A3',1.8,.62],[4,'C#4',1.8,.58],[4,'E4',1.8,.60],   [6, 'D3',1.8,.62],[6,'F#4',1.8,.58],[6,'A4',1.8,.60],
        [8, 'D4',1.8,.62],[8,'F#4',1.8,.58],[8,'A4',1.8,.60],   [10,'G3',1.8,.62],[10,'B4',1.8,.58],[10,'D4',1.8,.60],
        [12,'E3',1.8,.62],[12,'G#3',1.8,.58],[12,'B4',1.8,.60], [14,'A3',1.8,.62],[14,'C#4',1.8,.58],[14,'E4',1.8,.60],
        [16,'D4',1.8,.62],[16,'F#4',1.8,.58],[16,'A4',1.8,.60], [18,'B3',1.8,.62],[18,'D4',1.8,.58],[18,'F#4',1.8,.60],
        [20,'G3',1.8,.62],[20,'B4',1.8,.58],[20,'D4',1.8,.60],  [22,'A3',1.8,.62],[22,'C#4',1.8,.58],[22,'E4',1.8,.60],
        [24,'D4',1.8,.62],[24,'F#4',1.8,.58],[24,'A4',1.8,.60], [26,'G3',1.8,.62],[26,'B4',1.8,.58],[26,'D4',1.8,.60],
        [28,'A3',1.8,.62],[28,'C#4',1.8,.58],[28,'E4',1.8,.60], [30,'D3',1.8,.65],[30,'F#4',1.8,.60],[30,'A4',1.8,.62],
      ]},
      { inst: 'pizzicato-strings', vol: 0.84, notes: [
        // Walking bass following chord roots
        [0,.0,'D3',.38,.88],[0.5,'A3',.38,.68],[1.0,'D3',.38,.78],[1.5,'F#2',.38,.62],
        [2.0,'G2',.38,.88],[2.5,'D3',.38,.68],[3.0,'G2',.38,.78],[3.5,'B2',.38,.62],
        [4.0,'A2',.38,.88],[4.5,'E3',.38,.68],[5.0,'A2',.38,.78],[5.5,'C#3',.38,.62],
        [6.0,'D3',.38,.88],[6.5,'A2',.38,.68],[7.0,'D3',.38,.78],[7.5,'D2',.38,.65],
        [8.0,'D3',.38,.88],[8.5,'A3',.38,.68],[9.0,'D3',.38,.78],[9.5,'F#2',.38,.62],
        [10.0,'G2',.38,.88],[10.5,'D3',.38,.68],[11.0,'G2',.38,.78],[11.5,'B2',.38,.62],
        [12.0,'E3',.38,.88],[12.5,'B2',.38,.68],[13.0,'E3',.38,.78],[13.5,'G#2',.38,.62],
        [14.0,'A2',.38,.88],[14.5,'E3',.38,.68],[15.0,'A2',.38,.78],[15.5,'C#3',.38,.62],
        [16.0,'D3',.38,.88],[16.5,'A3',.38,.68],[17.0,'D3',.38,.78],[17.5,'F#2',.38,.62],
        [18.0,'B2',.38,.88],[18.5,'F#3',.38,.68],[19.0,'B2',.38,.78],[19.5,'D3',.38,.62],
        [20.0,'G2',.38,.88],[20.5,'D3',.38,.68],[21.0,'G2',.38,.78],[21.5,'B2',.38,.62],
        [22.0,'A2',.38,.88],[22.5,'E3',.38,.68],[23.0,'A2',.38,.78],[23.5,'C#3',.38,.62],
        [24.0,'D3',.38,.88],[24.5,'A3',.38,.68],[25.0,'D3',.38,.78],[25.5,'F#2',.38,.62],
        [26.0,'G2',.38,.88],[26.5,'D3',.38,.68],[27.0,'G2',.38,.78],[27.5,'B2',.38,.62],
        [28.0,'A2',.38,.88],[28.5,'E3',.38,.68],[29.0,'A2',.38,.78],[29.5,'C#3',.38,.62],
        [30.0,'D2',.38,.90],[30.5,'A2',.38,.72],[31.0,'D3',.38,.80],[31.5,'D2',.38,.68],
      ]},
    ],
  },

  /* ── DUNGEON ─ D minor, 48 bpm, 32 beats = 8 slow bars ─────────────────── */
  dungeon: { bpm: 48, loop: 32,
    inst: ['string-ensemble-1', 'choir-aahs'],
    tracks: [
      { inst: 'string-ensemble-1', vol: 0.68, notes: [
        // Slow sustained chords: Dm → C → Bb → A (Aeolian)
        [0, 'D3',7.5,.60],[0,'F3',7.5,.55],[0,'A3',7.5,.52],
        [8, 'C3',7.5,.60],[8,'E3',7.5,.55],[8,'G3',7.5,.52],
        [16,'Bb2',7.5,.62],[16,'D3',7.5,.58],[16,'F3',7.5,.54],
        [24,'A2',7.5,.65],[24,'C3',7.5,.60],[24,'E3',7.5,.56],
        // Sparse high string line (haunting melody)
        [2, 'F5', 3.5,.44],[6, 'E5', 2.2,.40],[9, 'D5', 4.5,.44],
        [14,'C5', 2.8,.42],[17,'Bb4',4.0,.44],[22,'A4', 4.5,.46],[27,'G4', 4.8,.42],
      ]},
      { inst: 'choir-aahs', vol: 0.32, notes: [
        // Very quiet sustained choir — just texture
        [0, 'D3',15.5,.38],[0,'A3',15.5,.30],
        [16,'A2',15.5,.38],[16,'E3',15.5,.30],
      ]},
    ],
  },

  /* ── COMBAT ─ E minor, 148 bpm, 32 beats ────────────────────────────────── */
  combat: { bpm: 148, loop: 32,
    inst: ['string-ensemble-1', 'brass-section', 'timpani'],
    tracks: [
      { inst: 'string-ensemble-1', vol: 0.78, notes: [
        // Driving 8th-note ostinato E4-B4 for first 16 beats
        ...(()=>{const n=[];for(let b=0;b<16;b+=.5)n.push([b,b%1<.5?'E4':'B4',.44,.68+(b%4<1?.12:0)]);return n;})(),
        // Melody over ostinato
        [0,'E5',.44,.92],[.5,'G5',.44,.88],[1,'A5',.44,.92],[1.5,'E5',.88,.88],
        [2.5,'D5',.44,.85],[3,'E5',.44,.82],[3.5,'B4',.88,.85],
        [4.5,'G5',.44,.90],[5,'A5',.44,.88],[5.5,'C6',.44,.92],[6,'B5',.88,.90],
        [7.5,'A5',.44,.88],[8,'G5',.44,.85],[8.5,'F#5',.88,.88],
        // Second half: more intense figure
        ...(()=>{const n=[];for(let b=16;b<32;b+=.5)n.push([b,b%1<.5?'E4':'B4',.44,.72+(b%2<.5?.10:0)]);return n;})(),
        [16,'B5',.44,.92],[16.5,'A5',.44,.88],[17,'G5',.88,.90],[18,'A5',.44,.90],
        [18.5,'B5',.44,.88],[19,'E6',.88,.92],[20,'D6',.44,.90],[20.5,'C6',.44,.88],
        [21,'B5',.88,.90],[22,'G5',.44,.88],[22.5,'A5',.44,.85],[23,'E5',1.8,.90],
        [25,'G5',.44,.88],[25.5,'A5',.44,.85],[26,'B5',.88,.88],[27,'E5',.44,.85],
        [27.5,'D5',.44,.82],[28,'E5',.44,.85],[28.5,'G5',.44,.82],[29,'A5',.44,.85],
        [29.5,'B5',.44,.88],[30,'E6',1.8,.92],
      ]},
      { inst: 'brass-section', vol: 0.80, notes: [
        // Heroic brass stabs — Em, Am, D, G, B chords
        [0,'E3',.32,.90],[0,'G3',.32,.88],[0,'B3',.32,.85],
        [2,'A2',.32,.88],[2,'C3',.32,.85],[2,'E3',.32,.82],
        [3,'D3',.32,.85],[3,'F#3',.32,.82],[3,'A3',.32,.80],
        [4,'E3',.32,.90],[4,'G3',.32,.88],[4,'B3',.32,.85],
        [6,'G2',.65,.88],[6,'B2',.65,.85],[6,'D3',.65,.82],
        [7,'E3',.65,.90],[7,'G3',.65,.88],[7,'B3',.65,.85],
        [8,'A2',.32,.88],[8,'C3',.32,.85],[8,'E3',.32,.82],
        [9,'E3',.32,.90],[9,'G3',.32,.88],[9,'B3',.32,.85],
        [10,'D3',.65,.85],[10,'F#3',.65,.82],[10,'A3',.65,.80],
        [11,'E3',.32,.92],[11,'G#3',.32,.90],[11,'B3',.32,.88],
        [12,'A2',1.20,.88],[12,'C3',1.20,.85],[12,'E3',1.20,.82],
        [14,'B2',1.80,.90],[14,'D3',1.80,.88],[14,'F#3',1.80,.85],
        // Second half — bigger
        [16,'E3',.32,.92],[16,'G3',.32,.90],[16,'B3',.32,.88],
        [17,'E3',.32,.88],[17,'G3',.32,.85],[17,'C4',.32,.82],
        [18,'C3',.65,.88],[18,'E3',.65,.85],[18,'G3',.65,.82],
        [19,'D3',.65,.88],[19,'F#3',.65,.85],[19,'A3',.65,.82],
        [20,'E3',.32,.90],[20,'G3',.32,.88],[20,'B3',.32,.85],
        [22,'A2',.32,.90],[22,'C3',.32,.88],[22,'E3',.32,.85],
        [23,'B2',.65,.92],[23,'D3',.65,.90],[23,'F#3',.65,.88],
        [24,'E2',1.8,.95],[24,'B2',1.8,.92],[24,'E3',1.8,.90],
        [26,'A2',1.8,.90],[26,'C3',1.8,.88],[26,'E3',1.8,.85],
        [28,'B2',1.8,.92],[28,'D3',1.8,.90],[28,'G3',1.8,.88],
        [30,'E2',1.8,.95],[30,'E3',1.8,.92],[30,'G3',1.8,.90],
      ]},
      { inst: 'timpani', vol: 0.88, notes: [
        [0,'E2',.70,.95],[1,'E2',.38,.72],[1.5,'E2',.38,.65],
        [2,'E2',.70,.90],[3,'B2',.38,.75],[3.5,'B2',.38,.65],
        [4,'E2',.70,.95],[5,'E2',.38,.72],[5.5,'G2',.38,.65],
        [6,'A2',.70,.90],[7,'E2',.70,.92],
        [8,'E2',.70,.90],[9,'E2',.38,.70],[9.5,'A2',.38,.65],
        [10,'E2',.70,.88],[11,'B2',.38,.72],[11.5,'D3',.38,.65],
        [12,'E2',1.4,.92],[14,'B2',1.4,.88],
        [16,'E2',.70,.95],[17,'E2',.38,.72],[17.5,'E2',.38,.68],
        [18,'C2',.70,.90],[19,'G2',.38,.75],[19.5,'E2',.38,.68],
        [20,'D2',.70,.90],[21,'A2',.38,.72],[21.5,'D2',.38,.65],
        [22,'A2',.70,.92],[23,'E2',.70,.95],
        [24,'E2',1.4,.95],[26,'E2',1.4,.90],[28,'B1',1.4,.85],[30,'E2',1.8,.95],
      ]},
    ],
  },

  /* ── BOSS ─ B Phrygian, 165 bpm, 32 beats ──────────────────────────────── */
  boss: { bpm: 165, loop: 32,
    inst: ['brass-section', 'string-ensemble-1', 'timpani', 'choir-aahs'],
    tracks: [
      { inst: 'brass-section', vol: 0.88, notes: [
        // Massive Phrygian chord hits: Bm - C - G - F (the flat-II tritone tension)
        [0,'B2',.28,.95],[0,'D3',.28,.92],[0,'F#3',.28,.90],
        [0.5,'B2',.28,.88],[0.5,'D3',.28,.85],[0.5,'F#3',.28,.82],
        [1,'C3',.55,.95],[1,'E3',.55,.92],[1,'G3',.55,.90],
        [2,'G2',.55,.90],[2,'B2',.55,.88],[2,'D3',.55,.85],
        [3,'F2',.55,.92],[3,'A2',.55,.90],[3,'C3',.55,.88],
        [4,'B2',.28,.95],[4,'D3',.28,.92],[4,'F#3',.28,.90],
        [4.5,'B2',.28,.88],[4.5,'D3',.28,.85],[4.5,'F#3',.28,.82],
        [5,'C3',.55,.92],[5,'Eb3',.55,.90],[5,'G3',.55,.88],
        [6,'E3',.55,.90],[6,'G3',.55,.88],[6,'B3',.55,.85],
        [7,'F2',1.0,.95],[7,'A2',1.0,.92],[7,'C3',1.0,.90],
        [8,'B2',.28,.95],[8,'D3',.28,.92],[8,'F#3',.28,.90],
        [9,'C3',.55,.92],[9,'E3',.55,.90],[9,'G3',.55,.88],
        [10,'A2',.55,.88],[10,'C3',.55,.85],[10,'E3',.55,.82],
        [11,'Bb2',.55,.90],[11,'D3',.55,.88],[11,'F3',.55,.85],
        [12,'B2',1.8,.95],[12,'D3',1.8,.92],[12,'F#3',1.8,.90],
        [14,'E2',1.8,.95],[14,'G2',1.8,.92],[14,'B2',1.8,.90],
        // Second half: escalation
        [16,'B2',.20,.95],[16.25,'C3',.20,.92],[16.5,'B2',.20,.90],[16.75,'C3',.20,.88],
        [17,'D3',.55,.92],[17,'F3',.55,.90],[17,'Ab3',.55,.88],
        [18,'B1',1.8,.98],[18,'D2',1.8,.95],[18,'F#2',1.8,.92],
        [20,'C2',1.8,.95],[20,'E2',1.8,.92],[20,'G2',1.8,.90],
        [22,'G1',1.8,.95],[22,'B1',1.8,.92],[22,'D2',1.8,.90],
        [24,'F1',1.8,.95],[24,'A1',1.8,.92],[24,'C2',1.8,.90],
        [26,'E2',1.8,.98],[26,'B2',1.8,.95],[26,'E3',1.8,.92],
        [28,'B1',3.5,.98],[28,'F#2',3.5,.95],[28,'B2',3.5,.92],
      ]},
      { inst: 'string-ensemble-1', vol: 0.72, notes: [
        // Tremolo-style rapid repeated notes (8th notes pounding)
        ...(()=>{
          const n=[];
          const pat=['B3','B3','C4','B3','G3','B3','F3','B3'];
          for(let b=0;b<32;b+=.5)n.push([b,pat[Math.floor(b*2)%pat.length],.44,.65+(b%4<.5?.18:b%4<1?.12:0)]);
          return n;
        })(),
      ]},
      { inst: 'timpani', vol: 0.92, notes: [
        // Heavy on every beat with accents
        [0,'B2',.60,.98],[1,'B2',.35,.75],[1.5,'B2',.35,.70],
        [2,'E2',.60,.95],[3,'B2',.35,.80],[3.5,'E2',.35,.72],
        [4,'B2',.60,.98],[5,'B2',.35,.75],[5.5,'C3',.35,.70],
        [6,'G2',.60,.92],[7,'F2',.60,.95],
        [8,'B2',.60,.98],[9,'C3',.60,.92],[10,'A2',.60,.90],[11,'Bb2',.60,.92],
        [12,'B2',1.8,.98],[14,'E2',1.8,.95],
        [16,'B2',.45,.98],[16.5,'B2',.45,.88],[17,'B2',.45,.92],[17.5,'B2',.45,.85],
        [18,'B1',1.8,.98],[20,'C2',1.8,.95],[22,'G1',1.8,.92],
        [24,'F1',1.8,.95],[26,'E2',1.8,.98],[28,'B1',3.5,.98],
      ]},
      { inst: 'choir-aahs', vol: 0.40, notes: [
        // Dark choir undertone
        [0,'B2',15.5,.42],[0,'F#3',15.5,.35],
        [16,'E2',15.5,.45],[16,'B2',15.5,.38],
      ]},
    ],
  },

  /* ── WILDERNESS ─ G major, 80 bpm, 32 beats ─────────────────────────────── */
  wilderness: { bpm: 80, loop: 32,
    inst: ['string-ensemble-1', 'french-horn', 'choir-aahs'],
    tracks: [
      { inst: 'french-horn', vol: 0.72, notes: [
        // Majestic horn calls — the classic 5th leap
        [0,  'G4', 1.8,.80],[2,  'D5', 1.8,.78],[4,  'G5', 0.9,.82],
        [5,  'B4', 0.9,.78],[6,  'D5', 0.9,.80],[7,  'G4', 0.9,.75],
        [8,  'C5', 1.8,.80],[10, 'G4', 0.9,.75],[11, 'E5', 0.9,.78],
        [12, 'D5', 1.8,.82],[14, 'B4', 0.9,.78],[15, 'G4', 0.9,.72],
        [16, 'A4', 1.8,.80],[18, 'E5', 1.8,.78],[20, 'D5', 0.9,.82],
        [21, 'C5', 0.9,.78],[22, 'B4', 0.9,.80],[23, 'A4', 0.9,.75],
        [24, 'G4', 1.8,.82],[26, 'B4', 0.9,.80],[27, 'D5', 0.9,.78],
        [28, 'G5', 1.8,.85],[30, 'D5', 0.9,.80],[31, 'G4', 0.9,.75],
      ]},
      { inst: 'string-ensemble-1', vol: 0.62, notes: [
        // Flowing string melody underneath
        [0, 'D5', 0.9,.62],[1, 'E5', 0.9,.60],[2, 'G5', 1.8,.65],
        [4, 'F#5',0.9,.62],[5, 'E5', 0.9,.60],[6, 'D5', 1.8,.62],
        [8, 'C5', 0.9,.62],[9, 'D5', 0.9,.60],[10,'E5', 0.9,.62],[11,'C5',0.9,.60],
        [12,'D5', 1.8,.65],[14,'B4', 1.8,.60],
        [16,'A4', 0.9,.62],[17,'B4', 0.9,.60],[18,'C5', 1.8,.62],
        [20,'D5', 0.9,.65],[21,'E5', 0.9,.62],[22,'D5', 0.9,.60],[23,'C5',0.9,.58],
        [24,'B4', 1.8,.62],[26,'D5', 0.9,.65],[27,'G5', 0.9,.68],
        [28,'G5', 1.8,.70],[30,'D5', 0.9,.65],[31,'G4', 0.9,.60],
        // Sustained chords: G - C - D - G / Am - C - D - G
        [0, 'G3',3.8,.55],[0,'B4',3.8,.50],[0,'D4',3.8,.52],
        [4, 'D3',3.8,.55],[4,'F#3',3.8,.50],[4,'A4',3.8,.52],
        [8, 'C3',3.8,.55],[8,'E4',3.8,.50],[8,'G4',3.8,.52],
        [12,'G3',3.8,.58],[12,'B4',3.8,.54],[12,'D4',3.8,.56],
        [16,'A2',3.8,.55],[16,'C3',3.8,.50],[16,'E4',3.8,.52],
        [20,'D3',3.8,.55],[20,'F#3',3.8,.50],[20,'A4',3.8,.52],
        [24,'C3',3.8,.55],[24,'E4',3.8,.50],[24,'G4',3.8,.52],
        [28,'G2',3.8,.58],[28,'D3',3.8,.54],[28,'G3',3.8,.56],
      ]},
      { inst: 'choir-aahs', vol: 0.28, notes: [
        // Very soft choir pad — like a distant breath
        [0, 'G3',15.5,.30],[0,'D4',15.5,.25],
        [16,'A3',15.5,.30],[16,'E4',15.5,.25],
      ]},
    ],
  },

  /* ── KRYN ─ F# minor Dorian, 65 bpm, 32 beats ──────────────────────────── */
  kryn: { bpm: 65, loop: 32,
    inst: ['choir-aahs', 'string-ensemble-1', 'french-horn'],
    tracks: [
      { inst: 'choir-aahs', vol: 0.60, notes: [
        // Sustained Dorian chords — otherworldly
        [0, 'F#3',7.5,.60],[0,'A3',7.5,.55],[0,'C#4',7.5,.52],
        [8, 'B2', 7.5,.60],[8,'D3',7.5,.55],[8,'F#3',7.5,.52],
        [16,'E3', 7.5,.62],[16,'G#3',7.5,.58],[16,'B4',7.5,.54],
        [24,'D3', 7.5,.60],[24,'F#3',7.5,.55],[24,'A4',7.5,.52],
        // Second layer — ethereal high vowel
        [2, 'F#5',6.5,.40],[10,'E5', 6.5,.38],[18,'C#5',6.5,.40],[26,'D5', 5.5,.38],
      ]},
      { inst: 'string-ensemble-1', vol: 0.55, notes: [
        // Sparse, modal string melody — pentatonic F# minor
        [0, 'F#4',1.8,.58],[2, 'A4', 1.8,.55],[4, 'C#5',0.9,.58],[5, 'B4', 0.9,.54],
        [6, 'A4', 1.8,.55],[8, 'E4', 1.8,.58],[10,'F#4',1.8,.55],
        [12,'G#4',1.8,.58],[14,'F#4',1.8,.55],[16,'A4', 1.8,.58],
        [18,'B4', 1.8,.55],[20,'C#5',1.8,.58],[22,'B4', 0.9,.55],[23,'A4',0.9,.52],
        [24,'F#4',1.8,.58],[26,'E4', 1.8,.55],[28,'D4', 1.8,.58],[30,'C#4',1.8,.55],
        // Low string pedal tone
        [0,'F#2',31.5,.42],
      ]},
      { inst: 'french-horn', vol: 0.45, notes: [
        // Occasional haunting horn notes — sparse, distant
        [4, 'F#4',3.5,.48],[12,'C#5',3.5,.45],[20,'A4',3.5,.48],[28,'B4',3.5,.45],
      ]},
    ],
  },

  /* ── CALAMITY ─ diminished/chromatic, 55 bpm, 32 beats ─────────────────── */
  calamity: { bpm: 55, loop: 32,
    inst: ['brass-section', 'string-ensemble-1', 'choir-aahs'],
    tracks: [
      { inst: 'brass-section', vol: 0.82, notes: [
        // Massive dissonant cluster chords — diminished + augmented
        [0, 'C2', 7.5,.88],[0,'Eb2',7.5,.85],[0,'Gb2',7.5,.82],[0,'A2',7.5,.80],
        [8, 'F1', 7.5,.88],[8,'B1', 7.5,.85],[8,'D2', 7.5,.82],[8,'Ab2',7.5,.80],
        [16,'Bb1',7.5,.90],[16,'E2', 7.5,.88],[16,'G2', 7.5,.85],[16,'Db3',7.5,.82],
        [24,'C1', 7.5,.92],[24,'F#1',7.5,.90],[24,'Bb1',7.5,.88],[24,'Eb2',7.5,.85],
        // Brass stabs punctuating the horror
        [7, 'C2',.35,.92],[7,'Gb2',.35,.90],[7,'A2',.35,.88],
        [15,'F1',.35,.90],[15,'B1',.35,.88],[15,'D#2',.35,.85],
        [23,'Bb1',.35,.92],[23,'E2',.35,.90],[23,'G#2',.35,.88],
        [30,'C1',.35,.95],[30,'F#1',.35,.92],[30,'A#1',.35,.90],[31,'C2',1.0,.95],
      ]},
      { inst: 'string-ensemble-1', vol: 0.65, notes: [
        // Ominous low string masses
        [0, 'C2', 7.5,.62],[0,'G2',7.5,.58],
        [8, 'F1', 7.5,.62],[8,'C2',7.5,.58],
        [16,'Bb1',7.5,.65],[16,'F2',7.5,.62],
        [24,'C1', 7.5,.68],[24,'G1',7.5,.65],
        // High string dissonance — like screaming
        [1, 'Db5',5.5,.52],[2,'C5',5.5,.48],
        [9, 'Gb5',5.5,.50],[10,'F5',5.5,.48],
        [17,'Ab4',5.5,.52],[18,'G4',5.5,.50],
        [25,'C5', 5.5,.55],[26,'B4',5.5,.52],
      ]},
      { inst: 'choir-aahs', vol: 0.52, notes: [
        // Horror choir — the tritone (C and F#)
        [0,'C3', 15.5,.55],[0,'F#3',15.5,.50],[0,'Eb4',15.5,.45],
        [16,'F2',15.5,.58],[16,'B2',15.5,.52],[16,'Ab3',15.5,.48],
        // High choir keening
        [4, 'Db5',7.0,.40],[12,'C5', 7.0,.38],[20,'Ab4',7.0,.40],[28,'Gb4',7.0,.42],
      ]},
    ],
  },

  /* ── TRIUMPH ─ C major, 108 bpm, 32 beats ──────────────────────────────── */
  triumph: { bpm: 108, loop: 32,
    inst: ['brass-section', 'string-ensemble-1', 'choir-aahs', 'timpani'],
    tracks: [
      { inst: 'brass-section', vol: 0.85, notes: [
        // Triumphant fanfare: C-E-G-C ascending
        [0, 'C3',.45,.95],[.5,'E3',.45,.92],[1,'G3',.45,.95],[1.5,'C4',.90,.98],
        [2.5,'G3',.45,.90],[3,'E3',.45,.88],[3.5,'C3',.45,.85],
        [4, 'F3',.45,.95],[4.5,'A3',.45,.92],[5,'C4',.45,.95],[5.5,'F4',.90,.98],
        [6.5,'C4',.45,.90],[7,'A3',.45,.88],[7.5,'F3',.45,.85],
        [8, 'G3',.45,.95],[8.5,'B3',.45,.92],[9,'D4',.45,.95],[9.5,'G4',.90,.98],
        [10.5,'D4',.45,.90],[11,'B3',.45,.88],[11.5,'G3',.90,.85],
        [13,'C3',.45,.95],[13.5,'E3',.45,.92],[14,'G3',.45,.95],[14.5,'C4',.45,.98],
        [15,'E4',.45,.95],[15.5,'G4',.45,.92],
        [16,'C4',1.8,.98],[18,'G3',1.8,.95],[20,'F3',1.8,.92],[22,'C3',1.8,.95],
        // Grand return
        [24,'C3',.32,.95],[24,'E3',.32,.92],[24,'G3',.32,.90],
        [24.5,'G3',.32,.92],[24.5,'B3',.32,.90],[24.5,'D4',.32,.88],
        [25,'F3',.65,.92],[25,'A3',.65,.90],[25,'C4',.65,.88],
        [26,'E3',.65,.90],[26,'G3',.65,.88],[26,'C4',.65,.85],
        [27,'G2',1.8,.92],[27,'C3',1.8,.90],[27,'E3',1.8,.88],
        [29,'C3',2.8,.98],[29,'G3',2.8,.95],[29,'C4',2.8,.92],[29,'E4',2.8,.90],
      ]},
      { inst: 'string-ensemble-1', vol: 0.70, notes: [
        // Soaring string melody
        [0, 'C5',.90,.88],[1,'E5',.90,.85],[2,'G5',.90,.90],[3,'C6',.90,.92],
        [4, 'B5',.90,.90],[5,'A5',.90,.88],[6,'G5',.90,.85],[7,'F5',.90,.82],
        [8, 'E5',.90,.85],[9,'G5',.90,.88],[10,'D5',.90,.85],[11,'F5',.90,.82],
        [12,'E5',.90,.85],[13,'C5',.90,.82],[14,'D5',.90,.85],[15,'E5',.90,.88],
        [16,'G5',1.8,.90],[18,'F5',1.8,.88],[20,'E5',1.8,.85],[22,'D5',1.8,.82],
        [24,'C5',.90,.88],[25,'E5',.90,.85],[26,'G5',.90,.90],[27,'C6',0.9,.95],
        [28,'G5',0.9,.92],[29,'E5',0.9,.90],[30,'C6',1.8,.98],
        // Chord swell
        [0,'C4',3.8,.62],[0,'E4',3.8,.58],[0,'G4',3.8,.60],
        [4,'F3',3.8,.62],[4,'A3',3.8,.58],[4,'C4',3.8,.60],
        [8,'G3',3.8,.62],[8,'B3',3.8,.58],[8,'D4',3.8,.60],
        [12,'C4',3.8,.65],[12,'E4',3.8,.62],[12,'G4',3.8,.64],
        [16,'C4',3.8,.62],[16,'E4',3.8,.58],[16,'G4',3.8,.60],
        [20,'F3',3.8,.62],[20,'A3',3.8,.58],[20,'C4',3.8,.60],
        [24,'C4',3.8,.65],[24,'E4',3.8,.62],[24,'G4',3.8,.64],
        [28,'C3',3.8,.70],[28,'G3',3.8,.68],[28,'C4',3.8,.72],
      ]},
      { inst: 'choir-aahs', vol: 0.48, notes: [
        // Triumphant choir swell
        [0, 'C4',7.5,.50],[0,'E4',7.5,.45],[0,'G4',7.5,.48],
        [8, 'G3',7.5,.50],[8,'B3',7.5,.45],[8,'D4',7.5,.48],
        [16,'F3',7.5,.52],[16,'A3',7.5,.48],[16,'C4',7.5,.50],
        [24,'C3',7.5,.58],[24,'G3',7.5,.55],[24,'E4',7.5,.52],
        // High choir
        [0, 'E5',7.5,.38],[8,'D5',7.5,.36],[16,'C5',7.5,.40],[24,'G5',7.5,.42],
      ]},
      { inst: 'timpani', vol: 0.85, notes: [
        [0,'C2',.65,.92],[1,'C2',.38,.72],[1.5,'C2',.38,.68],
        [2,'F2',.65,.88],[3,'C2',.38,.72],[3.5,'G2',.38,.65],
        [4,'C2',.65,.90],[5,'C2',.38,.72],
        [6,'G2',.65,.88],[7,'C2',.65,.90],
        [8,'G2',.65,.90],[9,'G2',.38,.72],[10,'D3',.65,.88],[11,'G2',.65,.85],
        [12,'C2',1.4,.90],[14,'G2',1.4,.88],
        [16,'C2',.65,.90],[17,'C2',.38,.72],[18,'F2',.65,.88],[19,'C2',.38,.72],
        [20,'G2',.65,.90],[21,'D3',.38,.72],[22,'C2',.65,.88],[23,'G2',.38,.72],
        [24,'C2',.38,.92],[24.5,'C2',.38,.88],[25,'E2',.38,.85],[25.5,'G2',.38,.82],
        [26,'C2',.65,.90],[27,'G2',.65,.88],
        [28,'C2',.38,.95],[28.5,'C2',.38,.92],[29,'C2',2.8,.98],
      ]},
    ],
  },
};

// ── Mood metadata (for UI) ───────────────────────────────────────────────────
const MOODS = {
  tavern:    { icon:'🍺', name:'Tavern',        desc:'Warm folk — the Ruby Sunrise, any lit inn',       bpm:116 },
  dungeon:   { icon:'💀', name:'Dungeon',        desc:'Dark, sparse, haunting — the dark between rooms', bpm:48  },
  combat:    { icon:'⚔',  name:'Combat',         desc:'Driving heroic — relentless, urgent',             bpm:148 },
  boss:      { icon:'🐉', name:'Boss Fight',     desc:'Crushing, Phrygian terror — the dragon stirs',   bpm:165 },
  wilderness:{ icon:'🌲', name:'Wilderness',     desc:'Vast, flowing, beautiful — open sky',            bpm:80  },
  kryn:      { icon:'🌑', name:'Xhorhas / Kryn', desc:'Ethereal, alien, Dunamantic',                    bpm:65  },
  calamity:  { icon:'💥', name:'The Calamity',   desc:'Apocalyptic, ancient horror, the end of things', bpm:55  },
  triumph:   { icon:'🏆', name:'Victory',        desc:'Triumphant fanfare — they earned this',          bpm:108 },
};

// ── Public API ───────────────────────────────────────────────────────────────
window.Music = {
  MOODS,
  getActive:  () => _active,
  isLoading:  () => _loading,
  refreshUI:  notifyUI,

  async play(key) {
    const comp = COMP[key];
    if (!comp) return;
    if (_loading && _loadingFor === key) return; // already loading this one

    // Stop current
    if (_sched) { _sched.stop(); _sched = null; }
    _active = null;
    _loading = true;
    _loadingFor = key;
    notifyUI();

    try {
      await ensureCtx();
      const players = {};
      await Promise.all(comp.inst.map(async name => {
        players[name] = await getPlayer(name);
      }));
      if (_loadingFor !== key) return; // superseded

      _sched = new Scheduler(players, comp);
      _sched.start();
      _active = key;
    } catch (e) {
      console.error('Music load error:', e);
    }
    _loading = false;
    _loadingFor = null;
    notifyUI();
  },

  stop() {
    if (_sched) { _sched.stop(); _sched = null; }
    _active = null;
    _loading = false;
    _loadingFor = null;
    notifyUI();
  },

  setVolume(v) {
    _vol = Math.max(0, Math.min(1, v));
    if (_master) _master.gain.value = _vol;
  },
};

function notifyUI() {
  // Update sidebar mini player
  const mini = document.getElementById('music-mini');
  if (!mini) return;
  const m = _active ? MOODS[_active] : null;
  if (_loading) {
    mini.innerHTML = `<span class="mini-dot playing"></span><span class="mini-label" style="color:var(--accent)">Loading…</span>`;
  } else if (m) {
    mini.innerHTML = `<span class="mini-dot playing"></span><span class="mini-label">${m.icon} ${m.name}</span><button onclick="Music.stop()" class="mini-stop">⏹</button>`;
  } else {
    mini.innerHTML = `<span class="mini-dot"></span><span class="mini-label" style="color:var(--muted)">No music</span>`;
  }
  // Update mood cards if music view is open
  document.querySelectorAll('.mood-card').forEach(c => {
    const k = c.dataset.mood;
    c.classList.remove('active', 'loading');
    if (k === _active) c.classList.add('active');
    if (k === _loadingFor && _loading) c.classList.add('loading');
  });
  // Update now-playing banner
  const np = document.getElementById('music-now');
  if (np) {
    if (_loading) {
      np.innerHTML = `<span class="now-dot playing"></span><span style="color:var(--accent)">Loading instruments… first load takes a few seconds, then cached</span>`;
    } else if (m) {
      np.innerHTML = `<span class="now-dot playing"></span><strong>${m.icon} ${m.name}</strong> &nbsp;—&nbsp; ${m.desc} &nbsp;<span style="color:var(--muted)">${m.bpm} bpm</span>`;
    } else {
      np.innerHTML = `<span style="color:var(--muted)">Click a mood to start — uses real sampled orchestral instruments</span>`;
    }
  }
}
