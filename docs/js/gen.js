'use strict';
// All generator functions — map, NPC, quest, encounter

// ── Utilities ────────────────────────────────────────────────────────────────

function roll(d) { return 1 + Math.floor(Math.random() * d); }
function uuid() { return Date.now().toString(36) + Math.random().toString(36).slice(2,8); }
function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function rollStat() {
  const d = [roll(6),roll(6),roll(6),roll(6)].sort((a,b)=>a-b);
  return d[1]+d[2]+d[3];
}
function statMod(s) { return Math.floor((s-10)/2); }
function signedMod(s) { const m=statMod(s); return (m>=0?'+':'')+m; }
function clamp(v,lo,hi) { return Math.max(lo, Math.min(hi, v)); }

// ── Tile constants ────────────────────────────────────────────────────────────

const T = {WALL:0,FLOOR:1,DOOR:2,WATER:3,LAVA:4,TREES:5,ROAD:6,RUBBLE:7,PILLAR:8,CHEST:9,STAIRS:10,TRAP:11,GRASS:12,DIRT:13,SNOW:14};

function makeGrid(w, h, fill=T.WALL) {
  return Array.from({length:h}, () => new Array(w).fill(fill));
}

// ── Map generation ────────────────────────────────────────────────────────────

function generateMap(type, subtype) {
  switch(type) {
    case 'outdoor':    return genOutdoor(subtype);
    case 'interior':   return genInterior(subtype);
    case 'wildemount': return genWildemount(subtype);
    default:           return genDungeon(subtype);
  }
}

function genDungeon(subtype='standard') {
  const W=80, H=40;
  const grid = makeGrid(W,H);
  const rooms = [];
  const isCrypt = subtype==='crypt';
  const isUnderdark = subtype==='underdark' || subtype==='bazzoxan';
  const isSewers = subtype==='sewers';

  for (let attempt=0; attempt<400; attempt++) {
    if (rooms.length>=15) break;
    const rw = isSewers ? 3+Math.floor(Math.random()*4) : 4+Math.floor(Math.random()*9);
    const rh = isSewers ? 3+Math.floor(Math.random()*3) : 3+Math.floor(Math.random()*6);
    const rx = 1+Math.floor(Math.random()*(W-rw-2));
    const ry = 1+Math.floor(Math.random()*(H-rh-2));
    let ok=true;
    for (const r of rooms) {
      if (rx<r.x+r.w+1 && rx+rw>r.x-1 && ry<r.y+r.h+1 && ry+rh>r.y-1) {ok=false;break;}
    }
    if (!ok) continue;
    for (let y=ry;y<ry+rh;y++) for (let x=rx;x<rx+rw;x++) grid[y][x]=T.FLOOR;
    rooms.push({x:rx,y:ry,w:rw,h:rh});
  }

  // Corridors between rooms
  for (let i=1;i<rooms.length;i++) {
    const a=rooms[i-1], b=rooms[i];
    const ax=Math.floor(a.x+a.w/2), ay=Math.floor(a.y+a.h/2);
    const bx=Math.floor(b.x+b.w/2), by=Math.floor(b.y+b.h/2);
    let cx=ax, cy=ay;
    const hFirst = Math.random()<0.5;
    if (hFirst) {
      while(cx!==bx){grid[cy][cx]=T.FLOOR;cx+=(bx>cx?1:-1);}
      while(cy!==by){grid[cy][cx]=T.FLOOR;cy+=(by>cy?1:-1);}
    } else {
      while(cy!==by){grid[cy][ax]=T.FLOOR;cy+=(by>cy?1:-1);}
      while(cx!==bx){grid[cy][cx]=T.FLOOR;cx+=(bx>cx?1:-1);}
    }
    // Door at bend
    if (hFirst && ay!==by) grid[ay][bx]=T.DOOR;
    else if (!hFirst && ax!==bx) grid[by][ax]=T.DOOR;
  }

  // Features per room
  rooms.forEach((r,i) => {
    const cx=Math.floor(r.x+r.w/2), cy=Math.floor(r.y+r.h/2);
    if (i===0) { grid[cy][cx]=T.STAIRS; }
    else if (i===rooms.length-1) { grid[cy][cx]=T.CHEST; }
    else if (r.w>=6 && r.h>=4) {
      // Pillared chamber
      [[r.y+1,r.x+1],[r.y+1,r.x+r.w-2],[r.y+r.h-2,r.x+1],[r.y+r.h-2,r.x+r.w-2]].forEach(([y,x]) => {
        if (y>=0&&y<H&&x>=0&&x<W) grid[y][x]=T.PILLAR;
      });
    } else if (Math.random()<0.48) { grid[cy][cx]=T.TRAP; }

    if (isUnderdark) {
      // Underground pools
      for (let j=0;j<2;j++) {
        const fx=r.x+1+Math.floor(Math.random()*(r.w-2));
        const fy=r.y+1+Math.floor(Math.random()*(r.h-2));
        if (grid[fy]&&grid[fy][fx]===T.FLOOR) grid[fy][fx]=T.WATER;
      }
    }
    if (isCrypt) {
      // Rubble in corners
      if (grid[r.y+1]&&grid[r.y+1][r.x+1]===T.FLOOR) grid[r.y+1][r.x+1]=T.RUBBLE;
    }
    if (isSewers) {
      // Water channels down the middle
      if (r.w>4) for (let x=r.x+1;x<r.x+r.w-1;x++) grid[cy][x]=T.WATER;
    }
  });

  const titles = {standard:'Dungeon',underdark:'Underdark Delve',crypt:'Ancient Crypt',sewers:'Sewer Tunnels',cerberus_lab:'Cerberus Assembly Laboratory',bazzoxan:'Bazzoxan Caverns'};
  const labels = rooms.map((r,i) => ({x:Math.floor(r.x+r.w/2),y:Math.floor(r.y+r.h/2),text:i===0?'Entry':i===rooms.length-1?'Boss':`R${i+1}`}));
  return {grid,W,H,rooms,labels,title:titles[subtype]||'Dungeon', mapTheme:subtype||'standard'};
}

function genOutdoor(theme='forest') {
  const W=80, H=40;
  const cfg = {
    forest:  {base:T.GRASS, scatter:T.TREES, river:T.WATER, road:T.ROAD,  title:'Forest'},
    plains:  {base:T.GRASS, scatter:T.DIRT,  river:T.WATER, road:T.ROAD,  title:'Plains & Hills'},
    coastal: {base:T.DIRT,  scatter:T.RUBBLE,river:T.WATER, road:T.ROAD,  title:'Coastal'},
    mountain:{base:T.RUBBLE,scatter:T.SNOW,  river:T.WATER, road:T.DIRT,  title:'Mountain Pass'},
    tundra:  {base:T.SNOW,  scatter:T.RUBBLE,river:T.WATER, road:T.DIRT,  title:'Tundra'},
    wastes:  {base:T.DIRT,  scatter:T.RUBBLE,river:T.LAVA,  road:T.ROAD,  title:'Blighted Wastes'},
    savalirwood:{base:T.GRASS,scatter:T.TREES,river:T.WATER,road:T.DIRT,  title:'Savalirwood'},
  }[theme] || {base:T.GRASS,scatter:T.TREES,river:T.WATER,road:T.ROAD,title:'Outdoors'};

  const grid = makeGrid(W,H,cfg.base);

  // Scatter terrain
  const scatterCount = cfg.base===T.SNOW ? 100 : cfg.base===T.RUBBLE ? 120 : 150;
  for (let i=0;i<scatterCount;i++) {
    const x=Math.floor(Math.random()*W), y=Math.floor(Math.random()*H);
    grid[y][x]=cfg.scatter;
  }
  // Clusters
  for (let i=0;i<20;i++) {
    const cx=Math.floor(Math.random()*W), cy=Math.floor(Math.random()*H);
    for (let dy=-1;dy<=1;dy++) for (let dx=-1;dx<=1;dx++) {
      const ny=cy+dy,nx=cx+dx;
      if (ny>=0&&ny<H&&nx>=0&&nx<W) grid[ny][nx]=cfg.scatter;
    }
  }

  // River / lava flow
  let ry=5+Math.floor(Math.random()*(H-10));
  for (let x=0;x<W;x++) {
    ry=clamp(ry+(Math.random()<0.3?(Math.random()<0.5?1:-1):0),1,H-2);
    grid[ry][x]=cfg.river;
    if (Math.random()<0.4) grid[clamp(ry+1,0,H-1)][x]=cfg.river;
  }

  // Road
  let roadY=Math.floor(H/2);
  for (let x=0;x<W;x++) {
    roadY=clamp(roadY+(Math.random()<0.2?(Math.random()<0.5?1:-1):0),1,H-2);
    grid[roadY][x]=cfg.road;
  }

  // Clearings / ruins
  for (let i=0;i<5;i++) {
    const fx=3+Math.floor(Math.random()*(W-8));
    const fy=3+Math.floor(Math.random()*(H-8));
    const r=1+Math.floor(Math.random()*2);
    for (let dy=-r;dy<=r;dy++) for (let dx=-r*2;dx<=r*2;dx++) {
      const ny=fy+dy,nx=fx+dx;
      if (ny>=0&&ny<H&&nx>=0&&nx<W) grid[ny][nx]=T.DIRT;
    }
  }

  return {grid,W,H,rooms:[],labels:[],title:cfg.title, mapTheme:theme};
}

