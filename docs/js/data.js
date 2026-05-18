'use strict';
// All static game data — Wildemount lore, monsters, thresholds

const FACTIONS = [
  { name:'Dwendalian Empire', region:'Western Wynandir', alignment:'Lawful Neutral',
    desc:'An authoritarian monarchy ruling western Wildemount with an iron fist and a far-reaching secret police.',
    hooks:['A magistrate needs evidence destroyed before morning','Imperial soldiers are threatening a farming village','A crown spy has gone rogue with classified intelligence','The Cobalt Soul has been ordered to surrender their archives','The Empire is pressing civilians into military service'] },
  { name:'Cerberus Assembly', region:'Western Wynandir', alignment:'Lawful Evil',
    desc:'Eight archmages who advise the crown and hold a monopoly on all sanctioned arcane practice in the Empire.',
    hooks:['A junior mage stole forbidden dunamantic research and fled','An Assembly safe-house needs clearing — no witnesses','An illegal teleportation circle has been discovered under the city','A construct has escaped the laboratory and is heading toward a village','The Assembly holds blackmail material on a noble who wants it destroyed'] },
  { name:'Kryn Dynasty', region:'Xhorhas', alignment:'Lawful Neutral',
    desc:'A matriarchy of dark elves guided by the Luxon and the sacred cycle of consecution, at war with the Empire.',
    hooks:['A Luxon beacon shard has resurfaced in the Empire — recover it before the Assembly does','A Dynasty ambassador has been kidnapped in neutral territory','Dunamancy texts must reach Rosohna through enemy lines','Imperial spies have been embedded in the Firmament for months','A newly awakened Umavi must be escorted safely to the Dynasty'] },
  { name:'Cobalt Soul', region:'Western Wynandir', alignment:'Lawful Good',
    desc:'Monks and archivists who pursue knowledge, expose corruption, and oppose tyranny through truth rather than steel.',
    hooks:['Recover a stolen archive taken from the Rexxentrum vault','Expose a corrupt magistrate before the tribunal convenes','Protect a whistleblower the Empire wants silenced permanently','Retrieve a holy relic before it falls into Assembly hands','Disappearances near a Cobalt Soul chapter house need investigating'] },
  { name:'The Revelry', region:'Menagerie Coast', alignment:'Chaotic Neutral',
    desc:'A pirate fleet operating from Darktow Reef, raiding Clovis Concord shipping and thumbing its nose at every authority.',
    hooks:['Intercept a merchant convoy before it reaches port','Recover cargo seized by a rival crew at Sharkfeather Cove','The Plank King has sent for you personally — that\'s never good','Sabotage a Concord warship before it leaves dry dock','Smuggle contraband through Nicodranas without attracting the Zhelezo'] },
  { name:'The Myriad', region:'Western Wynandir', alignment:'Neutral Evil',
    desc:'A shadow crime syndicate operating throughout the Empire, with eyes in every city and hands in every pocket.',
    hooks:['A debt is overdue and the collector is on their way','A witness to something important needs to disappear','Move stolen goods from Felderwin to Zadash without drawing attention','A Myriad contact in the city watch has been compromised','The Myriad wants something from inside the Cobalt Reserve — discretion required'] },
  { name:'Clovis Concord', region:'Menagerie Coast', alignment:'Lawful Neutral',
    desc:'Eight city-states forming a merchant republic that controls trade along the Menagerie Coast.',
    hooks:['Escort a trade delegation through Revelry-controlled waters','Investigate Revelry smuggling operating out of Port Damali\'s lower docks','A Concord inspector has taken a bribe and knows too much about too many people','Recover a sunken merchant vessel before the Revelry salvages the cargo','Negotiate a back-channel trade agreement with a Xhorhasian broker'] },
];

