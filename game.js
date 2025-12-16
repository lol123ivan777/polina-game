const tg = window.Telegram?.WebApp;
tg?.ready();
tg?.expand();

const config = {
  type: Phaser.AUTO,
  width: window.innerWidth,
  height: window.innerHeight,
  backgroundColor: "#777",
  physics: {
    default: "arcade",
    arcade: { debug: false }
  },
  scene: { preload, create, update }
};

new Phaser.Game(config);

// ---------- CONST ----------
const LANE_COUNT = 4;
const PLAYER_Y_OFFSET = 120;

// ---------- STATE ----------
let lanes = [];
let currentLane = 1;

let playerBody;
let playerVisual;

let items;
let score = 0;
let scoreText;

let started = false;
let gameOver = false;
let speed = 450;
let spawnEvent = null;

// ---------- PRELOAD ----------
function preload() {}

// ---------- CREATE ----------
function create() {
  lanes = [];
  currentLane = 1;
  score = 0;
  started = false;
  gameOver = false;
  speed = 450;

  const { width, height } = this.scale;
  const laneWidth = width / LANE_COUNT;

  // Полосы
  for (let i = 0; i < LANE_COUNT; i++) {
    lanes.push(laneWidth * i + laneWidth / 2);
    if (i > 0) {
      this.add.rectangle(laneWidth * i, height / 2, 6, height, 0x8e44ad);
    }
  }

  // UI
  scoreText = this.add.text(20, 20, "0", {
    fontSize: "28px",
    color: "#fff"
  });

  // Игрок (физика)
  playerBody = this.add.rectangle(
    lanes[currentLane],
    height - PLAYER_Y_OFFSET,
    60,
    60,
    0x000000,
    0
  );
  this.physics.add.existing(playerBody);
  playerBody.body.setImmovable(true);
  playerBody.body.setAllowGravity(false);

  // Игрок (визуал)
  playerVisual = this.add.text(
    lanes[currentLane],
    height - PLAYER_Y_OFFSET,
    "🚗",
    { fontSize: "48px" }
  ).setOrigin(0.5);

  // Объекты
  items = this.physics.add.group();

  // Коллизии
  this.physics.add.overlap(playerBody, items, onHit, null, this);

  // Telegram-кнопка старта
  if (tg) {
    tg.MainButton.setText("▶️ Начать игру");
    tg.MainButton.show();

    tg.MainButton.onClick(() => {
      if (started) return;
      started = true;

      spawnEvent = this.time.addEvent({
        delay: 700,
        loop: true,
        callback: () => spawnItem(this)
      });

      spawnItem(this);
      tg.MainButton.hide();
    });
  }

  // Управление полосами
  this.input.on("pointerdown", pointer => {
    if (!started || gameOver) return;
    const lane = Math.floor(pointer.x / laneWidth);
    if (lane >= 0 && lane < LANE_COUNT) {
      currentLane = lane;
      playerBody.x = lanes[currentLane];
    }
  });
}

// ---------- UPDATE ----------
function update() {
  if (!started || gameOver) return;

  playerVisual.x = playerBody.x;
  playerVisual.y = playerBody.y;

  items.children.iterate(item => {
    if (!item) return;

    if (item.visual) {
      item.visual.x = item.x;
      item.visual.y = item.y;
    }

    if (item.y > window.innerHeight + 80) {
      if (item.visual) item.visual.destroy();
      item.destroy();
    }
  });
}

// ---------- SPAWN ----------
function spawnItem(scene) {
  if (!started || gameOver) return;

  const laneIndex = Phaser.Math.Between(0, LANE_COUNT - 1);
  const x = lanes[laneIndex];

  const isHeart = Math.random() < 0.5;
  const emoji = isHeart ? "❤️" : "💩";

  const body = scene.add.rectangle(x, -40, 44, 44, 0x000000, 0);
  scene.physics.add.existing(body);
  body.body.setAllowGravity(false);
  body.body.setVelocityY(speed);

  const visual = scene.add.text(x, -40, emoji, {
    fontSize: "42px"
  }).setOrigin(0.5);

  body.isHeart = isHeart;
  body.visual = visual;

  items.add(body);
}

// ---------- HIT ----------
function onHit(_player, item) {
  if (!item || gameOver) return;

  if (item.isHeart) {
    score++;
    scoreText.setText(String(score));
    if (item.visual) item.visual.destroy();
    item.destroy();
  } else {
    endGame(this);
  }
}

// ---------- GAME OVER ----------
function endGame(scene) {
  gameOver = true;
  if (spawnEvent) spawnEvent.remove(false);

  scene.add.text(
    scene.scale.width / 2,
    scene.scale.height / 2,
    "💥 ПРОИГРЫШ\n\nЗакрой и запусти снова",
    {
      fontSize: "34px",
      color: "#fff",
      align: "center"
    }
  ).setOrigin(0.5);
}