function genInterior(template='tavern') {
  const W=60,H=30;
  const grid=makeGrid(W,H);
  const tpls = {
    tavern:[
      {name:'Common Room',x:4,y:4,w:20,h:16},
      {name:'Kitchen',x:26,y:4,w:10,h:8},
      {name:'Cellar',x:26,y:14,w:6,h:4},
      {name:'Private Room',x:38,y:4,w:8,h:8},
      {name:'Storeroom',x:38,y:14,w:8,h:6},
    ],
    castle:[
      {name:'Great Hall',x:16,y:4,w:28,h:12},
      {name:'Throne Room',x:22,y:4,w:14,h:6},
      {name:'Guard Post',x:4,y:4,w:8,h:8},
      {name:'Guard Post',x:48,y:4,w:8,h:8},
      {name:'Dungeon Entry',x:4,y:20,w:12,h:7},
      {name:'Armory',x:42,y:20,w:12,h:7},
    ],
    ship:[
      {name:'Cargo Hold',x:5,y:8,w:48,h:8},
      {name:"Captain's Cabin",x:44,y:18,w:12,h:8},
      {name:'Crew Quarters',x:5,y:18,w:16,h:8},
      {name:'Galley',x:23,y:18,w:12,h:8},
    ],
    temple:[
      {name:'Nave',x:8,y:4,w:16,h:22},
      {name:'Sanctuary',x:26,y:4,w:24,h:10},
      {name:'Vestry',x:26,y:16,w:10,h:10},
      {name:'Catacombs',x:38,y:16,w:12,h:10},
    ],
    mansion:[
      {name:'Entry Hall',x:24,y:4,w:10,h:6},
      {name:'Dining Room',x:4,y:12,w:16,h:10},
      {name:'Library',x:38,y:12,w:14,h:10},
      {name:'Study',x:4,y:4,w:12,h:6},
      {name:'Drawing Room',x:18,y:12,w:14,h:10},
      {name:"Master's Chamber",x:40,y:4,w:14,h:6},
      {name:'Kitchen',x:22,y:22,w:14,h:6},
    ],
  };

  const rooms = (tpls[template]||tpls.tavern).map(r => ({...r}));

  rooms.forEach((r,i) => {
    // Paint room
    for (let y=r.y;y<r.y+r.h&&y<H;y++)
      for (let x=r.x;x<r.x+r.w&&x<W;x++)
        grid[y][x]=T.FLOOR;
    // Connect to previous room with corridor + door
    if (i>0) {
      const prev=rooms[i-1];
      const cx=Math.floor(r.x+r.w/2), cy=r.y;
      const pcx=Math.floor(prev.x+prev.w/2), pcy=prev.y+prev.h;
      if (cy>pcy) {
        for (let y=pcy;y<=cy;y++) if (y>=0&&y<H) grid[y][clamp(cx,0,W-1)]=T.FLOOR;
        if (pcy-1>=0) grid[pcy-1][clamp(pcx,0,W-1)]=T.DOOR;
      }
      grid[r.y][clamp(cx,0,W-1)]=T.DOOR;
    }
  });

  // Template-specific features
  if (template==='tavern') {
    const cr=rooms[0];
    grid[cr.y+1][Math.floor(cr.x+cr.w/2)]=T.RUBBLE; // hearth
    for (let i=0;i<4;i++) { // tables
      const tx=cr.x+2+Math.floor(Math.random()*(cr.w-4));
      const ty=cr.y+3+Math.floor(Math.random()*(cr.h-6));
      if (grid[ty]&&grid[ty][tx]===T.FLOOR) grid[ty][tx]=T.CHEST;
    }
  } else if (template==='temple') {
    const sanc=rooms[1];
    grid[sanc.y+2][Math.floor(sanc.x+sanc.w/2)]=T.CHEST; // altar
    const nave=rooms[0];
    for (let y=nave.y+2;y<nave.y+nave.h-2;y+=4) {
      grid[y][nave.x+1]=T.PILLAR;
      grid[y][nave.x+nave.w-2]=T.PILLAR;
    }
  } else if (template==='castle') {
    const throne=rooms[1];
    grid[throne.y+2][Math.floor(throne.x+throne.w/2)]=T.CHEST;
    const hall=rooms[0];
    for (let y=hall.y+2;y<hall.y+hall.h-2;y+=3) {
      grid[y][hall.x+2]=T.PILLAR;
      grid[y][hall.x+hall.w-3]=T.PILLAR;
    }
  }

  const titles={tavern:'Tavern / Inn',castle:'Castle Keep',ship:'Sailing Ship',temple:'Temple / Shrine',mansion:'Noble Mansion'};
  const labels=rooms.map(r=>({x:Math.floor(r.x+r.w/2),y:Math.floor(r.y+r.h/2),text:r.name}));
  return {grid,W,H,rooms,labels,title:titles[template]||template, mapTheme:template};
}

function genWildemount(subtype='xhorhas_wastes') {
  const subtypeMap = {
    xhorhas_wastes:   {fn:'outdoor',arg:'wastes'},
    aeor_ruins:       {fn:'dungeon',arg:'underdark'},
    rosohna:          {fn:'interior',arg:'mansion'},
    dwendalian_keep:  {fn:'interior',arg:'castle'},
    menagerie_port:   {fn:'interior',arg:'tavern'},
    savalirwood:      {fn:'outdoor',arg:'savalirwood'},
    eiselcross:       {fn:'outdoor',arg:'tundra'},
    kryn_temple:      {fn:'interior',arg:'temple'},
    cerberus_lab:     {fn:'dungeon',arg:'cerberus_lab'},
    bazzoxan:         {fn:'dungeon',arg:'bazzoxan'},
  };
  const cfg=subtypeMap[subtype]||{fn:'dungeon',arg:'standard'};
  const names={xhorhas_wastes:'Xhorhas Wastes',aeor_ruins:'Ruins of Aeor',rosohna:'Rosohna District',dwendalian_keep:'Dwendalian Keep',menagerie_port:'Menagerie Port Docks',savalirwood:'Savalirwood',eiselcross:'Eiselcross Tundra',kryn_temple:'Kryn Temple',cerberus_lab:'Cerberus Assembly Laboratory',bazzoxan:'Bazzoxan Caverns'};
  let result;
  if (cfg.fn==='outdoor') result=genOutdoor(cfg.arg);
  else if (cfg.fn==='interior') result=genInterior(cfg.arg);
  else result=genDungeon(cfg.arg);
  result.title=names[subtype]||result.title;
  return result;
}

// ── NPC Generator ─────────────────────────────────────────────────────────────

// ── NPC detail tables ─────────────────────────────────────────────────────────

const _NPC_APPEARANCE = [
  'weathered skin and a permanent squint from years in harsh light, a scar across the chin from a fight they won',
  'tall and angular with unusually still hands and the habit of standing sideways in doorways',
  'stocky build, close-cropped hair going grey at the temples, ink stains on the right hand that never fully wash out',
  'a slight limp on the left side, otherwise moves with the deliberate economy of someone trained to conserve energy',
  'expressive face that cycles through twelve emotions before settling on the one they meant to show',
  'remarkable posture — military straight, never relaxes, blinks less than average',
  'compact and quick, the kind of person who finds a clear sightline to every exit without thinking about it',
  'old burn scarring from the wrist to the elbow, never mentioned, never hidden',
  'striking eyes — the kind people comment on, which the NPC finds exhausting',
  'perpetually overdressed for any given situation, or perpetually underdressed, never in between',
  'calloused hands that don\'t match the rest of their appearance',
  'a distinctive piece of jewelry they touch when lying or under stress',
  'moves like they\'re always slightly behind the beat of the room — observing before participating',
  'taller than expected, with the social habit of making themselves smaller in conversation',
  'a voice that doesn\'t match the face — too deep, too light, too confident, too young',
];

const _NPC_VOICES = [
  'speaks in complete, precise sentences; never uses contractions; full stops are audible',
  'low and unhurried — every sentence lands like it was considered first',
  'rapid and layered; three thoughts running at once and only two of them make it out',
  'formal in phrasing but warm in tone; was educated somewhere else',
  'economical to the edge of rudeness, then suddenly expansive when something interests them',
  'uses silence deliberately — pauses where other people would fill',
  'cheerful affect that doesn\'t reach the eyes',
  'a particular regional accent they can\'t or won\'t suppress',
  'speaks more quietly when agitated, not louder; people who know them read this as danger',
  'changes register completely depending on who they\'re speaking to — not dishonest, just adaptive',
  'dry, with a habit of framing observations as questions they already know the answer to',
  'slightly too formal for the situation, like they memorized a different script',
];

