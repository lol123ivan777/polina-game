// ---------------- SCENE FUNCTIONS ----------------
function preload() {}

function create() {
  const { width, height } = this.scale;

  this.lanes = [];
  this.items = [];
  this.currentLane = 1;

  this.score = 0;
  this.lives = 3;
  this.started = false;
  this.gameOver = false;

  this.fallSpeed = 6;
  this.spawnDelay = 520;
  this.spawnTimer = 0;

  const LANE_COUNT = 4;
  const laneWidth = width / LANE_COUNT;

  // ---- ROAD ----
  const g = this.add.graphics();
  g.fillStyle(0x120018, 1);
  g.fillRoundedRect(width * 0.08, -40, width * 0.84, height + 80, 30);

  for (let i = 0; i < LANE_COUNT; i++) {
    this.lanes.push(width * 0.08 + laneWidth * i + laneWidth / 2);

    if (i > 0) {
      for (let y = 0; y < height; y += 40) {
        g.fillStyle(0xff2b8f, 0.6);
        g.fillRect(width * 0.08 + laneWidth * i - 2, y, 4, 22);
      }
    }
  }

  // ---- UI ----
  this.scoreText = this.add.text(20, 16, "💣 0", { fontSize: "24px", color: "#fff" });
  this.livesText = this.add.text(20, 44, "❤️❤️❤️", { fontSize: "22px" });

  // ---- PLAYER ----
  const px = this.lanes[this.currentLane];
  const py = height - 130;

  this.playerGlow = this.add.circle(px, py, 34, 0xff2b8f, 0.25);
  this.playerBody = this.add.circle(px, py, 28, 0xffffff, 1);
  this.playerIcon = this.add.text(px, py, "🚗", { fontSize: "34px" }).setOrigin(0.5);

  this.tweens.add({
    targets: this.playerGlow,
    scale: 1.15,
    duration: 500,
    yoyo: true,
    repeat: -1
  });

  // ---- START TEXT ----
  this.startText = this.add.text(
    width / 2,
    height / 2,
    "NEON RUN\nСвайп влево / вправо",
    { fontSize: "26px", color: "#fff", align: "center" }
  ).setOrigin(0.5);

  // ---- INPUT ----
  let swipeX = 0;

  this.input.on("pointerdown", p => {
    if (!this.started) {
      this.started = true;
      this.startText.destroy();
      return;
    }
    swipeX = p.x;
  });

  this.input.on("pointerup", p => {
    if (!this.started || this.gameOver) return;
    const dx = p.x - swipeX;
    if (Math.abs(dx) > 40) {
      this.currentLane = Phaser.Math.Clamp(
        this.currentLane + (dx > 0 ? 1 : -1),
        0,
        LANE_COUNT - 1
      );
    }
  });
}

function update(_, delta) {
  if (!this.started || this.gameOver) return;

  const dt = delta / 16.6;

  this.fallSpeed += 0.01 * dt;
  this.spawnTimer += delta;

  if (this.spawnTimer > this.spawnDelay) {
    this.spawnTimer = 0;
    spawnItem(this);
  }

  this.playerBody.setPosition(this.lanes[this.currentLane], this.playerBody.y);
  this.playerIcon.setPosition(this.lanes[this.currentLane], this.playerBody.y);
  this.playerGlow.setPosition(this.lanes[this.currentLane], this.playerBody.y);

  for (let i = this.items.length - 1; i >= 0; i--) {
    const it = this.items[i];
    it.y += it.vy * dt;

    it.bg.setPosition(it.x, it.y);
    it.icon.setPosition(it.x, it.y);

    if (Math.abs(it.x - this.playerBody.x) < 30 && Math.abs(it.y - this.playerBody.y) < 30) {
      handleHit(this, it);
      destroyItem(it);
      this.items.splice(i, 1);
      continue;
    }

    if (it.y > this.scale.height + 80) {
      destroyItem(it);
      this.items.splice(i, 1);
    }
  }
}

// ---------------- SPAWN ----------------
function spawnItem(scene) {
  const lane = Phaser.Math.Between(0, 3);
  const x = scene.lanes[lane];
  const y = -60;

  const pool = [
    { t: "poop", e: "💀", c: 0xff0033 },
    { t: "bomb", e: "💣", c: 0xff2b8f },
    { t: "speed", e: "⚡", c: 0xffe600 },
    { t: "life", e: "❤️", c: 0xff4d6d }
  ];

  const pick = pool[Math.floor(Math.random() * pool.length)];

  const bg = scene.add.circle(x, y, 26, pick.c, 0.25);
  const icon = scene.add.text(x, y, pick.e, { fontSize: "36px" }).setOrigin(0.5);

  scene.items.push({
    x, y,
    type: pick.t,
    vy: scene.fallSpeed * 1.2,
    bg, icon
  });
}

// ---------------- HIT ----------------
function handleHit(scene, it) {
  if (it.type === "poop") {
    scene.lives--;
    scene.livesText.setText("❤️".repeat(scene.lives));
    if (scene.lives <= 0) scene.gameOver = true;
  }

  if (it.type === "bomb") {
    scene.score++;
    scene.scoreText.setText(`💣 ${scene.score}`);
  }

  if (it.type === "speed") {
    scene.fallSpeed *= 1.2;
  }

  if (it.type === "life") {
    scene.lives = Math.min(5, scene.lives + 1);
    scene.livesText.setText("❤️".repeat(scene.lives));
  }
}

function destroyItem(it) {
  it.bg.destroy();
  it.icon.destroy();
}

// ---------------- GAME INIT ----------------
const config = {
  type: Phaser.AUTO,
  width: window.innerWidth,
  height: window.innerHeight,
  backgroundColor: "rgba(0,0,0,0)",
  scene: { preload, create, update }
};

new Phaser.Game(config);