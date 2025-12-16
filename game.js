const config = {
  type: Phaser.AUTO,
  width: window.innerWidth,
  height: window.innerHeight,
  backgroundColor: "rgba(0,0,0,0)",
  scene: { preload, create, update }
};

new Phaser.Game(config);

// ---------------- CONFIG ----------------
const LANE_COUNT = 4;
const PLAYER_Y_OFFSET = 130;

const BASE_FALL_SPEED = 6;
const SPEED_GROW = 0.6;
const SPAWN_BASE = 520;
const SPAWN_MIN = 240;

const START_LIVES = 3;

// вероятности (в сумме < 1)
const PROBS = {
  poop: 0.30,     // 💀
  bomb: 0.40,     // 💣
  speed: 0.22,    // ⚡
  life: 0.08      // ❤️ (редкий)
};

// ---------------- STATE ----------------
let lanes = [];
let laneWidth;
let currentLane = 1;

let items = [];
let score = 0;
let lives = START_LIVES;

let started = false;
let gameOver = false;

let fallSpeed = BASE_FALL_SPEED;
let spawnDelay = SPAWN_BASE;
let spawnCooldown = 0;

let player;
let scoreText;
let livesText;
let shieldActive = false;
let shieldTimer = 0;

// ---------------- CREATE ----------------
function create() {
  const { width, height } = this.scale;
  laneWidth = width / LANE_COUNT;

  lanes = [];
  items = [];
  currentLane = 1;

  score = 0;
  lives = START_LIVES;
  started = false;
  gameOver = false;

  fallSpeed = BASE_FALL_SPEED;
  spawnDelay = SPAWN_BASE;

  for (let i = 0; i < LANE_COUNT; i++) {
    lanes.push(laneWidth * i + laneWidth / 2);
  }

  drawRoad(this);

  scoreText = this.add.text(20, 16, "💣 0", { fontSize: "24px", color: "#fff" });
  livesText = this.add.text(20, 44, "❤️❤️❤️", { fontSize: "22px" });

  const px = lanes[currentLane];
  const py = height - PLAYER_Y_OFFSET;

  const glow = this.add.circle(px, py, 34, 0xff2b8f, 0.25);
  const bg = this.add.circle(px, py, 28, 0xffffff, 0.9);
  const icon = this.add.text(px, py, "🚗", { fontSize: "34px" }).setOrigin(0.5);

  this.tweens.add({
    targets: glow,
    scale: 1.15,
    duration: 500,
    yoyo: true,
    repeat: -1
  });

  player = { x: px, y: py, glow, bg, icon };

  const startText = this.add.text(
    width / 2,
    height / 2,
    "NEON RUN\nСвайпай влево / вправо",
    { fontSize: "26px", color: "#fff", align: "center" }
  ).setOrigin(0.5);

  let swipeX = 0;

  this.input.on("pointerdown", p => {
    if (!started) {
      started = true;
      startText.destroy();
      return;
    }
    swipeX = p.x;
  });

  this.input.on("pointerup", p => {
    if (!started || gameOver) return;
    const dx = p.x - swipeX;
    if (Math.abs(dx) > 40) {
      moveLane(dx > 0 ? 1 : -1);
    }
  });
}

// ---------------- UPDATE ----------------
function update(_, delta) {
  if (!started || gameOver) return;

  const dt = delta / 16.6;

  fallSpeed += SPEED_GROW * dt * 0.02;
  spawnDelay = Math.max(SPAWN_MIN, spawnDelay - dt * 0.6);

  if (shieldActive) {
    shieldTimer -= delta;
    if (shieldTimer <= 0) {
      shieldActive = false;
      player.glow.setFillStyle(0xff2b8f, 0.25);
    }
  }

  spawnCooldown += delta;
  if (spawnCooldown >= spawnDelay) {
    spawnCooldown = 0;
    spawnItem(this);
  }

  for (let i = items.length - 1; i >= 0; i--) {
    const it = items[i];
    it.y += it.vy * dt;

    it.bg.setPosition(it.x, it.y);
    it.icon.setPosition(it.x, it.y);

    if (Math.abs(it.x - player.x) < 30 && Math.abs(it.y - player.y) < 30) {
      handleHit(this, it);
      destroyItem(it);
      items.splice(i, 1);
      continue;
    }

    if (it.y > this.scale.height + 80) {
      destroyItem(it);
      items.splice(i, 1);
    }
  }

  syncPlayer();
}

// ---------------- SPAWN ----------------
function spawnItem(scene) {
  const lane = Phaser.Math.Between(0, LANE_COUNT - 1);
  const x = lanes[lane];
  const y = -60;

  const r = Math.random();
  let acc = 0;
  let type = "poop";

  for (const k in PROBS) {
    acc += PROBS[k];
    if (r <= acc) {
      type = k;
      break;
    }
  }

  const map = {
    poop: { e: "💀", c: 0xff0033 },
    bomb: { e: "💣", c: 0xff2b8f },
    speed: { e: "⚡", c: 0xffe600 },
    life: { e: "❤️", c: 0xff4d6d }
  };

  const cfg = map[type];

  const bg = scene.add.circle(x, y, 26, cfg.c, 0.25);
  const icon = scene.add.text(x, y, cfg.e, { fontSize: "36px" }).setOrigin(0.5);

  items.push({
    x, y,
    type,
    vy: fallSpeed * 1.3,
    bg,
    icon
  });
}

// ---------------- HIT ----------------
function handleHit(scene, it) {
  if (it.type === "poop") {
    if (shieldActive) return;

    lives--;
    updateLives();
    if (lives <= 0) endGame(scene);
  }

  if (it.type === "bomb") {
    score++;
    scoreText.setText(`💣 ${score}`);
  }

  if (it.type === "speed") {
    fallSpeed *= 1.25;
  }

  if (it.type === "life") {
    lives = Math.min(5, lives + 1);
    updateLives();
    shieldActive = true;
    shieldTimer = 3000;
    player.glow.setFillStyle(0x00fff2, 0.35);
  }
}

// ---------------- HELPERS ----------------
function updateLives() {
  livesText.setText("❤️".repeat(lives));
}

function destroyItem(it) {
  it.bg.destroy();
  it.icon.destroy();
}

function moveLane(dir) {
  currentLane = Phaser.Math.Clamp(currentLane + dir, 0, LANE_COUNT - 1);
  player.x = lanes[currentLane];
}

function syncPlayer() {
  player.bg.setPosition(player.x, player.y);
  player.icon.setPosition(player.x, player.y);
  player.glow.setPosition(player.x, player.y);
}

// ---------------- ROAD ----------------
function drawRoad(scene) {
  const g = scene.add.graphics();
  const w = scene.scale.width;
  const h = scene.scale.height;

  g.fillStyle(0x120018, 0.85);
  g.fillRoundedRect(w * 0.1, -40, w * 0.8, h + 80, 30);

  const laneW = (w * 0.8) / LANE_COUNT;
  for (let i = 1; i < LANE_COUNT; i++) {
    for (let y = 0; y < h; y += 40) {
      g.fillStyle(0xff2b8f, 0.6);
      g.fillRect(w * 0.1 + laneW * i - 2, y, 4, 22);
    }
  }
}

// ---------------- GAME OVER ----------------
function endGame(scene) {
  gameOver = true;

  scene.add.text(
    scene.scale.width / 2,
    scene.scale.height / 2,
    `CRASH\n💣 ${score}`,
    { fontSize: "36px", color: "#fff", align: "center" }
  ).setOrigin(0.5);
}