const _NPC_IDEALS = [
  'Information is power and information should be free — eventually',
  'Loyalty to those who earn it is the only thing worth having',
  'The law is a framework; the spirit of it matters more than the letter',
  'Survival first. Principles after. In that order, without apology',
  'There are no clean hands in this world, only varying degrees of compromise',
  'The weak need protecting; no one else is going to do it',
  'Knowledge for its own sake, regardless of what it costs',
  'Peace — not as weakness but as the hardest work there is',
  'Debts must be settled; that goes both ways',
  'Change from within, because the alternative is burning it down',
  'The truth is the truth regardless of who\'s inconvenienced by it',
  'Family — blood or chosen — is the only answer to any question that matters',
];

const _NPC_FLAWS = [
  'cannot admit they\'re wrong in the moment — will acknowledge it later, alone, and never say so',
  'trusts too readily once the initial suspicion is overcome',
  'has a category of people they\'ve written off and will not revisit that conclusion',
  'underestimates how intimidating they are to people who don\'t know them',
  'collects obligations that eventually outweigh resources',
  'a past decision they\'d undo if they could, and the way it occasionally surfaces at the wrong moment',
  'overconfidence in a specific type of situation they have a history of misjudging',
  'a temper on a long fuse that burns very hot when it finally reaches the end',
  'difficulty asking for help even when it would obviously solve the problem',
  'periodic paralysis at exactly the wrong moment when the stakes are too high',
  'a vice — drink, gambling, something — that they have under control except when they don\'t',
  'a grudge they\'ve been carrying for years that occasionally makes decisions for them',
];

const _NPC_BONDS = [
  'a person — alive or dead — whose judgment they still measure themselves against',
  'a place they will never name to strangers but return to in their thoughts when things are bad',
  'a promise made under bad circumstances that they\'ve kept past all reason',
  'a piece of work — a project, a cause, something built — that cannot be abandoned',
  'someone who depends on them who doesn\'t know the full cost of that dependency',
  'a debt of loyalty to a person or organization that complicates everything else',
  'a mistake they\'re still making right by incremental acts',
  'a truth they know that they\'ve never told the person who needs to hear it',
];

const _NPC_SECRETS = [
  'is informing on the faction they\'re affiliated with — not for money, for reasons they consider legitimate',
  'was responsible for an event they\'ve let someone else carry the blame for; the other person doesn\'t know',
  'is not who they say they are; the real identity is complicated but not malicious',
  'knows where something important is — an item, a person, a document — and has decided not to act on it',
  'owes a debt to someone they have reason to fear, and the repayment terms haven\'t been named yet',
  'was present when something went wrong that they\'ve never fully disclosed; the details matter',
  'has been in contact with a group they publicly have no connection to',
  'a relationship — past or ongoing — that would change how people read their current position',
  'knows something about the party that the party doesn\'t know about themselves',
  'has a contingency plan that would surprise everyone who thinks they know them',
  'has been dying slowly and has decided not to let it change the work',
  'believes something true that, if spoken aloud, would end the current equilibrium',
];

const _NPC_GOALS = [
  'resolve one specific situation before it becomes someone else\'s problem',
  'locate a person who has been missing for too long without enough concern from the people who should care',
  'obtain a piece of information that would settle a question they\'ve been living with for years',
  'make a decision they\'ve been deferring and live with the consequences',
  'get out — of a city, a faction, a role, a relationship — cleanly and without leaving a trail',
  'protect something or someone without the thing or person knowing they need protection',
  'complete a piece of work before circumstances make it impossible',
  'find out if a particular person can be trusted before having to act as though they can',
  'repay a debt — material, moral, or personal — that\'s been outstanding too long',
  'confirm whether they\'re being watched and by whom',
];

const _NPC_SESSION_HOOKS = [
  'will trade information for a specific favor they won\'t explain until the party agrees',
  'has been watching the party without their knowledge and makes a calculated introduction',
  'is in immediate danger from something they brought on themselves and need help they\'re reluctant to ask for',
  'possesses something the party needs and doesn\'t know its value yet',
  'will offer work — real work, paid work — if the party can prove they\'re not agents of a specific faction',
  'has a message for someone the party has met and uses this as an opening',
  'is at a location the party arrives at for a different reason and their presence there is not coincidental',
  'needs a favor done quietly and is prepared to pay in something other than gold',
  'is conducting surveillance on the same location or target the party is interested in; interests may align',
  'will become relevant in exactly the circumstance the party is currently trying to avoid',
];

const _NPC_COMBAT_STYLE = {
  Fighter:    'Engages directly; reads terrain for chokepoints; targets the healer first if any',
  Wizard:     'Opens with a crowd-control spell, falls back immediately; concentrates hard on escape',
  Rogue:      'Never in a fair fight if they can help it; waits for advantage; prioritizes disabling over killing',
  Cleric:     'Buffs allies before engaging; uses healing tactically not reactively; last to fall if possible',
  Ranger:     'Prefers distance; repositions every round; has prepared the terrain in advance if possible',
  Paladin:    'Anchors the front line; calls out the most dangerous target and moves toward it',
  Barbarian:  'Charges the center; ignores damage; fixates on the biggest threat present',
  Druid:      'Wild shapes immediately if pressed; uses the environment; avoids direct confrontation',
  Bard:       'Stays mobile; disrupts rather than damages; has an escape route pre-planned',
  Warlock:    'Consistent ranged pressure; repositions when threatened; saves big spells for genuine emergencies',
  Sorcerer:   'Explosive opening, then cautious; hates being surprised; uses Subtle Spell to hide casting',
  Monk:       'Lightning first strike; uses Stunning Strike when it counts; never stays in one place',
  Artificer:  'Gadgets first; keeps distance; treats the fight as a problem to be solved',
  'Echo Knight': 'Splits threat across echo and self; baits attacks; uses the echo to flank',
  Chronurgist:'Extremely dangerous if given preparation time; tries to force the first action, controls sequence',
  Graviturgist:'Controls the battlefield geometry; the creature that doesn\'t seem like the threat is the one to watch',
};

const _NPC_EQUIPMENT = {
  Fighter:   ['longsword or battleaxe','chain mail or plate armor','shield (often)','a second weapon and throwing axes'],
  Wizard:    ['spellbook (well-worn, annotated in margins)','arcane focus or wand','dagger as a last resort','component pouch'],
  Rogue:     ['two short blades or a rapier','leather armor','thieves\' tools always on person','a small concealed weapon'],
  Cleric:    ['mace or warhammer','chain mail or scale mail','holy symbol','healer\'s kit'],
  Ranger:    ['longbow with varied ammunition','shortsword backup','studded leather','a specific field kit for their terrain'],
  Paladin:   ['longsword or glaive','half plate or plate','holy symbol','a personal token with meaning'],
  Barbarian: ['greataxe or maul','no armor by preference (or hide armor)','javelins','something taken from a defeated enemy'],
  Druid:     ['staff or scimitar','natural armor or hide','wooden focus','herbalism kit and specific gathered materials'],
  Bard:      ['rapier or hand crossbow','light armor','instrument (always)','a small journal they\'re cagey about'],
  Warlock:   ['eldritch focus','dark clothing','a blade they barely know how to use','a pact-related item they don\'t discuss'],
  Sorcerer:  ['arcane focus (distinctive)','traveling clothes or light armor','a very small backup weapon','something from their bloodline origin'],
  Monk:      ['unarmed (preferred)','shortsword or staff backup','simple clothing that doesn\'t restrict movement','nothing unnecessary'],
  Artificer: ['a custom tool or infused item','medium armor with modifications','hand crossbow or light weapon','a satchel of components'],
};

