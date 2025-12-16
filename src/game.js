// ===============================
// CONFIG
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
  pink:   { bg1: 0x120010, bg2: 0x2b0031, road: 0x140016, neon: 0xff2b8f, neon2: 0xff6bd6 },
  purple: { bg1: 0x0b0016, bg2: 0x17002f, road: 0x120018, neon: 0x9b5cff, neon2: 0xd2a8ff },
  cyan:   { bg1: 0x001014, bg2: 0x001f24, road: 0x001417, neon: 0x00fff2, neon2: 0x7bfff8 },
  red:    { bg1: 0x140000, bg2: 0x2a0011, road: 0x180000, neon: 0xff0033, neon2: 0xff7b93 },
  acid:   { bg1: 0x00150f, bg2: 0x00321f, road: 0x001a12, neon: 0x39ff14, neon2: 0xb6ff57 },
};

const ITEMS = [
  { icon: "💩", score: -100, w: 30 },
  { icon: "👻", score: -100, w: 20 },
  { icon: ["🍒","🍓"], score: +100, w: 25 },
  { icon: "💣", score: -500, w: 15 },
  { icon: "🧿", shield: 4000, w: 7 },
  { icon: "❤️", life: +1, w: 2 },
  { icon: "🇷🇺", score: +1000, w: 1 }, // спец
];

// ===============================
// TELEGRAM (haptics optional)
// ===============================

const tg = window.Telegram?.WebApp;
const haptic = (t) => {
  try {
    const h = tg?.HapticFeedback;
    if (!h) return;
    if (t === "error") h.notificationOccurred("error");
    else if (t === "success") h.notificationOccurred("success");
    else h.impactOccurred(t);
  } catch {}
};

// ===============================
// HELPERS
// ===============================

const hex = (n) => "#" + (n >>> 0).toString(16).padStart(6, "0");

// weighted pick
function pickWeighted(arr) {
  const sum = arr.reduce((s, a) => s + a.w, 0);
  let r = Math.random() * sum;
  for (const a of arr) {
    r -= a.w;
    if (r <= 0) return a;
  }
  return arr[arr.length - 1];
}

// ===============================
// GAME STATE
// ===============================

let scene;
let lanes, items;
let player, playerGlow, shieldRing;

let score, lives;
let level, levelTimer;
let speed, spawnDelay, spawnTimer;
let theme, shieldUntil;
let started, gameOver;

let lifeDroppedThisLevel = false;

// visuals refs
let bgA, bgB, vignette, scanlines;
let road, roadGlow, roadInner;
let borderL, borderR, borderPulseL, borderPulseR;
let sparksL, sparksR;
let dashGroups = [];

let username = localStorage.getItem("username") || "Игрок";
let bestScore = Number(localStorage.getItem("bestScore") || 0);

// ===============================
// PHASER INIT
// ===============================

new Phaser.Game({
  type: Phaser.AUTO,
  width: window.innerWidth,
  height: window.innerHeight,
  backgroundColor: "#000",
  scale: { mode: Phaser.Scale.RESIZE, autoCenter: Phaser.Scale.CENTER_BOTH },
  scene: { preload, create, update }
});

function preload() {
  // tiny textures for particles/scanlines
  // particle dot
  const g = this.make.graphics({ x: 0, y: 0, add: false });
  g.fillStyle(0xffffff, 1);
  g.fillCircle(4, 4, 4);
  g.generateTexture("dot", 8, 8);
  g.destroy();

  // scanline texture 2px x 6px: line + transparent gap
  const s = this.make.graphics({ x: 0, y: 0, add: false });
  s.fillStyle(0xffffff, 0.12);
  s.fillRect(0, 0, 2, 2);
  s.fillStyle(0xffffff, 0.00);
  s.fillRect(0, 2, 2, 4);
  s.generateTexture("scan", 2, 6);
  s.destroy();
}

// ===============================
// CREATE
// ===============================

