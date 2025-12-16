// ===============================
// CONFIG
// ===============================

const LEVEL_DURATION = 10_000; // 10 секунд

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
  { type: "fruit", icon: ["🍒", "🍓"], score: +100, weight: 25 },
  { type: "bomb",  icon: "💣", score: -500, weight: 15 },
  { type: "shield", icon: "🧿", shield: 4000, weight: 7 },
  { type: "life",  icon: "❤️", life: +1, weight: 2 },
  { type: "flag",  icon: "🇷🇺", score: +1000, weight: 1 }, // спец
];

const LANE_COUNT = 4;

// ===============================
// GAME STATE (сброс в create())
// ===============================

let player;
let items;
let lanes;
let currentLane;

let score;
let lives;

let level;
let levelTimer;
let currentSpeed;
let spawnDelay;
let spawnTimer;

let theme;
let shieldUntil;

let started;
let gameOver;
let rulesShown;

// ограничения дропа
let lifeDroppedThisLevel;

// ===============================
// HELPERS
// ===============================

function hex6(n) {
  return `#${(n >>> 0).toString(16).padStart(6, "0")}`;
}

function tgHaptic(kind) {
  const tg = window.Telegram?.WebApp;
  const h = tg?.HapticFeedback;
  if (!h) return;
  try {
    if (kind === "success") h.notificationOccurred("success");
    else if (kind === "error") h.notificationOccurred("error");
    else h.impactOccurred(kind); // "light" | "medium" | "heavy"
  } catch {}
}

// ===============================
// PHASER
// ===============================

const config = {
  type: Phaser.AUTO,
  width: window.innerWidth,
  height: window.innerHeight,
  backgroundColor: "#000",
  scene: { preload, create, update }
};

new Phaser.Game(config);

// ===============================
// PRELOAD
// ===============================
function preload() {}

// ===============================
// CREATE
// ===============================
function create() {
  // ✅ RESET STATE
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

  const { width, height } = this.scale;

  // --- subtle background glow layer ---
  this.bg = this.add.rectangle(width / 2, height / 2, width, height, theme.neon, 0.08);
  this.bg.setDepth(-2);

  // lanes
  const laneWidth = width / LANE_COUNT;
  for (let i = 0; i < LANE_COUNT; i++) {
    lanes.push(laneWidth * i + laneWidth / 2);
  }

  // road
  this.road = this.add.rectangle(
    width / 2,
    height / 2,
    Math.min(width - 30, 520),
    height + 50,
    theme.road
  );
  this.road.setDepth(-1);

  // lane lines (dashes)
  this.laneLines = [];
  const dashH = 26;
  const gap = 28;
  const laneX0 = width / 2 - this.road.width / 2;
  for (let i = 1; i < LANE_COUNT; i++) {
    const x = laneX0 + (this.road.width / LANE_COUNT) * i;
    const dashes = [];
    for (let y = -20; y < height + 60; y += (dashH + gap)) {
      const r = this.add.rectangle(x, y, 4, dashH, theme.neon, 0.55);
      r.setDepth(-0.5);
      dashes.push(r);
    }
    this.laneLines.push(dashes);
  }

  // player (emoji)
  player = this.add.text(
    lanes[currentLane],
    height - 120,
    "🚗",
    { fontSize: "42px" }
  ).setOrigin(0.5);

  // player glow (fake neon)
  player.glow = this.add.text(
    player.x,
    player.y,
    player.text,
    { fontSize: "42px", color: hex6(theme.neon) }
  ).setOrigin(0.5).setAlpha(0.30);

  // shield ring indicator (hidden by default)
  player.shieldRing = this.add.circle(player.x, player.y, 34, theme.neon, 0.18).setAlpha(0);

  // UI
  this.scoreText = this.add.text(16, 16, "0", { fontSize: "24px", color: "#fff" });
  this.scoreText.setShadow(0, 0, hex6(theme.neon), 10);

  this.livesText = this.add.text(16, 44, "❤️❤️❤️", { fontSize: "22px" });
  this.livesText.setShadow(0, 0, "rgba(255,0,120,0.6)", 8);

  this.levelText = this.add.text(16, 72, "LEVEL 1", { fontSize: "16px", color: "#bbb" });
  this.levelText.setShadow(0, 0, "rgba(255,255,255,0.25)", 6);

  // RULES OVERLAY
  this.rulesOverlay = this.add.text(
    width / 2,
    height / 2,
`🎮 ПРАВИЛА

💩 👻  −100
🍒 🍓 +100
💣      −500
🧿      Щит 4 сек
❤️      +1 жизнь (редко)
🇷🇺      +1000 (раз в 2 уровня)

Свайп ← →
Тап — старт`,
    { fontSize: "18px", color: "#fff", align: "left" }
  ).setOrigin(0.5);

  // INPUT
  let swipeStartX = 0;

  this.input.on("pointerdown", p => {
    if (!rulesShown) {
      this.rulesOverlay.destroy();
      rulesShown = true;
      return;
    }

    if (!started) {
      started = true;
      // маленький стартовый “пинок”
      this.cameras.main.flash(120, 0, 255, 180);
      tgHaptic("light");
      return;
    }

    if (gameOver) {
      this.scene.restart();
      return;
    }

    swipeStartX = p.x;
  });

  this.input.on("pointerup", p => {
    if (!started || gameOver) return;

    const dx = p.x - swipeStartX;
    if (Math.abs(dx) < 40) return;

    currentLane += dx > 0 ? 1 : -1;
    currentLane = Phaser.Math.Clamp(currentLane, 0, LANE_COUNT - 1);
    player.x = lanes[currentLane];
  });
}

