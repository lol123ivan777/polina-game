const config = {
  type: Phaser.AUTO,
  width: window.innerWidth,
  height: window.innerHeight,
  backgroundColor: "#777", // серая дорога
  physics: {
    default: "arcade",
    arcade: { debug: false }
  },
  scene: {
    preload,
    create,
    update
  }
};

new Phaser.Game(config);

let player;
let items;
let lanes = [];
let currentLane = 1; // 0..3
let score = 0;
let scoreText;
let gameOver = false;
let speed = 450;

const LANE_COUNT = 4;
const PLAYER_Y_OFFSET = 120;

function preload() {}

function create() {
  const { width, height } = this.scale;

  // --- ЛОГИКА ПОЛОС ---
  const laneWidth = width / LANE_COUNT;

  for (let i = 0; i < LANE_COUNT; i++) {
    lanes.push(laneWidth * i + laneWidth / 2);

    if (i > 0) {
      // фиолетовые линии
      this.add.rectangle(
        laneWidth * i,
        height / 2,
        6,
        height,
        0x8e44ad
      );
    }
  }

  // --- МАШИНКА (ЭМОДЗИ) ---
  player = this.add.text(
    lanes[currentLane],
    height - PLAYER_Y_OFFSET,
    "🚗",
    { fontSize: "48px" }
  ).setOrigin(0.5);

  this.physics.add.existing(player);
  player.body.setImmovable(true);
  player.body.setAllowGravity(false);

  // --- ПАДАЮЩИЕ ОБЪЕКТЫ ---
  items = this.physics.add.group();

  this.time.addEvent({
    delay: 900,
    loop: true,
    callback: () => spawnItem(this)
  });

  // --- СТОЛКНОВЕНИЯ ---
  this.physics.add.overlap(player, items, onHit, null, this);

  // --- СЧЁТ ---
  scoreText = this.add.text(20, 20, "0", {
    fontSize: "28px",
    color: "#fff"
  });

  // --- УПРАВЛЕНИЕ ---
  this.input.on("pointerdown", pointer => {
    if (gameOver) {
      restart(this);
      return;
    }

    const lane = Math.floor(pointer.x / laneWidth);
    moveToLane(lane);
  });
}

function update() {
  if (gameOver) return;

  items.children.iterate(item => {
    if (item && item.y > window.innerHeight + 50) {
      item.destroy();
    }
  });
}

// ---------- СПАВН ----------

function spawnItem(scene) {
  const laneIndex = Phaser.Math.Between(0, LANE_COUNT - 1);
  const x = lanes[laneIndex];

  const isHeart = Math.random() < 0.5;
  const emoji = isHeart ? "❤️" : "💩";

  const item = scene.add.text(x, -50, emoji, {
    fontSize: "40px"
  }).setOrigin(0.5);

  scene.physics.add.existing(item);

  // 🔴 ВОТ ЭТО КЛЮЧ
  item.body.setSize(40, 40);
  item.body.setAllowGravity(false);
  item.body.setVelocityY(speed);

  item.isHeart = isHeart;
  items.add(item);
}

// ---------- СТОЛКНОВЕНИЕ ----------
function onHit(player, item) {
  if (item.isHeart) {
    score += 1;
    scoreText.setText(score);
    item.destroy();
  } else {
    endGame(this);
  }
}

// ---------- ДВИЖЕНИЕ ----------
function moveToLane(lane) {
  if (lane < 0 || lane >= LANE_COUNT) return;
  currentLane = lane;
  player.x = lanes[currentLane];
}

// ---------- GAME OVER ----------
function endGame(scene) {
  gameOver = true;

  scene.add.text(
    scene.scale.width / 2,
    scene.scale.height / 2,
    "💥 ПРОИГРЫШ\n\nТапни, чтобы начать заново",
    {
      fontSize: "32px",
      color: "#fff",
      align: "center"
    }
  ).setOrigin(0.5);
}

// ---------- RESTART ----------
function restart(scene) {
  gameOver = false;
  score = 0;
  speed = 350;
  scene.scene.restart();
}