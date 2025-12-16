const config = {
  type: Phaser.AUTO,
  width: window.innerWidth,
  height: window.innerHeight,
  backgroundColor: "#777",
  scene: { preload, create, update }
};

new Phaser.Game(config);

// ---------- STATE ----------
let player;
let items = [];
let lanes = [];
let currentLane = 1;
let score = 0;
let scoreText;
let started = false;
let gameOver = false;

let spawnTimer = 0;

const LANE_COUNT = 4;
const PLAYER_Y_OFFSET = 120;
const FALL_SPEED = 6;
const SPAWN_DELAY = 700;

// ---------- PRELOAD ----------
function preload() {}

// ---------- CREATE ----------
function create() {
  const { width, height } = this.scale;
  const laneWidth = width / LANE_COUNT;

  lanes = [];
  items = [];
  score = 0;
  started = false;
  gameOver = false;
  spawnTimer = 0;

  // ROAD
  for (let i = 0; i < LANE_COUNT; i++) {
    lanes.push(laneWidth * i + laneWidth / 2);
    if (i > 0) {
      this.add.rectangle(laneWidth * i, height / 2, 6, height, 0x8e44ad);
    }
  }

  // PLAYER
  player = this.add.text(
    lanes[currentLane],
    height - PLAYER_Y_OFFSET,
    "🚗",
    { fontSize: "48px" }
  ).setOrigin(0.5);

  // SCORE
  scoreText = this.add.text(20, 20, "0", {
    fontSize: "28px",
    color: "#fff"
  });

  // START TEXT
  const startText = this.add.text(
    width / 2,
    height / 2,
    "🚦 ТАПНИ ЧТОБЫ НАЧАТЬ",
    { fontSize: "32px", color: "#fff" }
  ).setOrigin(0.5);

  // INPUT
  this.input.on("pointerdown", pointer => {
    if (!started) {
      started = true;
      startText.destroy();
      return;
    }

    if (gameOver) {
      this.scene.restart();
      return;
    }

    const lane = Math.floor(pointer.x / laneWidth);
    if (lane >= 0 && lane < LANE_COUNT) {
      currentLane = lane;
      player.x = lanes[currentLane];
    }
  });
}

// ---------- UPDATE ----------
function update(time, delta) {
  if (!started || gameOver) return;

  // SPAWN
  spawnTimer += delta;
  if (spawnTimer >= SPAWN_DELAY) {
    spawnTimer = 0;
    spawnItem(this);
  }

  // MOVE ITEMS
  for (let i = items.length - 1; i >= 0; i--) {
    const item = items[i];
    item.y += FALL_SPEED;

    // COLLISION
    if (
      Math.abs(item.x - player.x) < 30 &&
      Math.abs(item.y - player.y) < 30
    ) {
      if (item.isHeart) {
        score++;
        scoreText.setText(score);
        item.destroy();
        items.splice(i, 1);
      } else {
        gameOver = true;
        this.add.text(
          this.scale.width / 2,
          this.scale.height / 2,
          "💥 ПРОИГРЫШ\n\nТапни чтобы заново",
          { fontSize: "32px", color: "#fff", align: "center" }
        ).setOrigin(0.5);
      }
    }

    // REMOVE OFFSCREEN
    if (item.y > window.innerHeight + 50) {
      item.destroy();
      items.splice(i, 1);
    }
  }
}

// ---------- SPAWN ----------
function spawnItem(scene) {
  const laneIndex = Phaser.Math.Between(0, LANE_COUNT - 1);
  const x = lanes[laneIndex];

  const isHeart = Math.random() < 0.5;
  const emoji = isHeart ? "❤️" : "💩";

  const item = scene.add.text(x, -40, emoji, {
    fontSize: "40px"
  }).setOrigin(0.5);

  item.isHeart = isHeart;
  items.push(item);
}