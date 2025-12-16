const config = {
  type: Phaser.AUTO,
  width: window.innerWidth,
  height: window.innerHeight,
  backgroundColor: "rgba(0,0,0,0)", // фон берём из CSS (неоновый)
  scene: { preload, create, update }
};

new Phaser.Game(config);

// ----------------- SETTINGS -----------------
const LANE_COUNT = 4;
const PLAYER_Y_OFFSET = 130;

const SWIPE_THRESHOLD = 35; // px
const ITEM_FONT = 44;       // размер эмодзи предметов
const PLAYER_FONT = 38;

// стартовые значения, которые будут “разгоняться”
const FALL_SPEED_START = 6.0;           // px per frame-ish (мы будем масштабировать delta)
const FALL_SPEED_GROW_PER_SEC = 0.9;    // рост скорости (примерно) в секунду
const SPAWN_DELAY_START = 520;          // ms
const SPAWN_DELAY_MIN = 240;            // ms
const SPAWN_ACCEL_PER_SEC = 35;         // насколько уменьшаем задержку в сек

// вероятности
const P_STAR = 0.72; // 🌟
const P_SKULL = 0.28; // 💀

// ----------------- STATE -----------------
let lanes = [];
let laneWidth = 0;
let currentLane = 1;

let score = 0;
let scoreText;
let hiText;

let started = false;
let gameOver = false;

let fallSpeed = FALL_SPEED_START;
let spawnDelay = SPAWN_DELAY_START;
let spawnCooldown = 0;

let player; // { x, y, bg, icon, glow }
let items = []; // { x, y, type, bg, icon, vy }

let startOverlay;
let overOverlay;
let roadGfx;

let swipe = { active: false, startX: 0, startY: 0 };

// ----------------- PRELOAD -----------------
function preload() {}

// ----------------- CREATE -----------------
function create() {
  const { width, height } = this.scale;

  // reset
  lanes = [];
  items = [];
  currentLane = 1;

  score = 0;
  started = false;
  gameOver = false;

  fallSpeed = FALL_SPEED_START;
  spawnDelay = SPAWN_DELAY_START;
  spawnCooldown = 0;

  laneWidth = width / LANE_COUNT;

  // вычисляем центры полос
  for (let i = 0; i < LANE_COUNT; i++) {
    lanes.push(laneWidth * i + laneWidth / 2);
  }

  // дорога и неон
  roadGfx = this.add.graphics();
  drawRoad(this, roadGfx);

  // UI
  scoreText = this.add.text(20, 18, "🌟 0", {
    fontSize: "26px",
    color: "#ffffff"
  });

  const hi = Number(localStorage.getItem("polina_hi") || "0");
  hiText = this.add.text(20, 48, `🏁 ${hi}`, {
    fontSize: "18px",
    color: "rgba(255,255,255,0.8)"
  });

  // игрок (мульт-неон чип)
  const px = lanes[currentLane];
  const py = height - PLAYER_Y_OFFSET;

  const glow = this.add.circle(px, py, 34, 0x00e5ff, 0.25);
  const bg = this.add.circle(px, py, 28, 0xffffff, 0.90);
  const icon = this.add.text(px, py, "🚗", { fontSize: `${PLAYER_FONT}px` }).setOrigin(0.5);

  // лёгкая “пружинка” для мульт-эффекта
  this.tweens.add({
    targets: glow,
    scale: 1.12,
    duration: 500,
    yoyo: true,
    repeat: -1
  });

  player = { x: px, y: py, glow, bg, icon };

  // стартовый оверлей
  startOverlay = this.add.container(width / 2, height / 2);

  const panelGlow = this.add.rectangle(0, 0, Math.min(340, width - 40), 180, 0xff00ff, 0.18);
  const panel = this.add.rectangle(0, 0, Math.min(320, width - 50), 160, 0x0b0b14, 0.75);
  panel.setStrokeStyle(3, 0x00e5ff, 0.9);

  const t1 = this.add.text(0, -38, "NEON CAR RUN", {
    fontSize: "26px",
    color: "#ffffff"
  }).setOrigin(0.5);

  const t2 = this.add.text(0, 6, "Свайп влево/вправо\n🌟 = +1\n💀 = конец", {
    fontSize: "16px",
    color: "rgba(255,255,255,0.9)",
    align: "center"
  }).setOrigin(0.5);

  const t3 = this.add.text(0, 58, "Тапни, чтобы начать", {
    fontSize: "16px",
    color: "#00e5ff"
  }).setOrigin(0.5);

  startOverlay.add([panelGlow, panel, t1, t2, t3]);

  // INPUT (свайпы)
  this.input.on("pointerdown", (p) => {
    if (!started && !gameOver) {
      started = true;
      startOverlay.destroy();
      return;
    }

    if (gameOver) {
      this.scene.restart();
      return;
    }

    swipe.active = true;
    swipe.startX = p.x;
    swipe.startY = p.y;
  });

  this.input.on("pointerup", (p) => {
    if (!started || gameOver) return;
    if (!swipe.active) return;

    const dx = p.x - swipe.startX;
    const dy = p.y - swipe.startY;

    swipe.active = false;

    // свайп только если горизонталь доминирует
    if (Math.abs(dx) > SWIPE_THRESHOLD && Math.abs(dx) > Math.abs(dy)) {
      if (dx > 0) moveLane(this, +1);
      else moveLane(this, -1);
    }
  });

  // если экран ресайзится (Telegram любит это), перерисуем дорогу
  this.scale.on("resize", () => {
    // обновим параметры
    const w = this.scale.width;
    const h = this.scale.height;
    laneWidth = w / LANE_COUNT;
    lanes = [];
    for (let i = 0; i < LANE_COUNT; i++) lanes.push(laneWidth * i + laneWidth / 2);

    // передвинем игрока в центр своей полосы
    player.x = lanes[currentLane];
    player.y = h - PLAYER_Y_OFFSET;
    syncPlayer();

    roadGfx.clear();
    drawRoad(this, roadGfx);
  });
}

