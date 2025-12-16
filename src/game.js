// ===============================
// BASIC CONFIG
// ===============================

const LEVEL_DURATION = 10000;
const LANE_COUNT = 4;

const LEVELS = [
  { speed: 5.5, spawn: 520, theme: "pink" },
  { speed: 6.5, spawn: 480, theme: "purple" },
  { speed: 7.5, spawn: 440, theme: "cyan" },
  { speed: 8.5, spawn: 400, theme: "red" },
  { speed: 9.5, spawn: 360, theme: "acid" },
];

const THEMES = {
  pink:   { road: 0x22001f, neon: 0xff2b8f },
  purple: { road: 0x1f0033, neon: 0x9b5cff },
  cyan:   { road: 0x002b2e, neon: 0x00fff2 },
  red:    { road: 0x2b0000, neon: 0xff0033 },
  acid:   { road: 0x003b28, neon: 0x39ff14 },
};

const ITEMS = [
  { icon: "💩", score: -100, w: 30 },
  { icon: "👻", score: -100, w: 20 },
  { icon: ["🍒","🍓"], score: 100, w: 25 },
  { icon: "💣", score: -500, w: 15 },
  { icon: "🧿", shield: 4000, w: 7 },
  { icon: "❤️", life: 1, w: 2 },
  { icon: "🇷🇺", score: 1000, w: 1 },
];

// ===============================
// TELEGRAM
// ===============================

const tg = window.Telegram?.WebApp;
const cloud = tg?.CloudStorage;

const haptic = (t) => {
  try {
    if (!tg?.HapticFeedback) return;
    if (t === "error") tg.HapticFeedback.notificationOccurred("error");
    else if (t === "success") tg.HapticFeedback.notificationOccurred("success");
    else tg.HapticFeedback.impactOccurred(t);
  } catch {}
};

const cloudGet = (k) => new Promise(r => cloud ? cloud.getItem(k, (_, v) => r(v)) : r(null));
const cloudSet = (k,v) => cloud && cloud.setItem(k, String(v), ()=>{});

// ===============================
// GAME STATE
// ===============================

let scene;
let lanes, items;
let player, glow;
let score, lives, level;
let speed, spawnDelay, spawnTimer;
let theme, shieldUntil;
let started, gameOver;

let username = null;
let bestScore = 0;

// ===============================
// PHASER INIT
// ===============================

new Phaser.Game({
  type: Phaser.AUTO,
  width: window.innerWidth,
  height: window.innerHeight,
  backgroundColor: "#000",
  scene: { preload, create, update }
});

function preload(){}

// ===============================
// CREATE
// ===============================

async function create() {
  scene = this;
  items = [];
  started = false;
  gameOver = false;

  score = 0;
  lives = 3;
  level = 1;
  spawnTimer = 0;

  theme = THEMES.pink;
  speed = LEVELS[0].speed;
  spawnDelay = LEVELS[0].spawn;

  username = await cloudGet("username") || localStorage.getItem("username");
  bestScore = Number(await cloudGet("bestScore") || localStorage.getItem("bestScore") || 0);

  if (tg?.initDataUnsafe?.user) {
    if (!username) username = tg.initDataUnsafe.user.first_name;
  }

  const { width, height } = scene.scale;

  // background glow
  scene.add.rectangle(width/2, height/2, width, height, theme.neon, 0.06);

  // lanes
  lanes = [];
  const lw = width / LANE_COUNT;
  for (let i=0;i<LANE_COUNT;i++) lanes.push(lw*i + lw/2);

  // road
  scene.road = scene.add.rectangle(
    width/2, height/2,
    Math.min(width-30,520),
    height+60,
    theme.road
  );
  scene.road.setStrokeStyle(4, theme.neon, 0.9);

  // player
  player = scene.add.text(lanes[1], height-120, "🚗", { fontSize:"42px" }).setOrigin(0.5);
  glow = scene.add.text(player.x, player.y, "🚗", {
    fontSize:"42px", color:"#"+theme.neon.toString(16)
  }).setOrigin(0.5).setAlpha(0.3);

  // UI
  scene.scoreText = scene.add.text(16,16,"0",{fontSize:"24px",color:"#fff"});
  scene.bestText  = scene.add.text(16,44,`BEST ${bestScore}`,{fontSize:"14px",color:"#aaa"});
  scene.livesText = scene.add.text(16,66,"❤️❤️❤️",{fontSize:"22px"});

  // RULES
  scene.rules = scene.add.text(width/2,height/2,
`🎮 ПРАВИЛА

💩 👻 −100
🍒 🍓 +100
💣 −500
🧿 ЩИТ
❤️ ЖИЗНЬ
🇷🇺 +1000

СВАЙП ← →`,
  {fontSize:"18px",color:"#fff",align:"left"}).setOrigin(0.5);

  // INPUT
  let sx = 0;
  scene.input.on("pointerdown",p=>{
    if(scene.rules){
      scene.rules.destroy();
      scene.rules=null;
      return;
    }
    if(!started){
      started=true;
      haptic("light");
      return;
    }
    if(gameOver){
      scene.scene.restart();
      return;
    }
    sx=p.x;
  });

  scene.input.on("pointerup",p=>{
    if(!started||gameOver)return;
    const dx=p.x-sx;
    if(Math.abs(dx)<40)return;
    const dir=dx>0?1:-1;
    const i=Phaser.Math.Clamp(lanes.indexOf(player.x)+dir,0,LANE_COUNT-1);
    player.x=lanes[i];
  });
}

