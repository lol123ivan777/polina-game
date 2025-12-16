// ===============================
// CONFIG
// ===============================

const LEVEL_DURATION = 10_000;

const LEVELS = [
  { speed: 5.5, spawn: 520, theme: "pink" },
  { speed: 6.5, spawn: 480, theme: "purple" },
  { speed: 7.5, spawn: 440, theme: "cyan" },
  { speed: 8.5, spawn: 400, theme: "red" },
  { speed: 9.5, spawn: 360, theme: "acid" },
];

const THEMES = {
  pink:   { road: 0x140016, neon: 0xff2b8f },
  purple: { road: 0x120018, neon: 0x9b5cff },
  cyan:   { road: 0x001417, neon: 0x00fff2 },
  red:    { road: 0x180000, neon: 0xff0033 },
  acid:   { road: 0x001a12, neon: 0x39ff14 },
};

const ITEMS = [
  { type: "poop",  icon: "💩", score: -100, weight: 30 },
  { type: "ghost", icon: "👻", score: -100, weight: 20 },
  { type: "fruit", icon: ["🍒","🍓"], score: 100, weight: 25 },
  { type: "bomb",  icon: "💣", score: -500, weight: 15 },
  { type: "shield", icon: "🧿", shield: 4000, weight: 7 },
  { type: "life",  icon: "❤️", life: 1, weight: 2 },
  { type: "flag",  icon: "🇷🇺", score: 1000, weight: 1 },
];

const LANE_COUNT = 4;

// ===============================
// TELEGRAM / CLOUD
// ===============================

const tg = window.Telegram?.WebApp;
const cloud = tg?.CloudStorage;

let username = null;
let avatarUrl = null;
let bestScore = 0;

function cloudGet(key) {
  return new Promise(res => {
    if (!cloud) return res(null);
    cloud.getItem(key, (_, v) => res(v ?? null));
  });
}

function cloudSet(key, val) {
  if (!cloud) return;
  cloud.setItem(key, String(val), () => {});
}

function tgHaptic(type) {
  try {
    const h = tg?.HapticFeedback;
    if (!h) return;
    if (type === "error") h.notificationOccurred("error");
    else if (type === "success") h.notificationOccurred("success");
    else h.impactOccurred(type);
  } catch {}
}

function hex(n) {
  return "#" + n.toString(16).padStart(6, "0");
}

// ===============================
// GAME STATE
// ===============================

let player, items, lanes, currentLane;
let score, lives, level, levelTimer;
let currentSpeed, spawnDelay, spawnTimer;
let theme, shieldUntil;
let started, gameOver, rulesShown;
let lifeDroppedThisLevel;

// ===============================
// PHASER
// ===============================

new Phaser.Game({
  type: Phaser.AUTO,
  width: window.innerWidth,
  height: window.innerHeight,
  backgroundColor: "#000",
  scene: { preload, create, update }
});

function preload() {}

// ===============================
// CREATE
// ===============================

async function create() {
  // reset
  items = [];
  lanes = [];
  currentLane = 1;
  score = 0;
  lives = 3;
  level = 1;
  levelTimer = 0;
  currentSpeed = LEVELS[0].speed;
  spawnDelay = LEVELS[0].spawn;
  spawnTimer = 0;
  theme = THEMES.pink;
  shieldUntil = 0;
  started = false;
  gameOver = false;
  rulesShown = false;
  lifeDroppedThisLevel = false;

  // load cloud profile
  username = await cloudGet("username") || localStorage.getItem("username");
  bestScore = Number(await cloudGet("bestScore") || localStorage.getItem("bestScore") || 0);

  if (tg?.initDataUnsafe?.user) {
    avatarUrl = tg.initDataUnsafe.user.photo_url || null;
    if (!username) username = tg.initDataUnsafe.user.first_name;
  }

  const { width, height } = this.scale;

  // background
  this.bg = this.add.rectangle(width/2, height/2, width, height, theme.neon, 0.08);

  // lanes
  const laneW = width / LANE_COUNT;
  for (let i = 0; i < LANE_COUNT; i++) lanes.push(laneW*i + laneW/2);

  this.road = this.add.rectangle(width/2, height/2, Math.min(width-30,520), height+40, theme.road);

  // player
  player = this.add.text(lanes[currentLane], height-120, "🚗", { fontSize: "42px" }).setOrigin(0.5);
  player.glow = this.add.text(player.x, player.y, "🚗", { fontSize: "42px", color: hex(theme.neon) })
    .setOrigin(0.5).setAlpha(0.3);

  // UI
  this.scoreText = this.add.text(16,16,"0",{fontSize:"24px",color:"#fff"});
  this.bestText = this.add.text(16,44,`BEST ${bestScore}`,{fontSize:"14px",color:"#aaa"});
  this.livesText = this.add.text(16,66,"❤️❤️❤️",{fontSize:"22px"});

  // avatar
  if (avatarUrl) {
    const img = this.add.image(width-40,40, null).setDisplaySize(48,48);
    img.setMask(this.make.graphics().fillCircle(24,24,24).createGeometryMask());
    img.setOrigin(0.5);
    this.load.image("ava", avatarUrl);
    this.load.once("complete",()=>img.setTexture("ava"));
    this.load.start();
  }

  // rules
  this.rules = this.add.text(
    width/2, height/2,
`🎮 ПРАВИЛА

💩 👻 −100
🍒 🍓 +100
💣 −500
🧿 щит
❤️ жизнь
🇷🇺 +1000

Свайп ← →`,
    {fontSize:"18px",color:"#fff",align:"left"}
  ).setOrigin(0.5);

  // input
  let sx = 0;
  this.input.on("pointerdown",p=>{
    if(!rulesShown){this.rules.destroy();rulesShown=true;return;}
    if(!started){started=true;tgHaptic("light");return;}
    if(gameOver){this.scene.restart();return;}
    sx=p.x;
  });
  this.input.on("pointerup",p=>{
    if(!started||gameOver)return;
    const dx=p.x-sx;
    if(Math.abs(dx)<40)return;
    currentLane=Phaser.Math.Clamp(currentLane+(dx>0?1:-1),0,LANE_COUNT-1);
    player.x=lanes[currentLane];
  });
}