// ----------------- UPDATE -----------------
function update(time, delta) {
  if (!started || gameOver) return;

  // delta в ms, нормализуем под ~60fps
  const dt = delta / 16.6667;

  // разгон со временем
  fallSpeed += (FALL_SPEED_GROW_PER_SEC / 60) * dt; // плавно
  spawnDelay = Math.max(
    SPAWN_DELAY_MIN,
    spawnDelay - (SPAWN_ACCEL_PER_SEC / 60) * dt
  );

  // спавн “больше предметов”
  spawnCooldown += delta;
  while (spawnCooldown >= spawnDelay) {
    spawnCooldown -= spawnDelay;

    // иногда двойной спавн (мульт-дичь сверху)
    spawnOne(this);
    if (Math.random() < 0.25) spawnOne(this);
  }

  // движение предметов
  for (let i = items.length - 1; i >= 0; i--) {
    const it = items[i];
    it.y += it.vy * dt;

    it.bg.x = it.x;
    it.bg.y = it.y;
    it.icon.x = it.x;
    it.icon.y = it.y;

    // коллизия (простая, но надёжная)
    if (
      Math.abs(it.x - player.x) < 34 &&
      Math.abs(it.y - player.y) < 34
    ) {
      if (it.type === "star") {
        score += 1;
        scoreText.setText(`🌟 ${score}`);

        // маленький неоновый “поп”
        this.tweens.add({
          targets: [it.bg, it.icon],
          scale: 1.25,
          duration: 140,
          yoyo: true
        });

        destroyItem(it);
        items.splice(i, 1);
        continue;
      } else if (it.type === "skull") {
        endGame(this);
        return;
      }
    }

    // очистка снизу
    if (it.y > this.scale.height + 80) {
      destroyItem(it);
      items.splice(i, 1);
    }
  }

  // синхроним игрока (на всякий)
  syncPlayer();
}

// ----------------- SPAWN -----------------
function spawnOne(scene) {
  const laneIndex = Phaser.Math.Between(0, LANE_COUNT - 1);
  const x = lanes[laneIndex];
  const y = -60;

  const r = Math.random();
  const type = r < P_STAR ? "star" : "skull";
  const emoji = type === "star" ? "🌟" : "💀";

  // мульт-неон оболочка
  const glowColor = type === "star" ? 0xfff400 : 0xff00ff;
  const bgColor = type === "star" ? 0x0b0b14 : 0x0b0b14;

  const bgGlow = scene.add.circle(x, y, 30, glowColor, 0.22);
  const bg = scene.add.circle(x, y, 24, bgColor, 0.85);
  bg.setStrokeStyle(2, glowColor, 0.9);

  const icon = scene.add.text(x, y, emoji, { fontSize: `${ITEM_FONT}px` }).setOrigin(0.5);

  // пульс
  scene.tweens.add({
    targets: bgGlow,
    scale: 1.18,
    duration: 420,
    yoyo: true,
    repeat: -1
  });

  const it = {
    x, y,
    type,
    bg: bg,
    icon: icon,
    glow: bgGlow,
    vy: fallSpeed * 1.35 // чуть быстрее, чтобы “падало заметно”
  };

  items.push(it);
}