function create() {
  scene = this;

  resetState();

  const { width, height } = scene.scale;

  // ---------- BACKGROUND (dual layer for depth) ----------
  bgA = scene.add.rectangle(width / 2, height / 2, width, height, theme.bg1, 1).setDepth(-50);
  bgB = scene.add.rectangle(width / 2, height / 2, width * 1.1, height * 1.1, theme.bg2, 0.45).setDepth(-49);

  // soft pulse on bgB (breathing)
  scene.tweens.add({
    targets: bgB,
    alpha: { from: 0.35, to: 0.55 },
    duration: 1600,
    yoyo: true,
    repeat: -1,
    ease: "Sine.easeInOut"
  });

  // ---------- SIDE NEON BORDERS ----------
  borderL = scene.add.rectangle(14, height / 2, 8, height, theme.neon, 0.85).setDepth(30);
  borderR = scene.add.rectangle(width - 14, height / 2, 8, height, theme.neon, 0.85).setDepth(30);

  // glow duplicates (ADD blend)
  borderPulseL = scene.add.rectangle(14, height / 2, 22, height, theme.neon2, 0.16)
    .setBlendMode(Phaser.BlendModes.ADD).setDepth(29);
  borderPulseR = scene.add.rectangle(width - 14, height / 2, 22, height, theme.neon2, 0.16)
    .setBlendMode(Phaser.BlendModes.ADD).setDepth(29);

  // animated border pulses
  scene.tweens.add({
    targets: [borderPulseL, borderPulseR],
    alpha: { from: 0.10, to: 0.24 },
    duration: 520,
    yoyo: true,
    repeat: -1,
    ease: "Sine.easeInOut"
  });

  // ---------- SPARK PARTICLES (side energy) ----------
  sparksL = scene.add.particles(0, 0, "dot", {
    x: 14,
    y: { min: 0, max: height },
    lifespan: { min: 450, max: 800 },
    speedY: { min: -40, max: -120 },
    speedX: { min: 20, max: 60 },
    scale: { start: 0.6, end: 0 },
    alpha: { start: 0.65, end: 0 },
    quantity: 1,
    frequency: 18,
    blendMode: "ADD",
  }).setDepth(31);

  sparksR = scene.add.particles(0, 0, "dot", {
    x: width - 14,
    y: { min: 0, max: height },
    lifespan: { min: 450, max: 800 },
    speedY: { min: -40, max: -120 },
    speedX: { min: -60, max: -20 },
    scale: { start: 0.6, end: 0 },
    alpha: { start: 0.65, end: 0 },
    quantity: 1,
    frequency: 18,
    blendMode: "ADD",
  }).setDepth(31);

  // ---------- ROAD ----------
  const roadW = Math.min(width - 44, 520);
  road = scene.add.rectangle(width / 2, height / 2, roadW, height + 70, theme.road, 1).setDepth(-10);

  // road neon frame (stroke imitation using bigger rect)
  roadGlow = scene.add.rectangle(width / 2, height / 2, roadW + 18, height + 90, theme.neon, 0.10)
    .setBlendMode(Phaser.BlendModes.ADD).setDepth(-11);

  roadInner = scene.add.rectangle(width / 2, height / 2, roadW - 10, height + 50, 0x000000, 0.06)
    .setDepth(-9);

  // ---------- LANE DASHES ----------
  dashGroups = [];
  const laneX0 = width / 2 - roadW / 2;
  const dashH = 28;
  const gap = 30;

  for (let i = 1; i < LANE_COUNT; i++) {
    const x = laneX0 + (roadW / LANE_COUNT) * i;
    const dashes = [];
    for (let y = -40; y < height + 80; y += dashH + gap) {
      const d = scene.add.rectangle(x, y, 4, dashH, theme.neon, 0.45).setDepth(-8);
      const dg = scene.add.rectangle(x, y, 12, dashH, theme.neon2, 0.08)
        .setBlendMode(Phaser.BlendModes.ADD).setDepth(-9);
      d.glow = dg;
      dashes.push(d);
    }
    dashGroups.push(dashes);
  }

  // ---------- PLAYER ----------
  lanes = [];
  const laneW = width / LANE_COUNT;
  for (let i = 0; i < LANE_COUNT; i++) lanes.push(laneW * i + laneW / 2);

  player = scene.add.text(lanes[1], height - 120, "🚗", { fontSize: "44px" }).setOrigin(0.5).setDepth(5);

  playerGlow = scene.add.text(player.x, player.y, "🚗", { fontSize: "44px", color: hex(theme.neon2) })
    .setOrigin(0.5).setAlpha(0.28).setBlendMode(Phaser.BlendModes.ADD).setDepth(4);

  shieldRing = scene.add.circle(player.x, player.y, 34, theme.neon, 0.16)
    .setBlendMode(Phaser.BlendModes.ADD).setAlpha(0).setDepth(6);

  // ---------- UI ----------
  scene.scoreText = scene.add.text(18, 16, "0", { fontSize: "26px", color: "#fff" }).setDepth(50);
  scene.bestText  = scene.add.text(18, 46, `BEST ${bestScore}`, { fontSize: "14px", color: "#cfcfcf" }).setDepth(50);
  scene.livesText = scene.add.text(18, 66, "❤️❤️❤️", { fontSize: "22px" }).setDepth(50);
  scene.levelText = scene.add.text(18, 92, "LEVEL 1", { fontSize: "14px", color: "#bdbdbd" }).setDepth(50);

  // glow UI
  scene.scoreText.setShadow(0, 0, hex(theme.neon), 10);
  scene.livesText.setShadow(0, 0, "rgba(255,50,170,0.8)", 8);

  // ---------- SCANLINES ----------
  scanlines = scene.add.tileSprite(width / 2, height / 2, width, height, "scan")
    .setAlpha(0.25).setDepth(80);
  scanlines.setBlendMode(Phaser.BlendModes.MULTIPLY);

  // ---------- VIGNETTE ----------
  vignette = scene.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.18).setDepth(90);
  vignette.setBlendMode(Phaser.BlendModes.MULTIPLY);

  // ---------- RULES ----------
  scene.rules = scene.add.text(
    width / 2,
    height / 2,
`🎮 ПРАВИЛА

💩 👻  −100
🍒 🍓 +100
💣     −500
🧿     щит 4 сек
❤️     +1 жизнь (редко)
🇷🇺     +1000 (раз в 2 уровня)

Свайп ← → 
Тап — старт`,
    { fontSize: "18px", color: "#fff", align: "left" }
  ).setOrigin(0.5).setDepth(120);

  // ---------- INPUT (swipe lanes) ----------
  let swipeStartX = 0;

  scene.input.on("pointerdown", (p) => {
    if (scene.rules) {
      // close rules
      scene.tweens.add({
        targets: scene.rules,
        alpha: 0,
        duration: 160,
        onComplete: () => { scene.rules.destroy(); scene.rules = null; }
      });
      return;
    }

    if (!started) {
      started = true;
      levelKick();
      haptic("light");
      return;
    }

    if (gameOver) {
      scene.scene.restart();
      return;
    }

    swipeStartX = p.x;
  });

  scene.input.on("pointerup", (p) => {
    if (!started || gameOver) return;

    const dx = p.x - swipeStartX;
    if (Math.abs(dx) < 40) return;

    const dir = dx > 0 ? 1 : -1;
    const idx = Phaser.Math.Clamp(lanes.indexOf(player.x) + dir, 0, LANE_COUNT - 1);

    // smooth lane move
    scene.tweens.add({
      targets: [player, playerGlow, shieldRing],
      x: lanes[idx],
      duration: 120,
      ease: "Sine.easeOut"
    });
  });

  // handle resize nicely
  scene.scale.on("resize", (gameSize) => {
    const w = gameSize.width, h = gameSize.height;
    resizeAll(w, h);
  });
}