// ===============================
// UPDATE
// ===============================

function update(_,delta){
  if(!started||gameOver)return;

  player.glow.x=player.x;
  player.glow.y=player.y;

  levelTimer+=delta;
  if(levelTimer>=LEVEL_DURATION){
    levelTimer=0;
    level++;
    lifeDroppedThisLevel=false;
    const cfg=LEVELS[(level-1)%LEVELS.length];
    currentSpeed=cfg.speed;
    spawnDelay=cfg.spawn;
    theme=THEMES[cfg.theme];
    this.road.fillColor=theme.road;
    this.bg.fillColor=theme.neon;
  }

  spawnTimer+=delta;
  if(spawnTimer>=spawnDelay){
    spawnTimer=0;
    spawnItem.call(this);
  }

  for(let i=items.length-1;i>=0;i--){
    const it=items[i];
    it.y+=currentSpeed;
    it.glow.y=it.y;
    if(Math.abs(it.x-player.x)<28&&Math.abs(it.y-player.y)<28){
      hit.call(this,it);
      it.glow.destroy();it.destroy();items.splice(i,1);
    }else if(it.y>this.scale.height+50){
      it.glow.destroy();it.destroy();items.splice(i,1);
    }
  }

  if(shieldUntil&&Date.now()>shieldUntil) shieldUntil=0;
}

// ===============================
// SPAWN / HIT
// ===============================

function spawnItem(){
  const pool=ITEMS.filter(i=>{
    if(i.type==="life"&&lifeDroppedThisLevel)return false;
    if(i.type==="flag"&&level%2)return false;
    return true;
  });
  const sum=pool.reduce((s,i)=>s+i.weight,0);
  let r=Math.random()*sum, pick;
  for(const i of pool){r-=i.weight;if(r<=0){pick=i;break;}}
  if(!pick)return;
  if(pick.type==="life")lifeDroppedThisLevel=true;
  const icon=Array.isArray(pick.icon)?pick.icon[Math.random()*pick.icon.length|0]:pick.icon;
  const lane=Phaser.Math.Between(0,LANE_COUNT-1);
  const t=this.add.text(lanes[lane],-40,icon,{fontSize:"34px"}).setOrigin(0.5);
  t.meta=pick;
  t.glow=this.add.text(t.x,t.y,icon,{fontSize:"34px",color:hex(theme.neon)}).setOrigin(0.5).setAlpha(0.25);
  items.push(t);
}

function hit(it){
  const m=it.meta;
  if(m.score){
    score=Math.max(0,score+m.score);
    this.scoreText.setText(score);
  }
  if(m.life){
    lives=Math.min(5,lives+1);
    this.livesText.setText("❤️".repeat(lives));
    tgHaptic("success");
  }
  if(m.shield){
    shieldUntil=Date.now()+m.shield;
    tgHaptic("medium");
  }
  if(m.score<0&&!shieldUntil){
    lives--;
    this.livesText.setText("❤️".repeat(Math.max(0,lives)));
    tgHaptic("heavy");
    if(lives<=0) endGame.call(this);
  }
}

// ===============================
// GAME OVER + RECORDS
// ===============================

function endGame(){
  gameOver=true;

  if(score>bestScore){
    bestScore=score;
    cloudSet("bestScore",bestScore);
    localStorage.setItem("bestScore",bestScore);
  }

  const recs=JSON.parse(localStorage.getItem("records")||"[]");
  recs.push({name:username||"anon",score});
  recs.sort((a,b)=>b.score-a.score);
  localStorage.setItem("records",JSON.stringify(recs.slice(0,10)));

  let table="🏆 ТОП 5\n\n";
  recs.slice(0,5).forEach((r,i)=>table+=`${i+1}. ${r.name} — ${r.score}\n`);

  this.add.text(
    this.scale.width/2,this.scale.height/2,
`💥 GAME OVER

${username||"Игрок"}, ${score}

${table}

Тап для рестарта`,
    {fontSize:"22px",color:"#fff",align:"center"}
  ).setOrigin(0.5);

  tgHaptic("error");
}