function destroyItem(it) {
  it.bg?.destroy();
  it.icon?.destroy();
  it.glow?.destroy();
}

// ----------------- MOVE -----------------
function moveLane(scene, dir) {
  const next = Phaser.Math.Clamp(currentLane + dir, 0, LANE_COUNT - 1);
  if (next === currentLane) return;

  currentLane = next;
  const targetX = lanes[currentLane];

  // мультяшный “переезд”
  scene.tweens.add({
    targets: [player.bg, player.icon, player.glow],
    x: targetX,
    duration: 140,
    ease: "Sine.easeOut"
  });

  player.x = targetX;
}

function syncPlayer() {
  player.bg.x = player.x;
  player.bg.y = player.y;

  player.icon.x = player.x;
  player.icon.y = player.y;

  player.glow.x = player.x;
  player.glow.y = player.y;
}

// ----------------- ROAD DRAW -----------------
function drawRoad(scene, gfx) {
  const w = scene.scale.width;
  const h = scene.scale.height;

  // основа дороги
  const roadX = w * 0.5;
  const roadW = Math.min(w - 30, 560);
  const roadH = h + 60;

  // тёмная дорожка
  gfx.fillStyle(0x151525, 0.85);
  gfx.fillRoundedRect(roadX - roadW / 2, -30, roadW, roadH, 22);

  // неоновые края
  gfx.fillStyle(0x00e5ff, 0.12);
  gfx.fillRoundedRect(roadX - roadW / 2 - 6, -30, 8, roadH, 18);
  gfx.fillRoundedRect(roadX + roadW / 2 - 2, -30, 8, roadH, 18);

  // полосы (пунктир неон фиолетовый)
  const laneW = roadW / LANE_COUNT;
  for (let i = 1; i < LANE_COUNT; i++) {
    const lx = roadX - roadW / 2 + laneW * i;

    for (let y = -10; y < h + 40; y += 44) {
      gfx.fillStyle(0xb300ff, 0.55);
      gfx.fillRoundedRect(lx - 2, y, 4, 22, 2);

      gfx.fillStyle(0xb300ff, 0.18);
      gfx.fillRoundedRect(lx - 4, y - 2, 8, 26, 3);
    }
  }

  // лёгкие “блики” по дороге
  for (let k = 0; k < 12; k++) {
    const rx = Phaser.Math.Between(roadX - roadW / 2 + 20, roadX + roadW / 2 - 20);
    const ry = Phaser.Math.Between(0, h);
    gfx.fillStyle(0xffffff, 0.03);
    gfx.fillCircle(rx, ry, Phaser.Math.Between(10, 22));
  }
}

// ----------------- END GAME -----------------
function endGame(scene) {
  gameOver = true;

  // рекорд
  const hi = Number(localStorage.getItem("polina_hi") || "0");
  if (score > hi) localStorage.setItem("polina_hi", String(score));

  overOverlay?.destroy();

  const w = scene.scale.width;
  const h = scene.scale.height;

  overOverlay = scene.add.container(w / 2, h / 2);

  const panelGlow = scene.add.rectangle(0, 0, Math.min(360, w - 40), 170, 0xff00ff, 0.20);
  const panel = scene.add.rectangle(0, 0, Math.min(340, w - 50), 150, 0x0b0b14, 0.80);
  panel.setStrokeStyle(3, 0xff00ff, 0.9);

  const t1 = scene.add.text(0, -30, "💀 CRASH", { fontSize: "30px", color: "#ffffff" }).setOrigin(0.5);
  const t2 = scene.add.text(0, 10, `🌟 Счёт: ${score}`, { fontSize: "18px", color: "#00e5ff" }).setOrigin(0.5);
  const t3 = scene.add.text(0, 52, "Тапни, чтобы заново", { fontSize: "16px", color: "rgba(255,255,255,0.9)" }).setOrigin(0.5);

  overOverlay.add([panelGlow, panel, t1, t2, t3]);
}