function generateNPC(opts={}) {
  const race  = opts.race  || pick(RACES);
  const cls   = opts.cls   || pick(CLASSES);
  const level = opts.level || clamp(Math.random()<0.55?roll(4):Math.random()<0.7?4+roll(4):8+roll(4),1,20);
  const alignment = pick(ALIGNMENTS);
  const regionKey = opts.region || pick(Object.keys(REGIONS));
  const region = REGIONS[regionKey];

  const regionFactions = FACTIONS.filter(f=>f.region===regionKey||f.region===regionKey);
  const faction = opts.faction
    ? FACTIONS.find(f=>f.name===opts.faction)||pick(FACTIONS)
    : pick(regionFactions.length ? regionFactions : FACTIONS);

  const allCultures = Object.keys(NAMES);
  const cultureMap = {'Western Wynandir':'Zemnian','Xhorhas':'Xhorhasian','Menagerie Coast':'Coastal','Greying Wildlands':Math.random()<0.5?'Zemnian':'Coastal','Eiselcross':'Zemnian'};
  const culture = cultureMap[regionKey] || pick(allCultures);
  const names = NAMES[culture] || NAMES[allCultures[0]];
  const isFemale = Math.random() < 0.5;
  const firstName = pick(isFemale ? names.first_f : names.first_m);
  const lastName = pick(names.last);

  const stats = {STR:rollStat(),DEX:rollStat(),CON:rollStat(),INT:rollStat(),WIS:rollStat(),CHA:rollStat()};
  const prime = CLASS_PRIME[cls];
  if (prime && stats[prime]<14) stats[prime]=14+Math.floor(Math.random()*4);

  const hd = CLASS_HIT_DICE[cls]||8;
  const conMod = statMod(stats.CON);
  const maxHp = Math.max(1, hd + conMod + (level-1) * (Math.floor(hd/2)+1+conMod));
  const acBase = 10+statMod(stats.DEX);
  const ac = cls==='Fighter'||cls==='Paladin'?acBase+4:cls==='Monk'?acBase+statMod(stats.WIS):cls==='Barbarian'?acBase+statMod(stats.CON):acBase;
  const profBonus = Math.ceil(level/4)+1;
  const initiative = statMod(stats.DEX);
  const speed = cls==='Monk'?30+10*Math.floor(level/4):30;

  // Saving throw proficiencies (class primary saves)
  const saveProfMap = {Fighter:['STR','CON'],Wizard:['INT','WIS'],Rogue:['DEX','INT'],Cleric:['WIS','CHA'],Ranger:['STR','DEX'],Paladin:['WIS','CHA'],Barbarian:['STR','CON'],Druid:['INT','WIS'],Bard:['DEX','CHA'],Warlock:['WIS','CHA'],Sorcerer:['CON','CHA'],Monk:['STR','DEX'],Artificer:['CON','INT'],'Echo Knight':['STR','CON'],Chronurgist:['WIS','INT'],Graviturgist:['CON','STR']};
  const saveProfs = saveProfMap[cls]||['STR','CON'];
  const saves = {};
  ['STR','DEX','CON','INT','WIS','CHA'].forEach(k=>{
    saves[k] = statMod(stats[k]) + (saveProfs.includes(k)?profBonus:0);
  });

  // Skills (2 primary from class + 2 random)
  const classSkillMap = {Fighter:['Athletics','Intimidation'],Wizard:['Arcana','History'],Rogue:['Stealth','Sleight of Hand'],Cleric:['Religion','Medicine'],Ranger:['Perception','Survival'],Paladin:['Persuasion','Religion'],Barbarian:['Athletics','Survival'],Druid:['Nature','Perception'],Bard:['Persuasion','Performance'],Warlock:['Arcana','Deception'],Sorcerer:['Arcana','Persuasion'],Monk:['Acrobatics','Stealth'],Artificer:['Investigation','Arcana'],'Echo Knight':['Athletics','Perception'],Chronurgist:['Arcana','History'],Graviturgist:['Arcana','Athletics']};
  const allSkills=['Athletics','Acrobatics','Stealth','Arcana','History','Nature','Religion','Insight','Medicine','Perception','Persuasion','Deception','Intimidation','Performance','Survival','Sleight of Hand','Investigation'];
  const classSkills = classSkillMap[cls]||['Perception','Insight'];
  const bonusSkills = pick(allSkills.filter(s=>!classSkills.includes(s)));
  const trainedSkills = [...classSkills, bonusSkills];

  const bg = pick(BACKGROUNDS).replace('{faction}',faction.name).replace('{location}',pick(region.locations));

  // Build faction role description
  const factionRoles = {
    'Dwendalian Empire':['field officer with independent mandate','embedded intelligence asset with civilian cover','liaison between military and civilian governance','press-gang supervisor quietly questioning the work'],
    'Cerberus Assembly':['junior researcher with clearance they probably shouldn\'t have','field operative who knows too many results without understanding the methodology','acquisitions agent: find it, bring it back, don\'t ask','senior mage managing three ongoing projects and one they haven\'t reported'],
    'Kryn Dynasty':['consecuted warrior on a long patrol far from home','embassy functionary in hostile territory','dunamancer in the middle of something theoretical that became practical','Umavi escort trying to keep a recently reborn soul oriented'],
    'Cobalt Soul':['expositor following a corruption thread that goes higher than expected','archive keeper who found something in the stacks that shouldn\'t be there','itinerant monk building a case one piece of evidence at a time','senior archivist who knows what everyone is looking for and why'],
    'The Revelry':['crew member with too much initiative','navigator with a private arrangement on the side','boarding specialist between contracts and looking for work','captain of a small vessel with one complicated rule about who they won\'t take jobs against'],
    'The Myriad':['courier who knows the route but not the contents','debt collector with ethical limits that keep getting tested','fixer in a city that doesn\'t officially acknowledge their existence','lieutenant managing an operation that has grown past their instructions'],
    'Clovis Concord':['inspector who\'s found something a merchant doesn\'t want found','trade arbitrator whose neutrality is being purchased from both sides','port administrator with an excellent memory for faces','Zhelezo officer running down a smuggling lead that keeps branching'],
    'default':['freelance operative with a current contract and a past they don\'t advertise','local expert consulted when official channels won\'t do','retired professional reluctantly back in the field','independent agent with connections to more factions than they\'d admit'],
  };
  const rolePool = factionRoles[faction.name]||factionRoles.default;
  const factionRole = pick(rolePool);

  // Connections
  const connTemplates = [
    `owes a significant favor to someone in ${pick(region.locations)} who hasn\'t called it in yet`,
    `was trained by or served under a person now on the opposite side of something important`,
    `has a contact inside ${pick(FACTIONS.filter(f=>f.name!==faction.name).map(f=>f.name)||[faction.name])} that neither side officially acknowledges`,
    `knows a secret about a prominent ${faction.name} figure that they\'ve chosen not to use`,
    `has family in ${pick(region.locations)} whose safety constrains what they\'re willing to do`,
    `is owed a debt by someone in a position to be useful or dangerous depending on the timing`,
    `worked with someone who became an enemy through circumstance rather than choice`,
    `has an established identity in ${pick(region.locations)} that exists for professional reasons`,
  ];

  return {
    id: uuid(),
    created: Date.now(),

    // Identity
    name: `${firstName} ${lastName}`,
    race, class: cls, level, alignment,
    region: regionKey, faction: faction.name, culture,
    isFemale,

    // Stats
    stats, saves, maxHp, hp: maxHp, ac, profBonus, initiative, speed,
    trainedSkills,

    // Character
    appearance: pick(_NPC_APPEARANCE),
    voice: pick(_NPC_VOICES),
    personality: pick(PERSONALITIES),
    ideal: pick(_NPC_IDEALS),
    flaw: pick(_NPC_FLAWS),
    bond: pick(_NPC_BONDS),
    secret: pick(_NPC_SECRETS),
    goal: pick(_NPC_GOALS),
    background: bg,
    factionRole,
    connection: pick(connTemplates),

    // Tactical
    combatStyle: _NPC_COMBAT_STYLE[cls] || 'Fights practically; prioritizes survival over heroics',
    equipment: _NPC_EQUIPMENT[cls] || ['a weapon appropriate to their class','traveling gear','nothing they can\'t leave behind'],

    // Session use
    sessionHook: pick(_NPC_SESSION_HOOKS),
    dmNote: `Their secret (${pick(_NPC_SECRETS).slice(0,70)}…) should surface if the party spends real time with them. The flaw ("${pick(_NPC_FLAWS).slice(0,50)}…") is the lever.`,
  };
}

// ── Quest Generator ───────────────────────────────────────────────────────────

const _QT = [ // quest type templates
  { type:'retrieval',   verb:'Retrieve',  icon:'📦' },
  { type:'elimination', verb:'Eliminate', icon:'🗡' },
  { type:'escort',      verb:'Escort',    icon:'🛡' },
  { type:'investigation',verb:'Investigate',icon:'🔍' },
  { type:'rescue',      verb:'Rescue',    icon:'⛓' },
  { type:'sabotage',    verb:'Sabotage',  icon:'💣' },
  { type:'heist',       verb:'Steal',     icon:'🎭' },
  { type:'diplomacy',   verb:'Negotiate', icon:'🤝' },
  { type:'defense',     verb:'Defend',    icon:'🏰' },
  { type:'exploration', verb:'Explore',   icon:'🗺' },
];

const _VILLAIN_TYPES = [
  { arch:'corrupt official',   motiv:'accumulating personal power before the war ends',       secret:'has been feeding military positions to the Myriad for a cut of the spoils' },
  { arch:'Assembly mage',      motiv:'finishing a forbidden experiment that cost three lives already', secret:'the experiment is working — and they know it shouldn\'t be' },
  { arch:'Myriad lieutenant',  motiv:'paying off a debt to someone worse than themselves',    secret:'has a family they\'re trying to protect and the debt is a threat against them' },
  { arch:'cult leader',        motiv:'genuine belief — the Betrayer God they serve promised them something', secret:'the god hasn\'t answered in six months and they\'re improvising' },
  { arch:'disgraced noble',    motiv:'reclaiming a title stripped by false accusation',       secret:'the accusation wasn\'t entirely false, but the punishment was disproportionate' },
  { arch:'mercenary captain',  motiv:'fulfilling a contract without understanding its purpose', secret:'now knows what they\'re helping with and is too far in to stop' },
  { arch:'Kryn dissenter',     motiv:'breaking Dynasty doctrine they believe is becoming tyrannical', secret:'they\'re right, but their methods are creating the very crisis they feared' },
  { arch:'ancient undead',     motiv:'completing work left unfinished before death',          secret:'the work was unfinished for a reason — someone stopped them last time' },
  { arch:'rival adventurer',   motiv:'the same thing the party wants, for different reasons', secret:'was hired by the same person who hired the party — and knows it' },
  { arch:'Volstrucker agent',  motiv:'following orders they can\'t refuse',                  secret:'the orders came from above their handler — someone in the Assembly is operating outside the chain' },
];