const REGIONS = {
  'Western Wynandir': {
    locations:['Rexxentrum','Zadash','Felderwin','Trostenwald','Blumenthal','Hupperdook','Grimgolir','Kamordah'],
    terrain:['rolling farmland','dense pine forest','Imperial highway','Wuyun river valley','mining hills','muddy crossroads'],
    encounter_flavour:['An Imperial patrol demands to see your papers','A Myriad courier is clearly being followed — and knows it','Cobalt Soul monks are quietly investigating something in the village','A wanted poster bears a face you recognise','A column of war refugees is moving west, away from the border'],
  },
  'Xhorhas': {
    locations:['Rosohna (Ghor Dranas)','Jigow','Asarius','Bazzoxan','Pride\'s Call','Urzin','Dumaran'],
    terrain:['black mud wastes','luminescent mushroom fields','rocky badlands','ancient ruin clusters','Dynasty causeway','amber fields'],
    encounter_flavour:['A Kryn patrol eyes you with measured suspicion','A beacon shard nearby pulses with quiet light','War-displaced refugees seek passage west','Something ancient stirs in the ruins — probably best to leave it','A dunamancer is conducting experiments alone in the wastes'],
  },
  'Menagerie Coast': {
    locations:['Nicodranas','Port Damali','Gwardan','Oremid\'s Watch','Feolinn','Tussoa','Brokenbank','Darktow'],
    terrain:['sandy coastline','tropical jungle','busy harbour','coral reef shoals','trading post road','mangrove delta'],
    encounter_flavour:['A Revelry sail is visible on the horizon and getting closer','A Concord inspector is asking questions nobody wants to answer','Exotic goods are being quietly unloaded at the wrong dock','Storm clouds are forming over the bay and the captain is worried','A merchant is selling something that has a Myriad seal on the crate'],
  },
  'Greying Wildlands': {
    locations:['Shadycreek Run','Uthodurn','Palebank Village','Boroftkrah','Mythburrow','Shiver Keep'],
    terrain:['dense ancient Savalirwood','frozen tundra','windswept highlands','winding mountain pass','abandoned logging camp','haunted bog'],
    encounter_flavour:['Shady merchants with no paperwork and no answers','Strange fey lights move through the Savalirwood at night','An Uthodurn patrol is far from home and won\'t say why','Something has been eating the wildlife in a very specific pattern','The locals don\'t talk about what lives in the hollow tree'],
  },
  'Eiselcross': {
    locations:['Allowak\'s Sanctuary','Syrinlya','Ruins of Aeor','Foren tundra','Mutalos','Entrance of Salsvault'],
    terrain:['arctic tundra','blizzard wastes','crumbling Aeor ruins','ice caves','Assembly research camp','frozen crash site'],
    encounter_flavour:['A Cerberus Assembly expedition is here for something specific and won\'t share','Ruin fragments emit unstable magical energy in pulses','Something from the Abyss has thawed out and is very hungry','The ice here speaks in a language you almost recognise','An Assembly mage is alone, terrified, and won\'t explain what happened to their team'],
  },
};

const RACES = [
  'Human','Elf','High Elf','Wood Elf','Half-Elf','Dwarf','Hill Dwarf','Mountain Dwarf',
  'Halfling','Lightfoot Halfling','Stout Halfling','Gnome','Rock Gnome','Forest Gnome',
  'Tiefling','Dragonborn','Half-Orc','Goblin','Orc','Aasimar','Firbolg','Tabaxi',
  'Pallid Elf','Lotusden Halfling','Draconblood Dragonborn','Ravenite Dragonborn',
];

const CLASSES = ['Fighter','Wizard','Rogue','Cleric','Ranger','Paladin','Barbarian','Druid','Bard','Warlock','Sorcerer','Monk','Artificer'];
const CLASS_HIT_DICE = {Fighter:10,Wizard:6,Rogue:8,Cleric:8,Ranger:10,Paladin:10,Barbarian:12,Druid:8,Bard:8,Warlock:8,Sorcerer:6,Monk:8,Artificer:8};
const CLASS_PRIME = {Fighter:'STR',Wizard:'INT',Rogue:'DEX',Cleric:'WIS',Ranger:'DEX',Paladin:'CHA',Barbarian:'STR',Druid:'WIS',Bard:'CHA',Warlock:'CHA',Sorcerer:'CHA',Monk:'DEX',Artificer:'INT'};

const ALIGNMENTS = ['Lawful Good','Neutral Good','Chaotic Good','Lawful Neutral','True Neutral','Chaotic Neutral','Lawful Evil','Neutral Evil','Chaotic Evil'];

