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
  { type: "poop", icon: "💩", score: -100, weight: 30 },
  { type: "ghost", icon: "👻", score: -100, weight: 20 },
  { type: "fruit", icon: ["🍒", "🍓"], score: +100, weight: 25 },
  { type: "bomb", icon: "💣", score: -500, weight: 15 },
  { type: "shield", icon: "🧿", shield: 4000, weight: 7 },
  { type: "life", icon: "❤️", life: +1, weight: 2 },
  { type: "flag", icon: "🇷🇺", score: +1000, weight: 1 }, // спец
];

const LANE_COUNT = 4;

// ===============================
// GAME STATE
// ===============================

let player;
let items = [];
let lanes = [];
let currentLane = 1;

let score = 0;
let lives = 3;

let level = 1;
let levelTimer = 0;
let currentSpeed = LEVELS[0].speed;
let spawnDelay = LEVELS[0].spawn;
let spawnTimer = 0;

let theme = THEMES.pink;
let shieldUntil = 0;

let started = false;
let gameOver = false;
let rulesShown = false;

// ограничения дропа
let lifeDroppedThisLevel = false;

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
  const { width, height } = this.scale;

  // lanes
  const laneWidth = width / LANE_COUNT;
  lanes = [];
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
  ).setRadius(24);

  // lane lines
  this.laneLines = [];
  for (let i = 1; i < LANE_COUNT; i++) {
    const line = this.add.rectangle(
      width / 2 - this.road.width / 2 + (this.road.width / LANE_COUNT) * i,
      height / 2,
      4,
      height,
      theme.neon,
      0.4
    );
    this.laneLines.push(line);
  }

  // player
  player = this.add.text(
    lanes[currentLane],
    height - 120,
    "🚗",
    { fontSize: "42px" }
  ).setOrigin(0.5);

  // UI
  this.scoreText = this.add.text(16, 16, "0", { fontSize: "24px", color: "#fff" });
  this.livesText = this.add.text(16, 44, "❤️❤️❤️", { fontSize: "22px" });
  this.levelText = this.add.text(16, 72, "LEVEL 1", { fontSize: "16px", color: "#aaa" });

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
    this.road.fillColor = theme.road;
    this.laneLines.forEach(l => l.fillColor = theme.neon);

    this.levelText.setText(`LEVEL ${level}`);
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

    if (Math.abs(it.x - player.x) < 28 && Math.abs(it.y - player.y) < 28) {
      handleHit.call(this, it);
      it.destroy();
      items.splice(i, 1);
      continue;
    }

    if (it.y > this.scale.height + 40) {
      it.destroy();
      items.splice(i, 1);
    }
  }

  // SHIELD EXPIRE
  if (shieldUntil && now > shieldUntil) {
    shieldUntil = 0;
  }
}

// ===============================
// SPAWN ITEM
// ===============================
function spawnItem() {
  let pool = ITEMS.filter(it => {
    if (it.type === "life" && lifeDroppedThisLevel) return false;
    if (it.type === "flag" && level % 2 !== 0) return false;
    return true;
  });

  const total = pool.reduce((s, i) => s + i.weight, 0);
  let r = Math.random() * total;
  let item;

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
  t.type = item.type;
  t.meta = item;

  items.push(t);
}

// ===============================
// HIT LOGIC
// ===============================
function handleHit(it) {
  const meta = it.meta;

  if (meta.score) {
    score += meta.score;
    this.scoreText.setText(score);
  }

  if (meta.life) {
    lives = Math.min(lives + 1, 5);
    this.livesText.setText("❤️".repeat(lives));
  }

  if (meta.shield) {
    shieldUntil = Date.now() + meta.shield;
  }

  if (meta.score < 0 && !shieldUntil) {
    lives--;
    this.livesText.setText("❤️".repeat(lives));
    if (lives <= 0) endGame.call(this);
  }
}

// ===============================
// GAME OVER
// ===============================
function endGame() {
  gameOver = true;
  this.add.text(
    this.scale.width / 2,
    this.scale.height / 2,
    `💥 GAME OVER\n\n${score}\n\nТап для рестарта`,
    { fontSize: "28px", color: "#fff", align: "center" }
  ).setOrigin(0.5);
}