const _GIVER_ROLES = [
  { role:'faction envoy',   personality_hint:'composed but clearly under pressure, choosing words with surgical care' },
  { role:'desperate merchant', personality_hint:'visibly frightened, has clearly not slept, keeps checking the door' },
  { role:'Cobalt Soul monk',personality_hint:'serene but urgent — they\'ve already exhausted every official option' },
  { role:'grieving relative',personality_hint:'grief and fury in equal measure, wants justice more than they want the party to be safe' },
  { role:'anonymous informant',personality_hint:'face obscured, voice altered, knows far more than they should' },
  { role:'local authority',  personality_hint:'embarrassed to ask outsiders, very clear about what will happen if word gets out' },
  { role:'former enemy',     personality_hint:'hates asking and wants the party to know they know it' },
  { role:'dying witness',    personality_hint:'calm — they\'ve already processed the worst; they just need someone to finish it' },
];

const _ALLY_ROLES = [
  { role:'informant inside the enemy group', use:'can pass messages, open one locked door, confirm one piece of intel' },
  { role:'local guide who knows the terrain', use:'advantage on navigation, knows two hidden routes, owes someone a favor' },
  { role:'disgruntled faction member',         use:'will testify, will forge a document once, won\'t fight' },
  { role:'scholar who knows the relevant history', use:'can identify artifacts, translate one text, explain one trap mechanism' },
  { role:'fence who moves stolen goods',        use:'can source one unusual item, knows who\'s bought what recently' },
  { role:'a child who was there and saw everything', use:'perfect memory of what happened, completely unreliable narrator' },
  { role:'retired adventurer',                  use:'will fight once in a genuine emergency; has seen this before' },
  { role:'Cobalt Soul archivist',               use:'can verify documents, identify seals, find records faster than anyone else' },
];

const _ACT_STRUCTURES = {
  retrieval: [
    { name:'Act I — Find It',      tmpl:'Locate {object} in {loc1}. The trail leads through {terrain}. Someone got there first and left in a hurry.' },
    { name:'Act II — Take It',     tmpl:'The {object} is guarded or trapped. Getting it out without triggering {complication} requires {approach}.' },
    { name:'Act III — Keep It',    tmpl:'The moment the party has it, someone else wants it. The road back to {loc3} is no longer safe.' },
  ],
  elimination: [
    { name:'Act I — Find Them',    tmpl:'Track the target through {loc1}. The target knows they\'re being hunted and has taken precautions in {terrain}.' },
    { name:'Act II — Get Close',   tmpl:'Reach the target in {loc2}. Their protection is {complication}. The approach requires {approach}.' },
    { name:'Act III — The Reckoning', tmpl:'Confront the target. They have a last card to play. The outcome at {loc3} isn\'t as clean as the contract suggested.' },
  ],
  escort: [
    { name:'Act I — Meet the Client', tmpl:'The client is harder to move than expected. Their situation at {loc1} is more complicated than the briefing described.' },
    { name:'Act II — The Road',    tmpl:'Three days through {terrain}. The route through {loc2} is compromised. Someone knows the party is coming.' },
    { name:'Act III — Delivery',   tmpl:'The destination at {loc3} is not what was promised. The client knows something. The question is whether it changes things.' },
  ],
  investigation: [
    { name:'Act I — The Surface',  tmpl:'The obvious answer at {loc1} is wrong. Evidence in {terrain} points somewhere no one wanted to look.' },
    { name:'Act II — The Thread',  tmpl:'Pulling the thread leads to {loc2}. Someone is actively destroying evidence. {complication} is a distraction.' },
    { name:'Act III — The Truth',  tmpl:'The real answer leads to {loc3}. Knowing it creates a problem: the party now has to decide what to do with it.' },
  ],
  rescue: [
    { name:'Act I — Find Where',   tmpl:'Locate the prisoner in {loc1}. They were moved recently. The current holding location is {terrain}.' },
    { name:'Act II — Get In',      tmpl:'Infiltrate {loc2}. The obstacle is {complication}. Getting in is one problem. Getting out is another.' },
    { name:'Act III — Get Out',    tmpl:'The prisoner is alive — barely, or not what the party expected. The exit through {loc3} is now contested.' },
  ],
  sabotage: [
    { name:'Act I — Recon',        tmpl:'Assess the target at {loc1}. Security in {terrain} is higher than reported. Someone tipped them off.' },
    { name:'Act II — The Work',    tmpl:'Execute the sabotage at {loc2}. {complication} was not in the briefing. The plan needs to change.' },
    { name:'Act III — The Fallout',tmpl:'The sabotage succeeded — partially. Something at {loc3} wasn\'t supposed to happen. Now it has.' },
  ],
  heist: [
    { name:'Act I — The Plan',     tmpl:'Case {loc1}. Map the security at {terrain}. Someone who works there is willing to help — for a price and with conditions.' },
    { name:'Act II — The Job',     tmpl:'Execute at {loc2}. Two things go wrong. One was anticipated. {complication} was not.' },
    { name:'Act III — The Exit',   tmpl:'The job is done. The exit through {loc3} is the problem. Someone knew before the party got in.' },
  ],
  diplomacy: [
    { name:'Act I — The Parties',  tmpl:'Meet both sides at {loc1}. Neither is negotiating in good faith. {complication} explains why.' },
    { name:'Act II — The Obstacle',tmpl:'A third party is actively sabotaging the talks. Their asset is operating from {loc2} in {terrain}.' },
    { name:'Act III — The Table',  tmpl:'Return to the table at {loc3} with leverage. An agreement is possible — the question is whether either party will honor it.' },
  ],
  defense: [
    { name:'Act I — Fortify',      tmpl:'Assess and prepare {loc1}. The defenses are worse than reported. {complication} is already inside.' },
    { name:'Act II — The Assault', tmpl:'The attack comes from {terrain} in a direction nobody expected. The second wave targets {loc2}.' },
    { name:'Act III — The Cost',   tmpl:'The location is held — but {loc3} paid a price. Something important was lost or someone important was taken.' },
  ],
  exploration: [
    { name:'Act I — The Edge',     tmpl:'Reach the boundary of known territory at {loc1}. The terrain past {terrain} changes in ways the maps don\'t show.' },
    { name:'Act II — The Interior',tmpl:'The site at {loc2} is occupied. Something or someone has been here. {complication} suggests they haven\'t left.' },
    { name:'Act III — The Discovery',tmpl:'The full picture at {loc3} is not what anyone expected. It raises more questions than it answers. Some of those questions are dangerous.' },
  ],
};

const _TWISTS = [
  'The quest giver is withholding the real reason they need this done — but their reason is genuinely sympathetic.',
  'One of the NPCs the party has been treating as an ally is reporting to the enemy. They\'ve been doing it reluctantly and badly.',
  'The "villain" is acting on accurate information that the faction giving the quest doesn\'t want known.',
  'The object, person, or location at the center of the quest is not what it was described as.',
  'A second party — completely unrelated to either side — has the same objective and has been one step ahead the whole time.',
  'The target knows the party is coming and has been using the approach as a distraction.',
  'Someone important to the quest is already dead. Has been for longer than anyone admits.',
  'The complication is intentional — planted by the quest giver to ensure the party has no choice but to proceed.',
  'The reward offered is real but is itself the thing that creates the next problem.',
  'What the faction called a "retrieval" is a destruction order. They just knew the party wouldn\'t accept it if framed that way.',
  'The location the quest is set in has a secret the locals protect collectively — and the quest threatens to expose it.',
  'The enemy and the quest giver used to be the same person, faction, or cause. The split was recent and traumatic.',
  'One piece of the party\'s own background is directly connected to this situation. They don\'t know it yet.',
  'The "simple job" is a test. Someone is watching the entire time to see how the party makes the hard choices.',
  'There are two correct solutions and they are mutually exclusive. No one told the party that upfront.',
];

const _COMPLICATIONS = [
  'A patrol with unusual orders is covering exactly the route the party planned to use.',
  'Weather has sealed the fastest approach — the only option adds a day and goes through contested territory.',
  'The contact who was supposed to help is unavailable. The only replacement is someone who owes the party nothing.',
  'A Cobalt Soul investigator is already here and asking questions that overlap with the party\'s business.',
  'The item/person being sought has been moved once since the intel was gathered.',
  'Someone is burning the evidence. The party has an hour before the trail goes cold.',
  'A second faction has the same objective and less patience.',
  'The local authority is cooperating — until they understand what\'s actually happening, at which point they become an obstacle.',
  'An innocent party is in the middle of it. What the quest requires will harm them unless the party improvises.',
  'The villain has leverage: a hostage, blackmail material, or a contingency that triggers on their death.',
  'The party\'s approach has been assumed by someone inside the enemy group. They\'ve been playing along to gather information.',
  'There\'s a third objective nobody mentioned that the quest giver absolutely requires and won\'t explain in advance.',
];