// ===============================
// UPDATE
// ===============================

function update(_, delta) {
  // animate scanlines
  if (scanlines) scanlines.tilePositionY += 0.8;

  if (!started || gameOver) return;

  // sync glow/ring if tweened
  playerGlow.x = player.x;
  playerGlow.y = player.y;
  shieldRing.x = player.x;
  shieldRing.y = player.y;

  // level timer
  levelTimer += delta;
  if (levelTimer >= LEVEL_DURATION) {
    levelTimer = 0;
    level++;
    lifeDroppedThisLevel = false;

    const cfg = LEVELS[(level - 1) % LEVELS.length];
    speed = cfg.speed;
    spawnDelay = cfg.spawn;

    applyTheme(THEMES[cfg.theme]);
    scene.levelText.setText(`LEVEL ${level}`);

    levelTransitionFX();
  }

  // spawn
  spawnTimer += delta;
  if (spawnTimer >= spawnDelay) {
    spawnTimer = 0;
    spawnItem();
  }

  // move dashes (fake road motion)
  for (const dashes of dashGroups) {
    for (const d of dashes) {
      d.y += speed * 0.65;
      d.glow.y = d.y;
      if (d.y > scene.scale.height + 60) {
        d.y = -60;
        d.glow.y = d.y;
      }
    }
  }

  // move items + collisions
  for (let i = items.length - 1; i >= 0; i--) {
    const it = items[i];
    it.y += speed;
    it.glow.y = it.y;

    if (Math.abs(it.x - player.x) < 28 && Math.abs(it.y - player.y) < 28) {
      handleHit(it);
      it.glow.destroy(); it.destroy();
      items.splice(i, 1);
      continue;
    }

    if (it.y > scene.scale.height + 80) {
      it.glow.destroy(); it.destroy();
      items.splice(i, 1);
    }
  }

  // shield expire
  if (shieldUntil && Date.now() > shieldUntil) {
    shieldUntil = 0;
    shieldRing.setAlpha(0);
  }
}

