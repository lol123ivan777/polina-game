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

// ---------- STATE ----------
let player;
let items;
let lanes = [];
let currentLane = 1;

let score = 0;
let scoreText;

let gameOver = false;
let started = false;

let speed = 450;
let spawnEvent = null;

const LANE_COUNT = 4;
const PLAYER_Y_OFFSET = 120;

function preload() {}

function create() {
  // reset per scene start
  lanes = [];
  currentLane = 1;
  score = 0;
  gameOver = false;
  started = false;
  speed = 450;

  const { width, height } = this.scale;
  const laneWidth = width / LANE_COUNT;

  // road separators
  for (let i = 0; i < LANE_COUNT; i++) {
    lanes.push(laneWidth * i + laneWidth / 2);
    if (i > 0) {
      this.add.rectangle(laneWidth * i, height / 2, 6, height, 0x8e44ad);
    }
  }

  // UI
  scoreText = this.add.text(20, 20, "0", { fontSize: "28px", color: "#fff" });

  const startText = this.add.text(
    width / 2,
    height / 2,
    "Тапни, чтобы начать",
    { fontSize: "34px", color: "#fff", align: "center" }
  ).setOrigin(0.5);

  // player car
  player = this.add.text(lanes[currentLane], height - PLAYER_Y_OFFSET, "🚗", {
    fontSize: "48px"
  }).setOrigin(0.5);

  this.physics.add.existing(player);
  player.body.setImmovable(true);
  player.body.setAllowGravity(false);
  // фикс: у текста body бывает 0x0
  player.body.setSize(60, 60);

  // items group
  items = this.physics.add.group();

  // collisions
  this.physics.add.overlap(player, items, onHit, null, this);

  // input: start / move / restart
  this.input.on("pointerdown", (pointer) => {
    if (gameOver) {
      this.scene.restart();
      return;
    }

    if (!started) {
      started = true;
      startText.destroy();

      // 💥 гарантированный спавн (сохраняем event)
      spawnEvent = this.time.addEvent({
        delay: 650,
        loop: true,
        callback: () => spawnItem(this)
      });

      // мгновенно спавним 1 штуку для проверки
      spawnItem(this);
      return;
    }

    // move between lanes after start
    const lane = Math.floor(pointer.x / laneWidth);
    moveToLane(lane);
  });

  // debug tick: если видишь, значит update жив
  this._debugDot = this.add.circle(10, height - 10, 6, 0xffffff);
}

function update() {
  // debug animation
  if (this._debugDot) this._debugDot.alpha = this._debugDot.alpha === 1 ? 0.2 : 1;

  if (!started || gameOver) return;

  // cleanup
  items.children.iterate((item) => {
    if (item && item.y > window.innerHeight + 80) item.destroy();
  });
}

function spawnItem(scene) {
  if (!started || gameOver) return;

  const laneIndex = Phaser.Math.Between(0, LANE_COUNT - 1);
  const x = lanes[laneIndex];

  const isHeart = Math.random() < 0.5;
  const emoji = isHeart ? "❤️" : "💩";

  const item = scene.add.text(x, -40, emoji, { fontSize: "42px" }).setOrigin(0.5);

  scene.physics.add.existing(item);
  item.body.setAllowGravity(false);
  item.body.setVelocityY(speed);

  // важное: у текста физ.размер бывает нулевой
  item.body.setSize(50, 50);

  item.isHeart = isHeart;
  items.add(item);
}

function onHit(_player, item) {
  if (!item || gameOver) return;

  if (item.isHeart) {
    score += 1;
    scoreText.setText(String(score));
    item.destroy();

    // лёгкое ускорение за “успех”
    speed = Math.min(speed + 10, 900);
  } else {
    endGame(this);
  }
}

function moveToLane(lane) {
  if (lane < 0 || lane >= LANE_COUNT) return;
  currentLane = lane;
  player.x = lanes[currentLane];
}

function endGame(scene) {
  gameOver = true;

  if (spawnEvent) spawnEvent.remove(false);

  scene.add.text(
    scene.scale.width / 2,
    scene.scale.height / 2,
    "💥 ПРОИГРЫШ\n\nТапни, чтобы заново",
    { fontSize: "34px", color: "#fff", align: "center" }
  ).setOrigin(0.5);
}