const _RESOLUTIONS = {
  clean:    { name:'Clean Success',   tmpl:'Objective achieved. {faction} gets what it wanted. The party earned the reward and no unexpected consequences are immediately visible.' },
  messy:    { name:'Messy Success',   tmpl:'Objective achieved, but {complication} created collateral damage the faction will need to manage. The reward is paid. Someone is unhappy.' },
  twist:    { name:'Pyrrhic Win',     tmpl:'The goal is achieved but the twist has changed what victory means. The faction is satisfied; the party may not be.' },
  partial:  { name:'Partial Success', tmpl:'The primary objective was completed but something was lost — time, an ally, evidence, or a secondary goal. Reward is partial.' },
  backfire: { name:'The Truth Costs', tmpl:'Success revealed something the party wasn\'t meant to know. The faction is pleased with the outcome and uncomfortable with the party\'s new knowledge.' },
  defect:   { name:'Turn the Table',  tmpl:'The party refuses the final order and finds a third option — protecting the target, exposing the client, or negotiating something the faction didn\'t authorize.' },
};

function _qNpcName() {
  const cultures=Object.keys(NAMES);
  const c=NAMES[pick(cultures)];
  const isFemale=Math.random()<0.5;
  const first=pick(isFemale?c.first_f:c.first_m);
  const last=pick(c.last);
  return `${first} ${last}`;
}

function generateQuest(opts={}) {
  const faction = opts.faction
    ? FACTIONS.find(f=>f.name===opts.faction)||pick(FACTIONS)
    : pick(FACTIONS);
  const regionKey = opts.region || pick([faction.region, ...Object.keys(REGIONS).slice(0,2)]);
  const region = REGIONS[regionKey] || REGIONS[pick(Object.keys(REGIONS))];
  const level = opts.level || 5;
  const difficulty = pick(['Medium','Hard','Hard','Deadly']);

  const qt = pick(_QT);
  const villainType = pick(_VILLAIN_TYPES);
  const giverRole = pick(_GIVER_ROLES);
  const allyRole = pick(_ALLY_ROLES);

  const loc1 = pick(region.locations);
  const loc2 = pick(region.locations.filter(l=>l!==loc1)||region.locations);
  const loc3 = pick(region.locations.filter(l=>l!==loc1&&l!==loc2)||region.locations);
  const terrain = pick(region.terrain);

  const complication = pick(_COMPLICATIONS);
  const approach = pick(['stealth and patience','a convincing cover identity','an alliance with a local contact','a direct distraction','violence as a last resort']);

  const twist1 = pick(_TWISTS);
  const twist2 = pick(_TWISTS.filter(t=>t!==twist1));

  // Build act descriptions from template
  const actTmpls = _ACT_STRUCTURES[qt.type] || _ACT_STRUCTURES.investigation;
  const acts = actTmpls.map((a, i) => {
    const desc = a.tmpl
      .replace('{loc1}', loc1).replace('{loc2}', loc2).replace('{loc3}', loc3)
      .replace('{terrain}', terrain).replace('{complication}', complication.slice(0,80)+'…')
      .replace('{approach}', approach).replace('{object}', pick(['the artefact','the document','the item','the package','the evidence','the relic']));
    const actDiff = i===0?'Easy':i===1?difficulty:'Deadly';
    const enc = generateEncounter(level, opts.partySize||4, actDiff.toLowerCase());
    return { name:a.name, desc, encounter:enc, terrain, location:[loc1,loc2,loc3][i] };
  });

  // Build resolution paths
  const resKeys = Object.keys(_RESOLUTIONS);
  const res1Key = pick(resKeys);
  const res2Key = pick(resKeys.filter(k=>k!==res1Key));
  const fmt = (t,k) => _RESOLUTIONS[k].tmpl
    .replace('{faction}', faction.name)
    .replace('{complication}', complication.slice(0,60)+'…');

  // Build rewards tiers
  const gpBase = level * (difficulty==='Deadly'?300:difficulty==='Hard'?200:150);
  const scrollLevel = Math.min(9, Math.max(1, Math.ceil(level/3)));
  const itemRarity = level>=15?'Very Rare':level>=11?'Rare':level>=7?'Uncommon':'Common';
  const materialReward = pick([
    `${gpBase} gp, a spell scroll (level ${scrollLevel}), and a letter of passage through ${faction.name}-controlled territory`,
    `${gpBase} gp and a ${itemRarity} magic item from the faction vault (DM choice)`,
    `${Math.floor(gpBase*0.7)} gp, faction standing increase, and a safe house contact in ${loc2}`,
    `${gpBase} gp and a named favor redeemable from ${faction.name} leadership`,
    `${Math.floor(gpBase*1.2)} gp — no questions, no strings, paid in advance`,
  ]);

  const factionHook = pick(faction.hooks);

  return {
    id: uuid(),
    status: 'Active',
    created: Date.now(),
    notes: '',

    // Identity
    icon: qt.icon,
    type: qt.type,
    title: factionHook,
    faction: faction.name,
    region: regionKey,
    difficulty,
    urgency: pick(['Low — available for some time','Medium — days at most','Urgent — act tonight','Critical — hours remain']),
    level,

    // Narrative
    hook: pick(region.encounter_flavour) + ' ' + pick([
      'The party is the only option left.',
      'Every official channel has failed.',
      'Time is the only resource that matters now.',
      'The faction can\'t be seen doing this themselves.',
      'Someone needs to finish this before the wrong people connect the dots.',
    ]),
    background: `${faction.name} needs this handled because ${villainType.motiv}. What they\'re not saying: ${villainType.secret}. The situation has been building for weeks but reached a breaking point at ${loc1}.`,
    objective: `${qt.verb} — ${factionHook.toLowerCase().replace(/^a /, '').replace(/^an /, '')}. Primary location: ${loc1}. Deadline as noted by urgency.`,

    // Key people
    questGiver: {
      name: _qNpcName(),
      role: giverRole.role,
      personality: giverRole.personality_hint,
      secret: pick([
        'knows the villain personally and has a conflicted history with them',
        'has been in contact with a rival faction and is hedging their bets',
        'the reward offered is coming from their own funds, not the faction',
        'believes the party will fail but needs to try every option',
        'has already sent one other group on this job — they didn\'t come back',
        'is personally responsible for the situation they\'re asking the party to fix',
      ]),
    },
    villain: {
      name: _qNpcName(),
      arch: villainType.arch,
      motivation: villainType.motiv,
      secret: villainType.secret,
      location: loc2,
      threat: pick([
        `${roll(4)+2} well-armed retainers with orders to kill`,
        'access to a magical alarm network covering the approach routes',
        'political protection that makes open conflict costly',
        'leverage over someone the party may care about',
        `a contingency: if they die, something happens at ${loc3}`,
        'the ability to vanish and resurface somewhere worse',
      ]),
    },
    ally: {
      name: _qNpcName(),
      role: allyRole.role,
      usefulness: allyRole.use,
      condition: pick([
        'asks for nothing but requires the party to protect their identity',
        'will only communicate through dead drops',
        'wants something small in return — retrieve a specific item during the job',
        'is afraid and needs convincing before they\'ll commit',
        'has their own agenda that overlaps — not perfectly — with the party\'s',
      ]),
    },

    // Structure
    acts,
    twists: [twist1, twist2],
    complications: [complication, pick(_COMPLICATIONS.filter(c2=>c2!==complication))],

    // Endings
    resolutions: [
      { name:_RESOLUTIONS[res1Key].name, desc:fmt(faction.name, res1Key) },
      { name:_RESOLUTIONS[res2Key].name, desc:fmt(faction.name, res2Key) },
      { name:'Exposed — The Truth Goes Wide', desc:`Evidence of what was really happening reaches the Cobalt Soul, a rival faction, or the public. ${faction.name}\'s position is complicated. The party chooses which way this falls.` },
    ],

    rewards: {
      material: materialReward,
      story: `Standing with ${faction.name}. Access to ${loc2} contacts. Possible future work — or complications — depending on what the party learned.`,
      optional: `If the party protects the innocent party or exposes the villain\'s secret: additional ${Math.floor(gpBase*0.5)} gp bounty from a surprised third party.`,
    },

    dmNotes: `The villain\'s secret (${villainType.secret}) should be discoverable by a party that looks carefully. The twist ("${twist1.slice(0,60)}…") works best if telegraphed early in Act I so players feel clever rather than cheated when it lands. The third resolution path is available if the party asks the right questions in Act II.`,
  };
}

// ── Encounter Generator ───────────────────────────────────────────────────────

const MULTI_MULTS=[{min:1,max:1,m:1},{min:2,max:2,m:1.5},{min:3,max:6,m:2},{min:7,max:10,m:2.5},{min:11,max:14,m:3},{min:15,max:Infinity,m:4}];
function multiMult(n){return MULTI_MULTS.find(x=>n>=x.min&&n<=x.max)?.m||1;}