// ===============================
// CORE FUNCTIONS
// ===============================

function resetState() {
  items = [];
  lanes = [];

  score = 0;
  lives = 3;

  level = 1;
  levelTimer = 0;

  speed = LEVELS[0].speed;
  spawnDelay = LEVELS[0].spawn;
  spawnTimer = 0;

  theme = THEMES.pink;
  shieldUntil = 0;

  started = false;
  gameOver = false;

  lifeDroppedThisLevel = false;
}

function applyTheme(t) {
  theme = t;

  if (bgA) bgA.fillColor = theme.bg1;
  if (bgB) bgB.fillColor = theme.bg2;

  if (road) road.fillColor = theme.road;
  if (roadGlow) roadGlow.fillColor = theme.neon;

  if (borderL) borderL.fillColor = theme.neon;
  if (borderR) borderR.fillColor = theme.neon;
  if (borderPulseL) borderPulseL.fillColor = theme.neon2;
  if (borderPulseR) borderPulseR.fillColor = theme.neon2;

  if (playerGlow) playerGlow.setColor(hex(theme.neon2));
  if (shieldRing) shieldRing.setFillStyle(theme.neon, 0.16);

  if (scene?.scoreText) scene.scoreText.setShadow(0, 0, hex(theme.neon), 10);

  // recolor dashes
  for (const dashes of dashGroups) {
    for (const d of dashes) {
      d.fillColor = theme.neon;
      d.glow.fillColor = theme.neon2;
    }
  }

  // recolor particles
  if (sparksL) sparksL.setTint(theme.neon);
  if (sparksR) sparksR.setTint(theme.neon);
}

function spawnItem() {
  // restrictions:
  // ❤️ once per level
  // 🇷🇺 only every 2 levels
  const pool = ITEMS.filter((it) => {
    if (it.icon === "❤️" && lifeDroppedThisLevel) return false;
    if (it.icon === "🇷🇺" && (level % 2 !== 0)) return false;
    return true;
  });

  const pick = pickWeighted(pool);
  if (!pick) return;

  if (pick.icon === "❤️") lifeDroppedThisLevel = true;

  const icon = Array.isArray(pick.icon)
    ? pick.icon[(Math.random() * pick.icon.length) | 0]
    : pick.icon;

  const lane = Phaser.Math.Between(0, LANE_COUNT - 1);
  const x = lanes[lane] || (scene.scale.width / 2);

  const t = scene.add.text(x, -50, icon, { fontSize: "36px" })
    .setOrigin(0.5).setDepth(10);

  t.meta = pick;

  t.glow = scene.add.text(t.x, t.y, icon, { fontSize: "36px", color: hex(theme.neon) })
    .setOrigin(0.5)
    .setAlpha(0.22)
    .setBlendMode(Phaser.BlendModes.ADD)
    .setDepth(9);

  // micro pulse for pop
  scene.tweens.add({
    targets: [t, t.glow],
    scale: { from: 0.9, to: 1.15 },
    duration: 120,
    yoyo: true,
    ease: "Sine.easeOut"
  });

  items.push(t);
}

function handleHit(it) {
  const m = it.meta;
  const hasShield = !!shieldUntil;

  // score
  if (typeof m.score === "number" && m.score !== 0) {
    score = Math.max(0, score + m.score);
    scene.scoreText.setText(score);

    // score bounce
    scene.tweens.add({
      targets: scene.scoreText,
      scale: 1.15,
      duration: 90,
      yoyo: true
    });
  }

  // life
  if (m.life) {
    lives = Math.min(5, lives + 1);
    scene.livesText.setText("❤️".repeat(lives));
    haptic("success");
    punchFX("good");
  }

  // shield
  if (m.shield) {
    shieldUntil = Date.now() + m.shield;
    shieldRing.setAlpha(1);
    haptic("medium");
    punchFX("shield");
  }

  // damage
  if (typeof m.score === "number" && m.score < 0) {
    if (hasShield) {
      // blocked hit feels satisfying
      punchFX("block");
      haptic("light");
      return;
    }

    lives--;
    scene.livesText.setText("❤️".repeat(Math.max(0, lives)));
    haptic("heavy");
    punchFX("hit");

    if (lives <= 0) endGame();
  }
}