const NAMES = {
  Zemnian:{
    first_m:['Aldric','Bren','Caleb','Daven','Edvard','Fabian','Gustav','Heinz','Johann','Konrad','Lothar','Markus'],
    first_f:['Adelheid','Brita','Clara','Dagmar','Elsa','Frida','Greta','Hilda','Ilse','Johanna','Katarina','Liesel'],
    last:['Widogast','Ermendrud','Trickfoot','Brightwell','Greystone','Ironwood','Coldwater','Ashvale','Thorncroft','Steinbauer','Hoffmann','Schreiber'],
  },
  Xhorhasian:{
    first_m:['Essek','Ikithon','Vence','Oban','Sorox','Thuron','Uvenda','Vrath','Wyrran','Zyn','Reth','Qilan'],
    first_f:['Leylas','Mirimana','Nydas','Olara','Quana','Ratha','Surenity','Tyffial','Udira','Vex','Yasha','Zoha'],
    last:['Thelyss','Kryn','Umavi','Shadowglass','Ashsong','Darkwhisper','Moonweave','Starmantle','Voidwalker','Nightveil','Duskmantle','Hollowsoul'],
  },
  Coastal:{
    first_m:['Fjord','Orly','Darrow','Sylas','Uther','Wystan','Taryon','Percival','Remi','Dax','Caduceus','Beauregard'],
    first_f:['Nott','Jester','Marian','Leiona','Priya','Reani','Sybil','Tova','Veth','Cali','Yeza','Ophelia'],
    last:['Stone','Lavorre','Brenatto','Orlandstriker','Falsworth','Brightwater','Saltbreeze','Wavecrest','Tidemarsh','Coralrun','Mercer','Seasong'],
  },
};

const DEITIES = [
  {name:'Avandra',domain:'Change, Luck, Trade',alignment:'CG',type:'Prime'},
  {name:'Bahamut',domain:'Justice, Protection, Honor',alignment:'LG',type:'Prime'},
  {name:'Corellon',domain:'Art, Beauty, Elves',alignment:'CG',type:'Prime'},
  {name:'Erathis',domain:'Civilization, Law, Order',alignment:'LN',type:'Prime'},
  {name:'Ioun',domain:'Knowledge, Wisdom, Foresight',alignment:'N',type:'Prime'},
  {name:'Kord',domain:'Battle, Storms, Strength',alignment:'CN',type:'Prime'},
  {name:'Melora',domain:'Nature, Sea, Wilderness',alignment:'N',type:'Prime'},
  {name:'Moradin',domain:'Craft, Family, Dwarves',alignment:'LG',type:'Prime'},
  {name:'Pelor',domain:'Healing, Sun, Hope',alignment:'NG',type:'Prime'},
  {name:'Raei',domain:'Compassion, Redemption',alignment:'NG',type:'Prime'},
  {name:'Sehanine',domain:'Illusion, Moon, Love',alignment:'CG',type:'Prime'},
  {name:'The Luxon',domain:'Light, Rebirth, Dunamancy',alignment:'N',type:'Unique — Kryn Dynasty'},
  {name:'Asmodeus',domain:'Domination, Tyranny',alignment:'LE',type:'Betrayer'},
  {name:'Bane',domain:'Fear, War, Conquest',alignment:'LE',type:'Betrayer'},
  {name:'Gruumsh',domain:'Destruction, Slaughter',alignment:'CE',type:'Betrayer'},
  {name:'Lolth',domain:'Spiders, Lies, Deceit',alignment:'CE',type:'Betrayer'},
  {name:'Tharizdun',domain:'Annihilation, Madness',alignment:'CE',type:'Betrayer'},
  {name:'Tiamat',domain:'Greed, Envy, Dragons',alignment:'LE',type:'Betrayer'},
  {name:'Torog',domain:'Imprisonment, Torture',alignment:'NE',type:'Betrayer'},
  {name:'Vecna',domain:'Undeath, Secrets, Evil',alignment:'NE',type:'Betrayer'},
  {name:'Zehir',domain:'Darkness, Poison, Serpents',alignment:'CE',type:'Betrayer'},
];