const _ENC_ENVIRONMENTS = [
  { name:'Dungeon Corridor',       desc:'A low stone passage, torchlight failing at both ends. The ceiling is close. Sound carries.',
    features:['Narrow corridor (10ft wide): Large+ creatures squeeze, ranged attacks have cover','Loose flagstones: DC 12 Perception to notice; trigger = Dex DC 13 or prone','Wall sconces: can be knocked down (improvised thrown weapon, 1d6+fire)','One rusted portcullis, open but can be dropped (lever in an alcove, action)'] },
  { name:'Ruined Chamber',         desc:'A vaulted room with half the ceiling caved in. Rubble everywhere. Something was here before the ceiling fell.',
    features:['Rubble field (20ft section): difficult terrain, half cover while crouching','Collapsed pillar: provides three-quarters cover; unstable (DC 14 Str to tip onto enemy, 2d10 bludgeoning)','Shaft of light from the collapse: 10ft circle, dim light only — advantage on Perception checks within it','Old brazier: still hot; knocked over = 10ft line of difficult terrain, 1d6 fire to enter'] },
  { name:'Forest Clearing',        desc:'A break in the canopy. The trees form a ring around a space that looks deliberately maintained. It isn\'t.',
    features:['Tree line: creatures inside the tree line are heavily obscured until they move into the clearing','Loose undergrowth ring: difficult terrain 10ft around clearing edge; DC 13 Stealth to move through silently','Low branch: DC 12 Athletics to grab as bonus action; grants high ground (+1 to attacks, advantage on saves vs prone)','Mossy log: blocks movement, provides half cover on prone creatures; DC 10 Athletics to vault'] },
  { name:'Tavern Common Room',     desc:'Tables overturned, broken glass, the barkeep behind the bar praying very quietly. Combat spills out of nowhere.',
    features:['Furniture: four tables as half cover, easily shoved (DC 11 Str, action, knocks prone on hit)','Bar top: high ground; DC 13 Athletics to vault or climb; barkeep will throw bottles (improvised, 1d4+1) if provoked','Fireplace: 5ft cube, 1d10 fire to enter/start turn; cast iron poker available (1d6 bludgeoning)','Chandelier: rope near the bar; cut = drops on 10ft square (DC 14 Dex or 2d6 + restrained until freed)'] },
  { name:'Mountain Pass',          desc:'A ledge with a sheer drop on one side and a cliff face on the other. No room to maneuver. Whoever has the high ground wins.',
    features:['Ledge edge: forced movement toward the edge (DC 13 Str) = over the side; 30ft drop (3d6 bludgeoning)','High ground section: +1 to attack rolls from the raised section (10ft elevation difference)','Loose scree: DC 13 Perception to identify; first creature through triggers Dex DC 13 or slide 10ft toward the edge','Cliff alcove: room for one medium creature, three-quarters cover, must Dash to reach it'] },
  { name:'Underground Lake Shore', desc:'Dark water to one side, slick stone to the other. Things live in the water. The echo here is disorienting.',
    features:['Water\'s edge: adjacent to water; knocked prone = into the water (swim DC 12 per round or sink 5ft)','Slick stone: full area difficult terrain; running = DC 12 Acrobatics or fall prone','Stalactites overhead: Dex DC 13 to hit a specific one with a ranged attack; drops on 10ft circle below (2d8+2 piercing)','Echo chamber: disadvantage on Perception checks based on hearing; anything louder than speech alerts the whole cave'] },
  { name:'Burning Building',       desc:'The structure is already on fire. The reason matters less than what\'s in here that shouldn\'t burn.',
    features:['Smoke (upper half of each room): heavily obscured above 5ft; DC 12 Con save per minute or poisoned','Active fire squares: 2d6 fire to enter or start turn; spreads 1 square per round on a d6 roll of 5-6','Weakened floor: DC 13 Perception to identify; weight of two or more medium creatures = falls through (1d6 + fire)','Burning debris: falling from the ceiling each round (DC 13 Dex or 1d10 fire, 20% chance per room, start of round)'] },
  { name:'Ship Deck',              desc:'Moving deck, salt spray, the mast above. Everything is tied down, bolted, or swinging. Not everything belongs to you.',
    features:['Moving deck: at the start of each round, DM calls a sway direction (DC 12 Dex or slide 5ft that direction)','Rigging: DC 13 Athletics to climb; grants height advantage (+1 attacks) and cover from below; rope can be cut','Cannons (if warship): can be aimed and fired with two actions; 4d10 bludgeoning, 30ft range, deafens 10ft on use','Water below: man overboard = DC 14 Str (Athletics) per round to stay afloat in ocean swells'] },
  { name:'Sewer Tunnel',           desc:'Knee-deep foul water, low arched ceilings, sounds that don\'t track to sources. Visibility is essentially zero.',
    features:['Waist-high water: all movement difficult terrain; small creatures fully submerged','Zero ambient light (unless carried): all creatures effectively blind beyond their own light radius','Slime walls: climbers must succeed DC 15 Athletics or fall (the ceiling is 8ft — a drop is 1d4+1)','Current grate: one section has a strong current (DC 14 Str or swept 20ft downstream, DC 12 to grab a pipe)'] },
  { name:'Ancient Temple',         desc:'Columns, a raised altar, faded murals of something that used to matter. Something in this room is still active.',
    features:['Altar: high ground, three-quarters cover while prone; touching the altar triggers a DC 13 Wis save or frightened 1 round','Column grid: full cover behind a column; 12 columns total, 10ft apart','Divine trap (one tile): Arcana DC 14 to identify; triggers 3d6 radiant in 10ft burst (DC 14 Dex half)','Mural: Investigation DC 15 reveals the weakness or history of one enemy type present in the encounter'] },
  { name:'City Rooftops',          desc:'Narrow ledges, chimneys, wash lines between buildings. Three stories up. One bad roll from a bad time.',
    features:['Gap between roofs: DC 12 Athletics to jump; failure = grab ledge (DC 13 Str) or fall 3d6','Laundry lines: provide half cover if stood adjacent; can be grabbed (free action) for a swing (DC 13 Acrobatics = move 15ft ignoring difficult terrain)','Chimney: blocks movement, three-quarters cover; venting smoke (DC 11 Con per round in smoke or poisoned)','Wet tiles: most roof sections difficult terrain after the first; first failed Acrobatics check this combat = prone'] },
  { name:'Frozen Tundra',          desc:'Flat open ground, visibility in every direction, wind that turns every sound sideways. Nowhere to hide. Nowhere to run.',
    features:['Open field: no cover within 60ft; ranged combatants have clear lanes in every direction','Ice patches (scattered): DC 13 Perception to identify; entering = DC 12 Acrobatics or fall prone','Wind: ranged attack rolls beyond 30ft made with disadvantage; Perception based on hearing made with disadvantage','Snowdrift: two sections of difficult terrain; a prone creature in a snowdrift is heavily obscured'] },
];

const _ENC_TACTICS = {
  // by type — opening, sustained, morale
  humanoid:   { open:'Form up on ranged party members first; melee engages immediately; leaders stay back first round calling targets', sustain:'Focus fire on downed party members if possible; use reactions for opportunity attacks; don\'t break formation voluntarily', morale:'Flee or surrender when leader drops or when reduced to half numbers; thugs and bandits break early, soldiers hold longer' },
  undead:     { open:'Mindless undead move directly toward the nearest living creature; intelligent undead open with their most powerful ability', sustain:'Undead don\'t retreat; mindless undead keep advancing regardless of losses; intelligent undead use cover and prioritize casters', morale:'Mindless: none — fight to destruction. Intelligent undead: may withdraw if losing, but won\'t surrender' },
  beast:      { open:'Fastest beast charges; the rest use pack tactics — one engages, others circle for flanking', sustain:'Knock prey prone early (trip attacks, pounce); bite then hold; drag isolated targets away from the group', morale:'Natural beasts flee at half health unless protecting young or nest; magically influenced beasts fight to death' },
  dragon:     { open:'Breath weapon first on the largest group cluster; then land or stay aloft depending on type', sustain:'Prioritize the most dangerous target; use lair actions on initiative 20; reposition every 2 rounds using fly speed', morale:'Dragons rarely flee but will if reduced to 25% HP and lacking legendary resistance; ancient dragons almost never flee' },
  fiend:      { open:'Lead with most powerful debuff ability; try to charm, frighten, or stun on round 1', sustain:'Target isolated characters; use teleportation to stay at the range they prefer; force concentration saves', morale:'Demons fight to the death but may be banished; devils will withdraw to preserve themselves for a longer game' },
  aberration: { open:'Mind-affecting ability first; try to incapacitate the biggest threat before it acts', sustain:'Keep the most confused or stunned target isolated; never engage directly if it can attack from range or through an ally', morale:'Aberrations rarely retreat but will shift focus entirely if their psychic target becomes ineffective' },
  giant:      { open:'Rock throw to open if range allows; then close to melee and focus on the heaviest armor', sustain:'Multiattack against the same target each round to down them fast; ignore opportunity attacks willingly', morale:'Giants hold until half health then reevaluate; hill giants panic early; stone and frost giants hold longer' },
  construct:  { open:'Move to block exits if possible; constructs prioritize the creature that last damaged them', sustain:'Constructs don\'t have morale — they follow programming; watch for the controlling mechanism', morale:'None — destroy or disable the controller' },
  elemental:  { open:'Use element form movement immediately to reposition to an advantageous position', sustain:'Focus the creature most resistant to their element (DM logic); use environment-specific abilities', morale:'Elementals summoned by magic fight until dismissed or destroyed; native elementals may retreat to their plane' },
  monstrosity:{ open:'Each monstrosity has its signature ability — use it on round 1 before the party can react to it', sustain:'Monstrosities often focus on the creature that hurt them most recently; use special senses to track invisible creatures', morale:'Varies widely; territorial monstrosities fight harder near their lair; wanderers may break off at half health' },
  fey:        { open:'Illusory or charm abilities first to split or confuse the party before any damage is taken', sustain:'Fey avoid taking damage if possible; will retreat, reappear, and strike from surprise repeatedly', morale:'Fey who are losing will try to bargain or flee rather than die; they consider death a very uncouth outcome' },
  ooze:       { open:'Move toward the largest cluster; pseudopod attacks prefer unarmored targets', sustain:'Oozes split if area effects hit them (if applicable); they can\'t be communicated with and don\'t react to morale', morale:'None — mindless creatures, fight until destroyed' },
  plant:      { open:'Entangle, grapple, or restrain immediately to hold targets in place for follow-up attacks', sustain:'Prioritize mobile characters first to reduce the party\'s ability to reposition', morale:'Mindless plants fight to destruction; intelligent plants may negotiate or retreat if significantly damaged' },
  celestial:  { open:'Lead with the ability that removes the most immediate threat; divine wards or debuffs before damage', sustain:'Celestials adapt tactically and will protect weaker allies; they prioritize stopping the most evil creature present', morale:'Celestials may withdraw to regroup but rarely flee permanently; will sacrifice themselves for a ward or innocent' },
};

