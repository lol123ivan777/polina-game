// ==================================
// CONFIG
// ==================================

const LEVEL_DURATION = 10_000;

const LEVELS = [
  { speed: 4.5, spawn: 700, theme: "pink" },
  { speed: 5.5, spawn: 620, theme: "purple" },
  { speed: 6.5, spawn: 560, theme: "cyan" },
  { speed: 7.5, spawn: 500, theme: "red" },
  { speed: 8.5, spawn: 440, theme: "acid" }
];

const THEMES = {
  pink:   { bg1: 0x12000f, bg2: 0x220018, road: 0x140016, neon: 0xff2b8f },
  purple: { bg1: 0x0f0018, bg2: 0x1a0026, road: 0x120018, neon: 0x9b5cff },
  cyan:   { bg1: 0x001316, bg2: 0x001f24, road: 0x001417, neon: 0x00fff2 },
  red:    { bg1: 0x160000, bg2: 0x240000, road: 0x180000, neon: 0xff0033 },
  acid:   { bg1: 0x00160e, bg2: 0x00261a, road: 0x001a12, neon: 0x39ff14 }
};

const ITEMS = [
  { icon: "💩", score: -100, weight: 30 },
  { icon: "👻", score: -100, weight: 20 },
  { icon: ["🍒","🍓"], score: 100, weight: 25 },
  { icon: "💣", score: -500, weight: 15 },
  { icon: "🧿", shield: 4000, weight: 7 },
  { icon: "❤️", life: 1, weight: 2 },
  { icon: "🇷🇺", score: 1000, weight: 1 }
];

const LANE_COUNT = 4;

// ==================================
// STATE
// ==================================

let scene;
let lanes = [];
let items = [];

let player, playerGlow;
let score, lives;
let level, levelTimer;
let speed, spawnDelay, spawnTimer;
let theme;
let started = false;
let gameOver = false;
let shieldUntil = 0;

// ==================================
// HELPERS
// ==================================

const hex = n => "#" + n.toString(16).padStart(6,"0");

// ==================================
// PHASER INIT
// ==================================

new Phaser.Game({
  type: Phaser.AUTO,
  width: window.innerWidth,
  height: window.innerHeight,
  backgroundColor: "#000000",
  scene: { create, update }
});

// ==================================
// CREATE
// ==================================

function create() {
  scene = this;
  resetState();

  const { width, height } = scene.scale;

  // BACKGROUND
  scene.bg1 = scene.add.rectangle(width/2, height/2, width, height, theme.bg1);
  scene.bg2 = scene.add.rectangle(width/2, height/2, width, height, theme.bg2, 0.35);

  scene.tweens.add({
    targets: scene.bg2,
    alpha: { from: 0.25, to: 0.5 },
    duration: 2200,
    yoyo: true,
    repeat: -1
  });

  // ROAD
  const roadW = Math.min(width - 40, 520);
  scene.roadGlow = scene.add.rectangle(width/2, height/2, roadW + 24, height + 80, theme.neon, 0.15);
  scene.road = scene.add.rectangle(width/2, height/2, roadW, height + 60, theme.road);

  // NEON BORDERS
  scene.leftBorder = scene.add.rectangle(14, height/2, 6, height, theme.neon, 0.8);
  scene.rightBorder = scene.add.rectangle(width-14, height/2, 6, height, theme.neon, 0.8);

  scene.tweens.add({
    targets: [scene.leftBorder, scene.rightBorder],
    alpha: { from: 0.4, to: 1 },
    duration: 600,
    yoyo: true,
    repeat: -1
  });

  // LANES
  const laneW = width / LANE_COUNT;
  lanes = [];
  for (let i=0;i<LANE_COUNT;i++) lanes.push(laneW*i + laneW/2);

  // PLAYER
  player = scene.add.text(lanes[1], height-120, "🚗", { fontSize: "44px" }).setOrigin(0.5);
  playerGlow = scene.add.text(player.x, player.y, "🚗", {
    fontSize: "44px",
    color: hex(theme.neon)
  }).setOrigin(0.5).setAlpha(0.25);

  // UI
  scene.scoreText = scene.add.text(16,16,"0",{fontSize:"26px",color:"#fff"});
  scene.livesText = scene.add.text(16,48,"❤️❤️❤️",{fontSize:"22px"});
  scene.levelText = scene.add.text(16,80,"LEVEL 1",{fontSize:"14px",color:"#bbb"});

  // RULES
  scene.rules = scene.add.text(
    width/2, height/2,
`🎮 ПРАВИЛА

💩 👻 −100
🍒 🍓 +100
💣 −500
🧿 щит
❤️ жизнь
🇷🇺 +1000

Тап — старт`,
    { fontSize:"18px", color:"#fff", align:"left" }
  ).setOrigin(0.5);

  // INPUT
  let startX = 0;

  scene.input.on("pointerdown", p => {
    if (scene.rules) {
      scene.rules.destroy();
      scene.rules = null;
      return;
    }
    if (!started) {
      started = true;
      scene.cameras.main.flash(120,0,255,200);
      return;
    }
    startX = p.x;
  });

  scene.input.on("pointerup", p => {
    if (!started || gameOver) return;
    const dx = p.x - startX;
    if (Math.abs(dx) < 40) return;
    const dir = dx > 0 ? 1 : -1;
    const idx = Phaser.Math.Clamp(lanes.indexOf(player.x)+dir,0,LANE_COUNT-1);
    player.x = lanes[idx];
    playerGlow.x = player.x;
  });
}