const PLOT_SEEDS = [
  'A Dunamancy artefact from Aeor has resurfaced in a pawn shop in Zadash — both the Assembly and the Dynasty want it, and neither knows the other is looking.',
  'The Myriad is moving something through the city in false-bottomed merchant carts. The Cobalt Soul knows something is happening but not what. The party is caught between them.',
  'A beacon shard is causing temporal anomalies in a village near the Xhorhasian border — crops grow in reverse, people are aging backwards.',
  'An Echo Knight has been hunting the party across three cities. Their echoes\' footprints lead backward through time to a decision the party doesn\'t remember making.',
  'A Cerberus Assembly archwizard offers work: recover their colleague who defected to the Dynasty. The defector wants to stay. They have very good reasons.',
  'The Plank King of Darktow sends a letter. The Revelry has something the party wants. The price is one job, no questions, tonight.',
  'A Cobalt Soul archive was burned. The monks believe an Annex member ordered it. The only evidence is ash and one surviving monk who keeps changing their story.',
  'Consecution has failed for a high-ranking Umavi. Their soul is now lost — unbound, unhoused. The Dynasty blames Cobalt Soul interference. The Soul denies it. Both are telling the truth.',
  'An expedition to Eiselcross returns with only one survivor — and a vocabulary that didn\'t exist before they left.',
  'Imperial press-gangs are taking people who match a specific description. Nobody official will say why. The pattern becomes clear when the party puts the faces together.',
  'Ruins at the edge of the Savalirwood contain a portal that predates the Calamity. Something came through it. Something is still coming through.',
  'A Lotusden halfling shaman says the Savalirwood is dying from the inside out. The roots are wrong. Something below them is breathing.',
  'Rexxentrum\'s black market is selling memories — bottled, labelled, priced by the hour. Someone is selling yours. They have been for months.',
  'A Kryn ambassador vanishes the night before peace talks. Both sides are certain the other did it. Both are wrong.',
  'Three Clovis Concord ships vanished on the same trade route in the same week. The sole survivor of the last one speaks of a figure made entirely of sea-glass.',
  'A Ravenite community outside Asarius has been massacred. The attackers left Dynasty symbols. But the technique is Imperial. Forensics and politics are about to collide.',
  'The party finds a sealed vault beneath a ruined city. Inside: a letter addressed to each of them by name, dated two hundred years ago, and sealed with their own personal symbols.',
];

const PERSONALITIES = [
  'speaks in riddles and seems genuinely surprised when people find this frustrating',
  'never makes eye contact but notices everything',
  'obsessively cleans their weapon during any silence of more than thirty seconds',
  'quotes Imperial law constantly and is usually right',
  'claims to have met the Bright Queen and will not stop talking about it',
  'deeply, visibly terrified of magic but refuses to admit it',
  'distrusts anyone from the Empire on principle — and has good reasons',
  'hums old Zemnian folk songs whenever they\'re thinking',
  'has survived three assassination attempts and mentions it at every opportunity',
  'completely convinced they are being followed — and may be right',
  'carries a locket they will not open and will not explain',
  'never lies but withholds the truth with surgical precision',
  'laughs inappropriately at danger and apologizes for it afterward',
  'collects small stones from everywhere they go and can name every one',
  'refuses to eat anything they didn\'t personally see prepared',
];

const BACKGROUNDS = [
  'A former {faction} operative who left under circumstances they still won\'t describe.',
  'Born in {location}, escaped during the war and hasn\'t been back since.',
  'A veteran of the Rexxentrum city watch who saw enough to stop believing in the Empire.',
  'Spent five years at the Soltryce Academy before being quietly expelled. The records were sealed.',
  'A merchant caravan survivor who now sells information as readily as goods.',
  'Raised in the Cobalt Soul until an incident they don\'t discuss severed the connection.',
  'Grew up in the Greying Wildlands before the law found them.',
  'Former Kryn Dynasty soldier who defected after the battle of Pride\'s Call. Doesn\'t talk about what they saw.',
  'A dockworker from the Menagerie Coast who saw something they weren\'t meant to see.',
  'A scholar from Uthodurn researching something the elves and dwarves both claim doesn\'t exist.',
];