function endGame() {
  gameOver = true;

  // best score
  if (score > bestScore) {
    bestScore = score;
    localStorage.setItem("bestScore", String(bestScore));
    scene.bestText.setText(`BEST ${bestScore}`);
  }

  // dramatic end fx
  scene.cameras.main.shake(240, 0.02);
  scene.cameras.main.flash(180, 255, 0, 80);
  haptic("error");

  const txt = scene.add.text(
    scene.scale.width / 2,
    scene.scale.height / 2,
    `💥 GAME OVER\n\n${username} — ${score}\n\nТап для рестарта`,
    { fontSize: "24px", color: "#fff", align: "center" }
  ).setOrigin(0.5).setDepth(200);

  txt.setShadow(0, 0, hex(theme.neon), 14);
}

function levelKick() {
  // start punch
  scene.cameras.main.flash(140, 0, 255, 190);

  scene.tweens.add({
    targets: [roadGlow, borderPulseL, borderPulseR],
    alpha: { from: 0.06, to: 0.28 },
    duration: 220,
    yoyo: true,
    ease: "Sine.easeInOut"
  });
}

function levelTransitionFX() {
  // big transition
  scene.cameras.main.flash(160, 0, 255, 180);

  scene.tweens.add({
    targets: [bgB],
    alpha: { from: 0.20, to: 0.70 },
    duration: 260,
    yoyo: true,
    ease: "Sine.easeInOut"
  });

  scene.tweens.add({
    targets: [roadGlow, borderPulseL, borderPulseR],
    alpha: { from: 0.10, to: 0.32 },
    duration: 260,
    yoyo: true,
    ease: "Sine.easeInOut"
  });
}

function punchFX(mode) {
  // “damage / bonus / shield” feedback
  if (mode === "hit") {
    scene.cameras.main.shake(120, 0.012);
    scene.cameras.main.flash(90, 255, 30, 70);
    return;
  }
  if (mode === "block") {
    scene.cameras.main.flash(80, 0, 255, 220);
    return;
  }
  if (mode === "shield") {
    scene.cameras.main.flash(90, 0, 220, 255);
    return;
  }
  if (mode === "good") {
    scene.cameras.main.flash(70, 80, 255, 120);
  }
}

// ===============================
// RESIZE HANDLER
// ===============================

function resizeAll(w, h) {
  if (!scene) return;

  bgA.setPosition(w / 2, h / 2).setSize(w, h);
  bgB.setPosition(w / 2, h / 2).setSize(w * 1.1, h * 1.1);

  borderL.setPosition(14, h / 2).setSize(8, h);
  borderR.setPosition(w - 14, h / 2).setSize(8, h);
  borderPulseL.setPosition(14, h / 2).setSize(22, h);
  borderPulseR.setPosition(w - 14, h / 2).setSize(22, h);

  sparksL.setPosition(0, 0);
  sparksR.setPosition(0, 0);
  sparksL.emitters.list[0].setConfig({ x: 14, y: { min: 0, max: h } });
  sparksR.emitters.list[0].setConfig({ x: w - 14, y: { min: 0, max: h } });

  const roadW = Math.min(w - 44, 520);
  road.setPosition(w / 2, h / 2).setSize(roadW, h + 70);
  roadGlow.setPosition(w / 2, h / 2).setSize(roadW + 18, h + 90);
  roadInner.setPosition(w / 2, h / 2).setSize(roadW - 10, h + 50);

  scanlines.setPosition(w / 2, h / 2).setSize(w, h);
  vignette.setPosition(w / 2, h / 2).setSize(w, h);

  // rebuild lanes + move player
  lanes = [];
  const laneW = w / LANE_COUNT;
  for (let i = 0; i < LANE_COUNT; i++) lanes.push(laneW * i + laneW / 2);

  const idx = Phaser.Math.Clamp(lanes.indexOf(player.x), 0, LANE_COUNT - 1);
  player.y = h - 120;
  player.x = lanes[idx] || (w / 2);

  playerGlow.y = player.y;
  playerGlow.x = player.x;
  shieldRing.y = player.y;
  shieldRing.x = player.x;

  // UI stays top-left; ok
  // dashes: simplest = destroy & rebuild? (not necessary for now)
}