// ===============================
// UPDATE
// ===============================

function update(_,delta){
  if(!started||gameOver)return;

  glow.x=player.x; glow.y=player.y;

  spawnTimer+=delta;
  if(spawnTimer>=spawnDelay){
    spawnTimer=0;
    spawnItem();
  }

  items.forEach((it,i)=>{
    it.y+=speed;
    it.glow.y=it.y;

    if(Math.abs(it.x-player.x)<28 && Math.abs(it.y-player.y)<28){
      hit(it);
      it.glow.destroy(); it.destroy();
      items.splice(i,1);
    } else if(it.y>scene.scale.height+60){
      it.glow.destroy(); it.destroy();
      items.splice(i,1);
    }
  });

  if(shieldUntil && Date.now()>shieldUntil) shieldUntil=0;
}

// ===============================
// GAME LOGIC
// ===============================

function spawnItem(){
  const sum=ITEMS.reduce((s,i)=>s+i.w,0);
  let r=Math.random()*sum;
  let pick;
  for(const i of ITEMS){r-=i.w;if(r<=0){pick=i;break;}}
  if(!pick)return;

  const icon=Array.isArray(pick.icon)?pick.icon[Math.random()*pick.icon.length|0]:pick.icon;
  const lane=Phaser.Math.Between(0,LANE_COUNT-1);

  const t=scene.add.text(lanes[lane],-40,icon,{fontSize:"34px"}).setOrigin(0.5);
  t.meta=pick;
  t.glow=scene.add.text(t.x,t.y,icon,{fontSize:"34px",color:"#"+theme.neon.toString(16)})
    .setOrigin(0.5).setAlpha(0.25);

  items.push(t);
}

function hit(it){
  const m=it.meta;

  if(m.score){
    score=Math.max(0,score+m.score);
    scene.scoreText.setText(score);
  }

  if(m.life){
    lives=Math.min(5,lives+1);
    scene.livesText.setText("❤️".repeat(lives));
    haptic("success");
  }

  if(m.shield){
    shieldUntil=Date.now()+m.shield;
    haptic("medium");
  }

  if(m.score<0 && !shieldUntil){
    lives--;
    scene.livesText.setText("❤️".repeat(Math.max(0,lives)));
    haptic("heavy");
    if(lives<=0) endGame();
  }
}

// ===============================
// GAME OVER
// ===============================

function endGame(){
  gameOver=true;

  if(score>bestScore){
    bestScore=score;
    cloudSet("bestScore",score);
    localStorage.setItem("bestScore",score);
  }

  scene.add.text(
    scene.scale.width/2,
    scene.scale.height/2,
`💥 GAME OVER

${username||"Игрок"} — ${score}

Тап для рестарта`,
    {fontSize:"24px",color:"#fff",align:"center"}
  ).setOrigin(0.5);

  haptic("error");
}