const MONSTERS = [
  {name:'Bandit',cr:0.125,xp:25,hp:11,ac:12,atk:'+3',dmg:'1d6+1',type:'humanoid'},
  {name:'Guard',cr:0.125,xp:25,hp:11,ac:16,atk:'+3',dmg:'1d6+1',type:'humanoid'},
  {name:'Kobold',cr:0.125,xp:25,hp:5,ac:12,atk:'+4',dmg:'1d4+2',type:'humanoid'},
  {name:'Skeleton',cr:0.25,xp:50,hp:13,ac:13,atk:'+4',dmg:'1d6+2',type:'undead'},
  {name:'Zombie',cr:0.25,xp:50,hp:22,ac:8,atk:'+3',dmg:'1d6+1',type:'undead'},
  {name:'Wolf',cr:0.25,xp:50,hp:11,ac:13,atk:'+4',dmg:'2d4+2',type:'beast'},
  {name:'Goblin',cr:0.25,xp:50,hp:7,ac:15,atk:'+4',dmg:'1d6+2',type:'humanoid'},
  {name:'Scout',cr:0.5,xp:100,hp:16,ac:13,atk:'+4',dmg:'1d8+2',type:'humanoid'},
  {name:'Orc',cr:0.5,xp:100,hp:15,ac:13,atk:'+5',dmg:'1d12+3',type:'humanoid'},
  {name:'Hobgoblin',cr:0.5,xp:100,hp:18,ac:18,atk:'+3',dmg:'1d8+1',type:'humanoid'},
  {name:'Bugbear',cr:1,xp:200,hp:27,ac:16,atk:'+4',dmg:'2d8+2',type:'humanoid'},
  {name:'Spy',cr:1,xp:200,hp:27,ac:12,atk:'+4',dmg:'2d6+2',type:'humanoid'},
  {name:'Dire Wolf',cr:1,xp:200,hp:37,ac:14,atk:'+5',dmg:'2d6+3',type:'beast'},
  {name:'Cerberus Assembly Mage',cr:1,xp:200,hp:22,ac:13,atk:'+5',dmg:'3d6',type:'humanoid (Assembly)'},
  {name:'Kryn Shadowguard',cr:2,xp:450,hp:45,ac:15,atk:'+4',dmg:'2d6+2',type:'humanoid (Kryn)'},
  {name:'Bandit Captain',cr:2,xp:450,hp:65,ac:15,atk:'+5',dmg:'1d6+3',type:'humanoid'},
  {name:'Berserker',cr:2,xp:450,hp:67,ac:13,atk:'+5',dmg:'2d6+3',type:'humanoid'},
  {name:'Ghoul',cr:2,xp:450,hp:22,ac:12,atk:'+2',dmg:'2d6+2',type:'undead'},
  {name:'Ogre',cr:2,xp:450,hp:59,ac:11,atk:'+6',dmg:'2d8+4',type:'giant'},
  {name:'Knight',cr:3,xp:700,hp:52,ac:18,atk:'+5',dmg:'2d8+3',type:'humanoid'},
  {name:'Myriad Assassin',cr:3,xp:700,hp:58,ac:15,atk:'+6',dmg:'1d6+3',type:'humanoid (Myriad)'},
  {name:'Manticore',cr:3,xp:700,hp:68,ac:14,atk:'+5',dmg:'2d6+3',type:'monstrosity'},
  {name:'Phase Spider',cr:3,xp:700,hp:32,ac:13,atk:'+4',dmg:'1d10+2',type:'monstrosity'},
  {name:'Ettin',cr:4,xp:1100,hp:85,ac:12,atk:'+6',dmg:'2d8+4',type:'giant'},
  {name:'Banshee',cr:4,xp:1100,hp:58,ac:12,atk:'+2',dmg:'3d6',type:'undead'},
  {name:'Cerberus Annex Mage',cr:4,xp:1100,hp:78,ac:15,atk:'+6',dmg:'4d8+2',type:'humanoid (Assembly)'},
  {name:'Troll',cr:5,xp:1800,hp:84,ac:15,atk:'+7',dmg:'2d6+4',type:'giant'},
  {name:'Gladiator',cr:5,xp:1800,hp:112,ac:16,atk:'+7',dmg:'2d8+5',type:'humanoid'},
  {name:'Wyvern',cr:6,xp:2300,hp:110,ac:13,atk:'+7',dmg:'2d6+4',type:'dragon'},
  {name:'Oni',cr:7,xp:2900,hp:110,ac:16,atk:'+7',dmg:'2d10+4',type:'giant'},
  {name:'Young Black Dragon',cr:7,xp:2900,hp:127,ac:18,atk:'+7',dmg:'2d10+4',type:'dragon'},
  {name:'Frost Giant',cr:8,xp:3900,hp:138,ac:15,atk:'+9',dmg:'3d8+6',type:'giant'},
  {name:'Fire Giant',cr:9,xp:5000,hp:162,ac:18,atk:'+11',dmg:'6d6+7',type:'giant'},
  {name:'Adult Black Dragon',cr:14,xp:11500,hp:195,ac:19,atk:'+10',dmg:'2d10+6',type:'dragon'},
  {name:'Adult Red Dragon',cr:17,xp:18000,hp:256,ac:19,atk:'+14',dmg:'2d10+8',type:'dragon'},
];

