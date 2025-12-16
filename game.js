const config = {
  type: Phaser.AUTO,
  width: window.innerWidth,
  height: window.innerHeight,
  backgroundColor: "#777",
  physics: {
    default: "arcade",
    arcade: {
      gravity: { y: 0 },
      debug: false
    }
  },
  scene: {
    preload,
    create,
    update
  }
};

new Phaser.Game(config);

// ---------- STATE ----------
let player;
let items;
let lanes = [];
let currentLane = 1;
let score = 0;
let scoreText;
let gameOver = false;
let started = false;
let spawnTimer;

const LANE_COUNT = 4;
const PLAYER_Y_OFFSET = 120;
const FALL_SPEED = 450;

// ---------- PRELOAD ----------
function preload() {
  createEmojiTexture(this, "heart", "❤️");
  createEmojiTexture(this, "poop", "💩");
  createEmojiTexture(this, "car", "🚗");
}

// ---------- CREATE ----------
function create() {
  const { width, height } = this.scale;
  const laneWidth = width / LANE_COUNT;

  lanes = [];
  score = 0;
  gameOver = false;
  started = false;

  // --- ДОРОГА ---
  for (let i = 0; i < LANE_COUNT; i++) {
    lanes.push(laneWidth * i + laneWidth / 2);

    if (i > 0) {
      this.add.rectangle(
        laneWidth * i,
        height / 2,
        6,
        height,
        0x8e44ad
      );
    }
  }

  // --- ИГРОК ---
  player = this.physics.add.sprite(
    lanes[currentLane],
    height - PLAYER_Y_OFFSET,
    "car"
  );
  player.setImmovable(true);
  player.body.allowGravity = false;

  // --- ITEMS ---
  items = this.physics.add.group();

  // --- SCORE ---
  scoreText = this.add.text(20, 20, "0", {
    fontSize: "28px",
    color: "#fff"
  });

  // --- START ---
  const startText = this.add.text(
    width / 2,
    height / 2,
    "🚦 ТАПНИ ЧТОБЫ НАЧАТЬ",
    { fontSize: "32px", color: "#fff" }
  ).setOrigin(0.5);

  // --- COLLISION ---
  this.physics.add.overlap(player, items, onHit, null, this);

  // --- INPUT ---
  this.input.on("pointerdown", pointer => {
    if (!started) {
      started = true;
      startText.destroy();
      spawnTimer = this.time.addEvent({
        delay: 600,
        loop: true,
        callback: () => spawnItem(this)
      });
      return;
    }

    if (gameOver) {
      this.scene.restart();
      return;
    }

    const lane = Math.floor(pointer.x / laneWidth);
    moveToLane(lane);
  });
}

// ---------- UPDATE ----------
function update() {
  if (!started || gameOver) return;

  items.children.iterate(item => {
    if (item && item.y > window.innerHeight + 80) {
      item.destroy();
    }
  });
}

// ---------- SPAWN ----------
function spawnItem(scene) {
  if (gameOver) return;

  const laneIndex = Phaser.Math.Between(0, LANE_COUNT - 1);
  const x = lanes[laneIndex];

  const isHeart = Math.random() < 0.5;
  const key = isHeart ? "heart" : "poop";

  const item = scene.physics.add.sprite(x, -60, key);
  item.setVelocityY(FALL_SPEED);
  item.body.allowGravity = false;
  item.isHeart = isHeart;

  items.add(item);
}

// ---------- COLLISION ----------
function onHit(player, item) {
  if (item.isHeart) {
    score += 1;
    scoreText.setText(score);
    item.destroy();
  } else {
    endGame(this);
  }
}

// ---------- MOVE ----------
function moveToLane(lane) {
  if (lane < 0 || lane >= LANE_COUNT) return;
  currentLane = lane;
  player.x = lanes[currentLane];
}

// ---------- GAME OVER ----------
function endGame(scene) {
  gameOver = true;
  spawnTimer?.remove();

  scene.add.text(
    scene.scale.width / 2,
    scene.scale.height / 2,
    "💥 ПРОИГРЫШ\n\nТапни чтобы заново",
    { fontSize: "32px", color: "#fff", align: "center" }
  ).setOrigin(0.5);
}

// ---------- EMOJI → TEXTURE ----------
function createEmojiTexture(scene, key, emoji) {
  const size = 64;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;

  const ctx = canvas.getContext("2d");
  ctx.font = "48px serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(emoji, size / 2, size / 2);

  scene.textures.addCanvas(key, canvas);
}