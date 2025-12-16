const config = {
  type: Phaser.AUTO,
  width: window.innerWidth,
  height: window.innerHeight,
  backgroundColor: "#777",
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

// ---------- STATE ----------
let player;
let items;
let lanes = [];
let currentLane = 1;
let score = 0;
let scoreText;
let gameOver = false;
let speed = 450;
let started = false;
let spawnTimer;
let startText;

const LANE_COUNT = 4;
const PLAYER_Y_OFFSET = 120;

// ---------- PRELOAD ----------
function preload() {}

// ---------- CREATE ----------
function create() {
  const { width, height } = this.scale;
  const laneWidth = width / LANE_COUNT;

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
  player = this.add.text(
    lanes[currentLane],
    height - PLAYER_Y_OFFSET,
    "🚗",
    { fontSize: "48px" }
  ).setOrigin(0.5);

  this.physics.add.existing(player);
  player.body.setImmovable(true);
  player.body.setAllowGravity(false);

  // --- ГРУППА ПРЕДМЕТОВ ---
  items = this.physics.add.group();

  // --- СЧЁТ ---
  scoreText = this.add.text(20, 20, "0", {
    fontSize: "28px",
    color: "#fff"
  });

  // --- START SCREEN ---
  startText = this.add.text(
    width / 2,
    height / 2,
    "🚦 ТАПНИ ЧТОБЫ НАЧАТЬ",
    {
      fontSize: "32px",
      color: "#fff",
      align: "center"
    }
  ).setOrigin(0.5);

  // --- COLLISION ---
  this.physics.add.overlap(player, items, onHit, null, this);

  // --- INPUT ---
  this.input.on("pointerdown", pointer => {
    if (!started) {
      startGame(this);
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
    if (item && item.y > window.innerHeight + 60) {
      item.destroy();
    }
  });
}

// ---------- START GAME ----------
function startGame(scene) {
  started = true;
  startText.destroy();

  spawnTimer = scene.time.addEvent({
    delay: 700,
    loop: true,
    callback: () => spawnItem(scene)
  });
}

// ---------- SPAWN ----------
function spawnItem(scene) {
  if (gameOver) return;

  const laneIndex = Phaser.Math.Between(0, LANE_COUNT - 1);
  const x = lanes[laneIndex];

  const isHeart = Math.random() < 0.5;
  const emoji = isHeart ? "❤️" : "💩";

  const item = scene.add.text(x, -40, emoji, {
    fontSize: "40px"
  }).setOrigin(0.5);

  scene.physics.add.existing(item);
  item.body.setSize(40, 40);
  item.body.setAllowGravity(false);
  item.body.setVelocityY(speed);

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
    {
      fontSize: "32px",
      color: "#fff",
      align: "center"
    }
  ).setOrigin(0.5);
}