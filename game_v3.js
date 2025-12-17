document.title = "PolinaBibi v3";
console.log("GAME.JS CLEAN BUILD v3");

(() => {

  const CONFIG = {
    lanes: 4,
    spawnBase: 900,
    itemSize: 80,
    carSize: 56,

    levels: [
      { speed: 3.2, duration: 10000, bg: "bg1" },
      { speed: 3.8, duration: 10000, bg: "bg2" },
      { speed: 4.4, duration: 10000, bg: "bg3" },
      { speed: 4.9, duration: 10000, bg: "bg4" },
      { speed: 6.2, duration: 15000, bg: "bg5" },
      { speed: 0,   duration: 4000,  bg: "bg5" } // финальный с пончиком
    ],
  };

  const W = window.innerWidth;
  const H = window.innerHeight;

  let state;
  let sceneRef;

  const scene = { preload, create, update };

  new Phaser.Game({
    type: Phaser.AUTO,
    width: W,
    height: H,
    parent: "game",
    backgroundColor: "#000",
    scene
  });

  /* ---------- PRELOAD ---------- */
  function preload() {
    for (let i = 1; i <= 5; i++) {
      this.load.image(`bg${i}`, `assets/bg/bglvl${i}.jpg`);
    }
    this.load.image("car", "assets/car.png");

    // предметы
    this.load.image("cherry", "assets/items/cherry.png");
    this.load.image("strawberry", "assets/items/strawberry.png");
    this.load.image("plus300", "assets/items/plus300.png");
    this.load.image("poop", "assets/items/poop.png");
    this.load.image("bomb", "assets/items/bomb.png");
    this.load.image("minus300", "assets/items/minus300.png");
    this.load.image("shield", "assets/items/shield.png");
    this.load.image("donut", "assets/items/donut.png");
  }

  /* ---------- CREATE ---------- */
  function create() {
    sceneRef = this;

    state = {
      mode: "idle",
      lane: 1,
      lanesX: [],
      items: [],
      timer: 0,
      levelTime: 0,
      level: 0,
      speed: CONFIG.levels[0].speed,
      score: 0,
      lives: 3,
      shield: false,
      shieldUsed: 0,
      spawnTimer: 0
    };

    // фон
    state.bg = this.add.image(W / 2, H / 2, "bg1").setDisplaySize(W, H).setAlpha(0);
    this.tweens.add({ targets: state.bg, alpha: 1, duration: 800 });

    // полосы
    const roadWidth = Math.min(W * 0.65, 520);
    const laneW = roadWidth / CONFIG.lanes;
    const roadX = W / 2;

    for (let i = 0; i < CONFIG.lanes; i++) {
      state.lanesX.push(roadX - roadWidth / 2 + laneW / 2 + laneW * i);
    }

    // машинка
    state.player = this.add.text(state.lanesX[state.lane], H - 140, "🚗", { fontSize: "52px" }).setOrigin(0.5);

    // интерфейс
    state.scoreText = this.add.text(16, 16, "0", { fontFamily: "Arial", fontSize: "22px", color: "#fff" });
    state.livesText = this.add.text(16, 44, "❤️❤️❤️", { fontSize: "20px" });
    state.levelText = this.add.text(16, 70, "LVL 1", { fontSize: "14px", color: "#aaa" });

    const hint = this.add.text(W / 2, H / 2, "ТАП — СТАРТ\nСВАЙП ← →", {
      fontSize: "20px", color: "#fff", align: "center"
    }).setOrigin(0.5);

    let startX = 0;

    this.input.on("pointerdown", p => {
      if (state.mode === "idle") {
        state.mode = "play";
        hint.destroy();
        return;
      }
      startX = p.x;
    });

    this.input.on("pointerup", p => {
      if (state.mode !== "play") return;
      const dx = p.x - startX;
      if (Math.abs(dx) < 40) return;
      state.lane = Phaser.Math.Clamp(state.lane + (dx > 0 ? 1 : -1), 0, CONFIG.lanes - 1);
      state.player.x = state.lanesX[state.lane];
    });
  }

  /* ---------- UPDATE ---------- */
  function update(_, delta) {
    if (state.mode !== "play") return;

    state.levelTime += delta;
    state.spawnTimer += delta;
    const levelCfg = CONFIG.levels[state.level];

    // предметы
    const spawnDelay = CONFIG.spawnBase / 1.5;
    if (state.spawnTimer > spawnDelay && state.level < 5) {
      state.spawnTimer = 0;
      spawnItem(sceneRef);
    }

    for (let i = state.items.length - 1; i >= 0; i--) {
      const it = state.items[i];
      it.y += state.speed;

      if (Math.abs(it.y - state.player.y) < 60 && it.lane === state.lane) {
        handleItem(it);
        it.destroy();
        state.items.splice(i, 1);
        continue;
      }

      if (it.y > H + 100) {
        it.destroy();
        state.items.splice(i, 1);
      }
    }

    if (state.levelTime > levelCfg.duration) nextLevel(sceneRef);
  }

  /* ---------- ITEM LOGIC ---------- */
  function spawnItem(scene) {
    const pool = ["cherry", "strawberry", "plus300", "poop", "bomb", "minus300"];
    if (state.shieldUsed < 2 && Math.random() < 0.1) pool.push("shield");

    const type = Phaser.Utils.Array.GetRandom(pool);
    const lane = Phaser.Math.Between(0, CONFIG.lanes - 1);
    const item = scene.add.image(state.lanesX[lane], -100, type).setDisplaySize(CONFIG.itemSize, CONFIG.itemSize);

    item.type = type;
    item.lane = lane;
    state.items.push(item);
  }

  function handleItem(item) {
    if (item.type === "shield") return activateShield();

    if (item.type === "cherry") state.score += 100;
    if (item.type === "strawberry") state.score += 200;
    if (item.type === "plus300") state.score += 300;
    if (item.type === "poop") damage(1);
    if (item.type === "bomb") damage(2);
    if (item.type === "minus300") damage(3);

    state.scoreText.setText(state.score);
  }

  function damage(d) {
    if (state.shield) return;
    state.lives -= d;
    if (state.lives < 0) state.lives = 0;
    state.livesText.setText("❤️".repeat(state.lives));
    if (state.lives <= 0) endGame();
  }

  function activateShield() {
    if (state.shieldUsed >= 2) return;
    state.shield = true;
    state.shieldUsed++;
    state.player.setTint(0x00ffff);
    sceneRef.time.delayedCall(4000, () => {
      state.shield = false;
      state.player.clearTint();
    });
  }

  /* ---------- LEVEL FLOW ---------- */
  function nextLevel(scene) {
    state.level++;
    if (state.level >= CONFIG.levels.length) return;

    state.levelTime = 0;
    state.spawnTimer = 0;
    state.items.forEach(i => i.destroy());
    state.items = [];

    const cfg = CONFIG.levels[state.level];
    state.speed = cfg.speed;
    state.levelText.setText(`LVL ${state.level + 1}`);

    scene.tweens.add({
      targets: state.bg,
      alpha: 0,
      duration: 400,
      onComplete: () => {
        state.bg.setTexture(cfg.bg);
        scene.tweens.add({ targets: state.bg, alpha: 1, duration: 600 });
      }
    });

    if (state.level === 5) {
      scene.time.delayedCall(4000, () => showDonut(scene));
    }
  }

  /* ---------- FINISH ---------- */
  function showDonut(scene) {
    state.mode = "finish";
    const donut = scene.add.image(W / 2, -200, "donut").setDisplaySize(220, 220);
    scene.tweens.add({ targets: donut, y: H / 2, duration: 3000, ease: "Sine.easeOut" });
    scene.time.delayedCall(3500, () => {
      scene.add.text(W / 2, H / 2 + 160, "ПОЗДРАВЛЯЮ 🎉", { fontSize: "28px", color: "#fff" }).setOrigin(0.5);
    });
  }

  function endGame() {
    state.mode = "finish";
    sceneRef.add.text(W / 2, H / 2, "ИГРА ОКОНЧЕНА", { fontSize: "26px", color: "#ff4d6d" }).setOrigin(0.5);
  }

})();