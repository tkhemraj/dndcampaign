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
    } else if (Math.random()<0.25) { grid[cy][cx]=T.TRAP; }

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
  return {grid,W,H,rooms,labels,title:titles[subtype]||'Dungeon'};
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

  return {grid,W,H,rooms:[],labels:[],title:cfg.title};
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
  return {grid,W,H,rooms,labels,title:titles[template]||template};
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

function generateNPC(opts={}) {
  const race  = opts.race  || pick(RACES);
  const cls   = opts.cls   || pick(CLASSES);
  const level = opts.level || clamp(Math.random()<0.55?roll(4):Math.random()<0.7?4+roll(4):8+roll(4),1,20);
  const alignment = pick(ALIGNMENTS);
  const regionKey = opts.region || pick(Object.keys(REGIONS));
  const region = REGIONS[regionKey];

  const regionFactions = FACTIONS.filter(f=>f.region===regionKey);
  const faction = pick(regionFactions.length ? regionFactions : FACTIONS);

  const cultureMap = {'Western Wynandir':'Zemnian','Xhorhas':'Xhorhasian','Menagerie Coast':'Coastal','Greying Wildlands':Math.random()<0.5?'Zemnian':'Coastal','Eiselcross':'Zemnian'};
  const culture = cultureMap[regionKey] || 'Zemnian';
  const names = NAMES[culture];
  const isFemale = Math.random() < 0.5;
  const firstName = pick(isFemale ? names.first_f : names.first_m);
  const lastName = pick(names.last);

  const stats = {STR:rollStat(),DEX:rollStat(),CON:rollStat(),INT:rollStat(),WIS:rollStat(),CHA:rollStat()};
  const prime = CLASS_PRIME[cls];
  if (prime && stats[prime]<14) stats[prime]=14+Math.floor(Math.random()*4);

  const hd = CLASS_HIT_DICE[cls]||8;
  const maxHp = Math.max(1,(hd+statMod(stats.CON))*level);
  const acBase = 10+statMod(stats.DEX);
  const ac = cls==='Fighter'||cls==='Paladin'?acBase+3:cls==='Monk'?acBase+statMod(stats.WIS):acBase;
  const profBonus = Math.ceil(level/4)+1;

  const bg = pick(BACKGROUNDS)
    .replace('{faction}',faction.name)
    .replace('{location}',pick(region.locations));

  return {
    id:uuid(),
    name:`${firstName} ${lastName}`,
    race, class:cls, level, alignment,
    region:regionKey, faction:faction.name, culture,
    stats, maxHp, hp:maxHp, ac, profBonus,
    personality:pick(PERSONALITIES),
    background:bg,
    created:Date.now(),
  };
}

// ── Quest Generator ───────────────────────────────────────────────────────────

function generateQuest(opts={}) {
  const faction = opts.faction
    ? FACTIONS.find(f=>f.name===opts.faction)||pick(FACTIONS)
    : pick(FACTIONS);
  const regionKey = opts.region || faction.region;
  const region = REGIONS[regionKey] || REGIONS[pick(Object.keys(REGIONS))];
  const level = opts.level || 5;

  const rewards = [
    `${200*level} gp and a letter of Imperial passage`,
    `A rare spell scroll (level ${Math.ceil(level/3)})`,
    `An uncommon magic item from the faction\'s vault`,
    `Safe passage through ${pick(region.locations)} and faction contacts`,
    `${150*level} gp and a significant reputation increase`,
    `A deed to a small property in ${pick(region.locations)}`,
    `${100*level} gp and a promised favour from the faction leader`,
  ];

  return {
    id:uuid(),
    title:pick(faction.hooks),
    faction:faction.name,
    region:regionKey,
    location:pick(region.locations),
    flavour:pick(region.encounter_flavour),
    reward:pick(rewards),
    difficulty:pick(['Easy','Medium','Hard','Deadly']),
    urgency:pick(['Low — available for some time','Medium — days at most','Urgent — act tonight','Critical — hours remain']),
    status:'Active',
    notes:'',
    created:Date.now(),
  };
}

// ── Encounter Generator ───────────────────────────────────────────────────────

const MULTI_MULTS=[{min:1,max:1,m:1},{min:2,max:2,m:1.5},{min:3,max:6,m:2},{min:7,max:10,m:2.5},{min:11,max:14,m:3},{min:15,max:Infinity,m:4}];
function multiMult(n){return MULTI_MULTS.find(x=>n>=x.min&&n<=x.max)?.m||1;}

function generateEncounter(partyLevel, partySize, difficulty='medium') {
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
  chosen.forEach(m=>{
    nameCounts[m.name]=(nameCounts[m.name]||0)+1;
  });
  const seen={};
  chosen.forEach(m=>{
    if (nameCounts[m.name]>1) {
      seen[m.name]=(seen[m.name]||0)+1;
      m.displayName=`${m.name} ${String.fromCharCode(64+seen[m.name])}`;
    } else {
      m.displayName=m.name;
    }
  });

  return {
    id:uuid(),
    monsters:chosen,
    totalXP:Math.round(usedXP*multiMult(chosen.length)),
    rawXP:usedXP,
    budget,
    difficulty,
    partyLevel:lvl,
    partySize:partySize||4,
  };
}