// ===============================
// UPDATE
// ===============================
function update(_, delta) {
  if (!started || gameOver) return;

  const now = Date.now();

  // keep player glow + shield ring synced
  player.glow.x = player.x;
  player.glow.y = player.y;
  player.shieldRing.x = player.x;
  player.shieldRing.y = player.y;

  // animate lane dashes to fake movement
  for (const dashes of this.laneLines) {
    for (const r of dashes) {
      r.y += currentSpeed * 0.35;
      if (r.y > this.scale.height + 40) r.y = -40;
    }
  }

  // LEVEL TIMER
  levelTimer += delta;
  if (levelTimer >= LEVEL_DURATION) {
    levelTimer = 0;
    level++;
    lifeDroppedThisLevel = false;

    const cfg = LEVELS[(level - 1) % LEVELS.length];
    currentSpeed = cfg.speed;
    spawnDelay = cfg.spawn;

    theme = THEMES[cfg.theme];

    // apply theme
    this.road.fillColor = theme.road;
    this.bg.fillColor = theme.neon;
    player.glow.setColor(hex6(theme.neon));
    player.shieldRing.setFillStyle(theme.neon, 0.18);

    // recolor lane dashes
    for (const dashes of this.laneLines) {
      for (const r of dashes) r.fillColor = theme.neon;
    }

    this.scoreText.setShadow(0, 0, hex6(theme.neon), 10);
    this.levelText.setText(`LEVEL ${level}`);

    // level transition effect
    this.cameras.main.flash(120, 0, 255, 180);
    tgHaptic("medium");
  }

  // SPAWN
  spawnTimer += delta;
  if (spawnTimer >= spawnDelay) {
    spawnTimer = 0;
    spawnItem.call(this);
  }

  // ITEMS MOVE
  for (let i = items.length - 1; i >= 0; i--) {
    const it = items[i];
    it.y += currentSpeed;
    if (it.glow) {
      it.glow.x = it.x;
      it.glow.y = it.y;
    }

    // collision
    if (Math.abs(it.x - player.x) < 28 && Math.abs(it.y - player.y) < 28) {
      handleHit.call(this, it);

      if (it.glow) it.glow.destroy();
      it.destroy();
      items.splice(i, 1);
      continue;
    }

    // cleanup
    if (it.y > this.scale.height + 60) {
      if (it.glow) it.glow.destroy();
      it.destroy();
      items.splice(i, 1);
    }
  }

  // SHIELD EXPIRE
  if (shieldUntil && now > shieldUntil) {
    shieldUntil = 0;
    player.setAlpha(1);
    player.shieldRing.setAlpha(0);
  }
}