const DIFFICULTY_THRESHOLDS = {
  1:{easy:25,medium:50,hard:75,deadly:100},
  2:{easy:50,medium:100,hard:150,deadly:200},
  3:{easy:75,medium:150,hard:225,deadly:400},
  4:{easy:125,medium:250,hard:375,deadly:500},
  5:{easy:250,medium:500,hard:750,deadly:1100},
  6:{easy:300,medium:600,hard:900,deadly:1400},
  7:{easy:350,medium:750,hard:1100,deadly:1700},
  8:{easy:450,medium:900,hard:1400,deadly:2100},
  9:{easy:550,medium:1100,hard:1600,deadly:2400},
  10:{easy:600,medium:1200,hard:1900,deadly:2800},
  11:{easy:800,medium:1600,hard:2400,deadly:3600},
  12:{easy:1000,medium:2000,hard:3000,deadly:4500},
  13:{easy:1100,medium:2200,hard:3400,deadly:5100},
  14:{easy:1250,medium:2500,hard:3800,deadly:5700},
  15:{easy:1400,medium:2800,hard:4300,deadly:6400},
  16:{easy:1600,medium:3200,hard:4800,deadly:7200},
  17:{easy:2000,medium:3900,hard:5900,deadly:8800},
  18:{easy:2100,medium:4200,hard:6300,deadly:9500},
  19:{easy:2400,medium:4900,hard:7300,deadly:10900},
  20:{easy:2800,medium:5700,hard:8500,deadly:12700},
};

const CONDITIONS = ['Blinded','Charmed','Deafened','Exhausted','Frightened','Grappled','Incapacitated','Invisible','Paralyzed','Petrified','Poisoned','Prone','Restrained','Stunned','Unconscious'];

const MAP_TYPES = [
  { label:'Dungeon', value:'dungeon', subs:[
    {label:'Standard Dungeon', value:'standard'},
    {label:'Underdark Delve', value:'underdark'},
    {label:'Crypt / Tomb', value:'crypt'},
    {label:'Sewer Tunnels', value:'sewers'},
  ]},
  { label:'Outdoor', value:'outdoor', subs:[
    {label:'Forest', value:'forest'},
    {label:'Plains & Hills', value:'plains'},
    {label:'Coastal / Beach', value:'coastal'},
    {label:'Mountain Pass', value:'mountain'},
  ]},
  { label:'Interior', value:'interior', subs:[
    {label:'Tavern / Inn', value:'tavern'},
    {label:'Castle Keep', value:'castle'},
    {label:'Sailing Ship', value:'ship'},
    {label:'Temple / Shrine', value:'temple'},
    {label:'Noble Mansion', value:'mansion'},
  ]},
  { label:'Wildemount', value:'wildemount', subs:[
    {label:'Xhorhas Wastes', value:'xhorhas_wastes'},
    {label:'Ruins of Aeor', value:'aeor_ruins'},
    {label:'Rosohna District', value:'rosohna'},
    {label:'Dwendalian Keep', value:'dwendalian_keep'},
    {label:'Menagerie Port', value:'menagerie_port'},
    {label:'Savalirwood', value:'savalirwood'},
    {label:'Eiselcross Tundra', value:'eiselcross'},
    {label:'Kryn Temple', value:'kryn_temple'},
    {label:'Cerberus Assembly Lab', value:'cerberus_lab'},
    {label:'Bazzoxan Caverns', value:'bazzoxan'},
  ]},
];