// ==================================
// UPDATE
// ==================================

function update(_, delta) {
  if (!started || gameOver) return;

  playerGlow.x = player.x;
  playerGlow.y = player.y;

  levelTimer += delta;
  if (levelTimer >= LEVEL_DURATION) nextLevel();

  spawnTimer += delta;
  if (spawnTimer >= spawnDelay) {
    spawnTimer = 0;
    spawnItem();
  }

  for (let i=items.length-1;i>=0;i--) {
    const it = items[i];
    it.y += speed;
    it.glow.y = it.y;

    if (Math.abs(it.x-player.x)<28 && Math.abs(it.y-player.y)<28) {
      hitItem(it);
      it.glow.destroy(); it.destroy();
      items.splice(i,1);
      continue;
    }

    if (it.y > scene.scale.height+60) {
      it.glow.destroy(); it.destroy();
      items.splice(i,1);
    }
  }

  if (shieldUntil && Date.now()>shieldUntil) shieldUntil = 0;
}

// ==================================
// GAME LOGIC
// ==================================

function spawnItem() {
  const pool = ITEMS;
  const total = pool.reduce((s,i)=>s+i.weight,0);
  let r = Math.random()*total, pick;
  for (const i of pool) { r-=i.weight; if (r<=0){pick=i;break;} }
  if (!pick) return;

  const icon = Array.isArray(pick.icon)
    ? pick.icon[Math.random()*pick.icon.length|0]
    : pick.icon;

  const lane = Phaser.Math.Between(0,LANE_COUNT-1);
  const t = scene.add.text(lanes[lane], -40, icon, {fontSize:"34px"}).setOrigin(0.5);
  t.meta = pick;
  t.glow = scene.add.text(t.x,t.y,icon,{fontSize:"34px",color:hex(theme.neon)})
    .setOrigin(0.5).setAlpha(0.25);

  items.push(t);
}

function hitItem(it) {
  const m = it.meta;

  if (m.score) {
    score = Math.max(0, score + m.score);
    scene.scoreText.setText(score);
  }

  if (m.life) {
    lives = Math.min(5, lives+1);
    scene.livesText.setText("❤️".repeat(lives));
  }

  if (m.shield) {
    shieldUntil = Date.now() + m.shield;
  }

  if (m.score < 0 && !shieldUntil) {
    lives--;
    scene.livesText.setText("❤️".repeat(Math.max(0,lives)));
    scene.cameras.main.flash(100,255,0,80);
    scene.cameras.main.shake(120,0.01);
    if (lives<=0) endGame();
  }
}

function nextLevel() {
  level++;
  levelTimer = 0;
  const cfg = LEVELS[(level-1)%LEVELS.length];
  speed = cfg.speed;
  spawnDelay = cfg.spawn;
  theme = THEMES[cfg.theme];

  scene.bg1.fillColor = theme.bg1;
  scene.bg2.fillColor = theme.bg2;
  scene.road.fillColor = theme.road;
  scene.roadGlow.fillColor = theme.neon;
  scene.leftBorder.fillColor = theme.neon;
  scene.rightBorder.fillColor = theme.neon;
  playerGlow.setColor(hex(theme.neon));

  scene.levelText.setText(`LEVEL ${level}`);
  scene.cameras.main.flash(120,0,255,180);
}

// ==================================
// GAME OVER
// ==================================

function endGame() {
  gameOver = true;
  scene.add.text(
    scene.scale.width/2,
    scene.scale.height/2,
`💥 GAME OVER

СЧЁТ: ${score}

Тап для рестарта`,
    {fontSize:"24px",color:"#fff",align:"center"}
  ).setOrigin(0.5);
}

// ==================================
// RESET
// ==================================

function resetState() {
  items = [];
  score = 0;
  lives = 3;
  level = 1;
  levelTimer = 0;
  speed = LEVELS[0].speed;
  spawnDelay = LEVELS[0].spawn;
  spawnTimer = 0;
  theme = THEMES.pink;
  started = false;
  gameOver = false;
  shieldUntil = 0;
}