const _ENC_SKILL_OPPS = [
  { skill:'Athletics DC 12',    effect:'Topple a piece of large furniture onto an enemy (2d6 bludgeoning, knocked prone)' },
  { skill:'Arcana DC 14',       effect:'Identify one enemy\'s damage vulnerability or immunity before the party commits to a strategy' },
  { skill:'Persuasion DC 16',   effect:'Convince a non-fanatic enemy to stand down (humanoids, intelligent monsters); DM sets stakes' },
  { skill:'Intimidation DC 14', effect:'Cause hesitation in weaker enemies — they use their action to dodge this round instead of attacking' },
  { skill:'Perception DC 13',   effect:'Spot an environmental hazard before a party member triggers it (fall, collapse, fire spread)' },
  { skill:'Stealth DC 14',      effect:'Slip out of combat undetected — remove one character from enemy targeting for one round' },
  { skill:'Nature DC 12',       effect:'Recall the correct behavior against one beast or plant creature type — exploit their morale or instincts' },
  { skill:'Religion DC 13',     effect:'Recall a specific undead or fiend weakness not listed in the stat block; DM adjudicates effect' },
  { skill:'Investigation DC 15',effect:'Find a hidden exit, a missed weapon, or a mechanism that affects the encounter environment' },
  { skill:'Medicine DC 12',     effect:'Identify that a downed ally is stable vs. dying — save an action that would otherwise be spent checking' },
];

const _ENC_ESCALATIONS = [
  'Reinforcements arrive at the end of round 3 — one additional creature of CR equal to the party level minus 2',
  'A second faction enters from the opposite direction with their own agenda; may fight the original enemies, the party, or both',
  'An environmental hazard activates — the room begins filling with gas, water, or fire at the start of round 4',
  'The apparent leader was a decoy; the real threat was watching from a hidden vantage and now enters the fight',
  'One enemy produces a hostage or a MacGuffin item mid-fight and offers terms',
  'A trap activates that benefits neither side — everyone on the battlefield must deal with it simultaneously',
  'A creature from outside the encounter is drawn in by the noise; it\'s hostile to everything in the room',
  'Structural collapse begins — the ceiling, floor, or walls become a secondary threat with initiative of their own',
];

const _ENC_LOOT = [
  // by party level range
  { lvl:[1,4],  tables:['Small coin purse (2d6×5 cp, 1d6×5 sp)','One common magic item (potion of healing, +1 ammunition)','Personal effects with a hook attached','A map fragment that leads somewhere small'] },
  { lvl:[5,8],  tables:['Coin mix (2d6×10 gp + gems worth 2d6×5 gp)','One uncommon magic item or a spell scroll (level 2-4)','Encoded documents — Cobalt Soul or Myriad would pay for these','A faction signet ring that opens a door it shouldn\'t'] },
  { lvl:[9,12], tables:['Coin hoard (3d6×50 gp + one gem worth 1d6×100 gp)','Rare magic item or spell scroll (level 5-6)','A research journal with dangerous conclusions','Faction intelligence — someone, somewhere, will pay a lot for this'] },
  { lvl:[13,16],tables:['Significant treasure (2d6×100 gp + art objects worth 3d6×100 gp)','Very rare magic item or a spell scroll (level 7-8)','Something that shouldn\'t exist — DM decides what it is and why it matters','An Aeoran artifact, incomplete and functional'] },
  { lvl:[17,20],tables:['Major treasure (5d6×250 gp + gems worth 1d4×1000 gp each)','Legendary magic item or 9th-level spell scroll','The reason the most powerful enemy was carrying what they were carrying','Something that, if taken, creates the next major plot thread'] },
];

function _encLoot(level) {
  const tier = _ENC_LOOT.find(t=>level>=t.lvl[0]&&level<=t.lvl[1]) || _ENC_LOOT[1];
  return tier.tables.slice(0,3).map(t=>pick([t]));
}

function generateEncounter(partyLevel, partySize, difficulty='medium', envOverride=null) {
  const lvl=clamp(partyLevel,1,20);
  const thresh=DIFFICULTY_THRESHOLDS[lvl]||DIFFICULTY_THRESHOLDS[5];
  const budget=thresh[difficulty.toLowerCase()]*(partySize||4);

  const maxCR=Math.max(0.125,lvl+1);
  const minCR=Math.max(0,lvl-5);
  let pool=MONSTERS.filter(m=>m.cr>=minCR&&m.cr<=maxCR);
  if (!pool.length) pool=MONSTERS.filter(m=>m.cr<=maxCR);
  if (!pool.length) pool=[...MONSTERS];

  const chosen=[];
  let usedXP=0;

  for (let attempt=0;attempt<60&&usedXP<budget;attempt++) {
    const remaining=budget-usedXP;
    const affordable=pool.filter(m=>m.xp<=remaining*1.1);
    if (!affordable.length) break;
    const m=pick(affordable);
    chosen.push({...m,id:uuid(),currentHp:m.hp,initiative:0,conditions:[],defeated:false});
    usedXP+=m.xp;
  }
  if (!chosen.length) {
    const m=pick(pool);
    chosen.push({...m,id:uuid(),currentHp:m.hp,initiative:0,conditions:[],defeated:false});
    usedXP=m.xp;
  }

  // De-duplicate names
  const nameCounts={};
  chosen.forEach(m=>{ nameCounts[m.name]=(nameCounts[m.name]||0)+1; });
  const seen={};
  chosen.forEach(m=>{
    if(nameCounts[m.name]>1){
      seen[m.name]=(seen[m.name]||0)+1;
      m.displayName=`${m.name} ${String.fromCharCode(64+seen[m.name])}`;
    } else { m.displayName=m.name; }
  });

  // Environment
  const env = envOverride
    ? (_ENC_ENVIRONMENTS.find(e=>e.name===envOverride)||pick(_ENC_ENVIRONMENTS))
    : pick(_ENC_ENVIRONMENTS);

  // Dominant monster type for tactics
  const typeCounts={};
  chosen.forEach(m=>{ typeCounts[m.type]=(typeCounts[m.type]||0)+1; });
  const dominantType = Object.entries(typeCounts).sort((a,b)=>b[1]-a[1])[0]?.[0]||'humanoid';
  const baseType = Object.keys(_ENC_TACTICS).find(t=>dominantType.includes(t))||'humanoid';
  const tactics = _ENC_TACTICS[baseType];

  // Unique monster entries for stat display
  const uniqueMonsters = [];
  const seenNames = new Set();
  chosen.forEach(m=>{
    if(!seenNames.has(m.name)){
      seenNames.add(m.name);
      uniqueMonsters.push(m);
    }
  });

  // Counts for summary
  const monsterSummary = Object.entries(nameCounts).map(([name,count])=>count>1?`${count}× ${name}`:name).join(', ');

  // Skill opportunities — pick 3
  const skillOpps = [..._ENC_SKILL_OPPS].sort(()=>Math.random()-.5).slice(0,3);

  // Escalation
  const escalation = pick(_ENC_ESCALATIONS);

  // Loot
  const loot = _encLoot(lvl);

  // DM note
  const dmNote = `Open with the ${baseType} tactic: "${tactics.open.slice(0,80)}…" — then let the terrain features do the work. The ${env.features[0].split(':')[0]} is the most likely to matter. If the party is dominating, use the escalation option.`;

  return {
    id:uuid(),
    monsters:chosen,
    uniqueMonsters,
    monsterSummary,
    totalXP:Math.round(usedXP*multiMult(chosen.length)),
    rawXP:usedXP,
    budget,
    difficulty,
    partyLevel:lvl,
    partySize:partySize||4,
    // enrichment
    environment:env,
    tactics,
    dominantType:baseType,
    skillOpps,
    escalation,
    loot,
    dmNote,
  };
}