// ===============================
// SPAWN ITEM
// ===============================
function spawnItem() {
  const pool = ITEMS.filter(it => {
    if (it.type === "life" && lifeDroppedThisLevel) return false;
    if (it.type === "flag" && level % 2 !== 0) return false;
    return true;
  });

  const total = pool.reduce((s, i) => s + i.weight, 0);
  let r = Math.random() * total;
  let item = null;

  for (const it of pool) {
    r -= it.weight;
    if (r <= 0) { item = it; break; }
  }
  if (!item) return;

  if (item.type === "life") lifeDroppedThisLevel = true;

  const icon = Array.isArray(item.icon)
    ? item.icon[Math.floor(Math.random() * item.icon.length)]
    : item.icon;

  const lane = Phaser.Math.Between(0, LANE_COUNT - 1);

  const t = this.add.text(lanes[lane], -40, icon, { fontSize: "34px" }).setOrigin(0.5);
  t.meta = item;

  // glow for item
  t.glow = this.add.text(t.x, t.y, t.text, { fontSize: "34px", color: hex6(theme.neon) })
    .setOrigin(0.5)
    .setAlpha(0.25);

  // micro pulse
  this.tweens.add({
    targets: [t, t.glow],
    scale: 1.12,
    duration: 140,
    yoyo: true
  });

  items.push(t);
}

// ===============================
// HIT LOGIC
// ===============================
function handleHit(it) {
  const meta = it.meta;

  const hasShield = !!shieldUntil;

  // score changes
  if (typeof meta.score === "number" && meta.score !== 0) {
    score += meta.score;
    this.scoreText.setText(score);

    // arcade bump
    this.tweens.add({
      targets: this.scoreText,
      scale: 1.18,
      duration: 90,
      yoyo: true
    });
  }

  // life
  if (meta.life) {
    lives = Math.min(lives + 1, 5);
    this.livesText.setText("❤️".repeat(lives));
    tgHaptic("success");
  }

  // shield
  if (meta.shield) {
    shieldUntil = Date.now() + meta.shield;
    player.setAlpha(0.75);
    player.shieldRing.setAlpha(1);
    tgHaptic("medium");
  }

  // damage (negative score types) only if no shield
  if (typeof meta.score === "number" && meta.score < 0 && !hasShield) {
    lives--;
    this.livesText.setText("❤️".repeat(Math.max(0, lives)));

    // hit feedback
    this.cameras.main.flash(120, 255, 0, 80);
    this.cameras.main.shake(120, 0.012);
    tgHaptic("heavy");

    if (lives <= 0) endGame.call(this);
    return;
  }

  // non-damage feedback (bonus or blocked by shield)
  if (typeof meta.score === "number" && meta.score > 0) tgHaptic("light");
  if (typeof meta.score === "number" && meta.score < 0 && hasShield) {
    // blocked hit feels good
    this.cameras.main.flash(90, 0, 255, 240);
    tgHaptic("light");
  }
}

// ===============================
// GAME OVER
// ===============================
function endGame() {
  gameOver = true;

  tgHaptic("error");
  this.cameras.main.flash(200, 255, 0, 80);
  this.cameras.main.shake(220, 0.02);

  // dim player
  player.setAlpha(0.35);
  player.glow.setAlpha(0.10);
  player.shieldRing.setAlpha(0);

  this.add.text(
    this.scale.width / 2,
    this.scale.height / 2,
    `💥 GAME OVER\n\nСчёт: ${score}\n\nТап для рестарта`,
    { fontSize: "28px", color: "#fff", align: "center" }
  ).setOrigin(0.5);
}