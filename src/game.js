import { CFG } from "./config.js";
import { createPlayer, setPlayerX, setPlayerY, setShield } from "./player.js";
import { createUI, setLives, setScore, showStartOverlay, showGameOver } from "./ui.js";
import { pickWeighted, spawnItem, moveItem, destroyItem, hitFX } from "./items.js";
import { flash, haptic } from "./effects.js";
import { getHiScore, setHiScore } from "./storage.js";

function preload() {}

function create() {
  const { width, height } = this.scale;

  // state
  this.started = false;
  this.gameOver = false;

  this.score = 0;
  this.lives = CFG.lives.start;

  this.fallSpeed = CFG.fall.base;
  this.spawnDelay = CFG.spawn.baseDelayMs;
  this.spawnCooldown = 0;

  this.shieldMs = 0;

  // lanes
  this.laneWidth = width / CFG.lanes;
  this.lanes = Array.from({ length: CFG.lanes }, (_, i) => this.laneWidth * i + this.laneWidth / 2);
  this.currentLane = 1;

  // road
  drawRoad(this);

  // ui
  this.ui = createUI(this);
  setScore(this.ui, this.score);
  setLives(this.ui, this.lives);

  // player
  const px = this.lanes[this.currentLane];
  const py = height - CFG.playerYOffset;
  this.player = createPlayer(this, px, py);

  // overlays
  this.startOverlay = showStartOverlay(this);

  // items list
  this.items = [];

  // input (tap start + swipe)
  this._swipeStartX = 0;

  this.input.on("pointerdown", (p) => {
    if (!this.started && !this.gameOver) {
      this.started = true;
      this.startOverlay.destroy();
      return;
    }
    if (this.gameOver) {
      this.scene.restart();
      return;
    }
    this._swipeStartX = p.x;
  });

  this.input.on("pointerup", (p) => {
    if (!this.started || this.gameOver) return;
    const dx = p.x - this._swipeStartX;
    if (Math.abs(dx) < CFG.swipe.thresholdPx) return;

    const dir = dx > 0 ? 1 : -1;
    this.currentLane = Phaser.Math.Clamp(this.currentLane + dir, 0, CFG.lanes - 1);
    setPlayerX(this.player, this.lanes[this.currentLane]);
  });

  // resize safety
  this.scale.on("resize", () => {
    const w = this.scale.width;
    const h = this.scale.height;
    this.laneWidth = w / CFG.lanes;
    this.lanes = Array.from({ length: CFG.lanes }, (_, i) => this.laneWidth * i + this.laneWidth / 2);
    setPlayerX(this.player, this.lanes[this.currentLane]);
    setPlayerY(this.player, h - CFG.playerYOffset);
  });
}

function update(_, delta) {
  if (!this.started || this.gameOver) return;

  const dt = delta / 16.6667;

  // buffs
  if (this.shieldMs > 0) {
    this.shieldMs -= delta;
    if (this.shieldMs <= 0) setShield(this.player, false);
  }

  // difficulty ramp
  this.fallSpeed += (CFG.fall.growPerSec / 60) * dt;
  this.spawnDelay = Math.max(CFG.spawn.minDelayMs, this.spawnDelay - (CFG.spawn.accelPerSec / 60) * dt);

  // spawn
  this.spawnCooldown += delta;
  while (this.spawnCooldown >= this.spawnDelay) {
    this.spawnCooldown -= this.spawnDelay;

    const laneIndex = Phaser.Math.Between(0, CFG.lanes - 1);
    const x = this.lanes[laneIndex];
    const type = pickWeighted(CFG.dropTable);

    const it = spawnItem(this, x, type, CFG.items, this.fallSpeed * 1.25);
    this.items.push(it);

    if (Math.random() < 0.20) {
      const lane2 = Phaser.Math.Between(0, CFG.lanes - 1);
      const x2 = this.lanes[lane2];
      const type2 = pickWeighted(CFG.dropTable);
      this.items.push(spawnItem(this, x2, type2, CFG.items, this.fallSpeed * 1.25));
    }
  }

  // move + collide
  for (let i = this.items.length - 1; i >= 0; i--) {
    const it = this.items[i];
    moveItem(it, dt);

    // collide
    if (Math.abs(it.x - this.player.x) < 34 && Math.abs(it.y - this.player.y) < 34) {
      hitFX(this, it);
      handleHit.call(this, it);
      destroyItem(it);
      this.items.splice(i, 1);
      continue;
    }

    // cleanup
    if (it.y > this.scale.height + 80) {
      destroyItem(it);
      this.items.splice(i, 1);
    }
  }
}

function handleHit(it) {
  if (it.type === "bomb") {
    this.score += 1;
    setScore(this.ui, this.score);
    haptic("light");
    return;
  }

  if (it.type === "speed") {
    this.fallSpeed *= 1.22;
    haptic("medium");
    return;
  }

  if (it.type === "life") {
    this.lives = Math.min(CFG.lives.max, this.lives + 1);
    setLives(this.ui, this.lives);
    this.shieldMs = 2500;
    setShield(this.player, true);
    haptic("success");
    return;
  }

  // poop = damage (если щит, игнор)
  if (this.shieldMs > 0) return;

  this.lives -= 1;
  setLives(this.ui, this.lives);
  flash(this, 0xff0033, 0.22, 120);
  haptic("heavy");

  if (this.lives <= 0) endGame.call(this);
}

function endGame() {
  this.gameOver = true;

  const hi = getHiScore();
  if (this.score > hi) setHiScore(this.score);

  showGameOver(this, this.score);
  haptic("error");
}

function drawRoad(scene) {
  const g = scene.add.graphics();
  const w = scene.scale.width;
  const h = scene.scale.height;

  const roadX = w * 0.5;
  const roadW = Math.min(w - 30, 560);
  const roadH = h + 60;

  g.fillStyle(0x151525, 0.9);
  g.fillRoundedRect(roadX - roadW / 2, -30, roadW, roadH, 22);

  // pink/red neon edges
  g.fillStyle(0xff2b8f, 0.16);
  g.fillRoundedRect(roadX - roadW / 2 - 6, -30, 8, roadH, 18);
  g.fillStyle(0xff0033, 0.10);
  g.fillRoundedRect(roadX + roadW / 2 - 2, -30, 8, roadH, 18);

  // lane dashes
  const laneW = roadW / CFG.lanes;
  for (let i = 1; i < CFG.lanes; i++) {
    const lx = roadX - roadW / 2 + laneW * i;
    for (let y = -10; y < h + 40; y += 44) {
      g.fillStyle(0xff2b8f, 0.6);
      g.fillRoundedRect(lx - 2, y, 4, 22, 2);
      g.fillStyle(0xff2b8f, 0.18);
      g.fillRoundedRect(lx - 4, y - 2, 8, 26, 3);
    }
  }
}

const config = {
  type: Phaser.AUTO,
  width: window.innerWidth,
  height: window.innerHeight,
  backgroundColor: "rgba(0,0,0,0)",
  scene: { preload, create, update },
};

new Phaser.Game(config);