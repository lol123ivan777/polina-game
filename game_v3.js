document.title = "PolinaBibi v3";
console.log("GAME.JS CLEAN FINAL v3");

(() => {

  const CONFIG = {
    lanes: 4,
    itemSize: 46,
    carSize: 52,
    spawnDelay: 520,

    levels: [
      { speed: 4.8, duration: 10000, bg: "bg1" },
      { speed: 6.0, duration: 10000, bg: "bg2" },
      { speed: 7.2, duration: 10000, bg: "bg3" },
      { speed: 8.6, duration: 10000, bg: "bg4" },
      { speed: 10.5, duration: 15000, bg: "bg5" },
      { speed: 0,   duration: 4000,  bg: "bg5" } // финал
    ]
  };

  const W = window.innerWidth;
  const H = window.innerHeight;

  let state;
  let sceneRef;

  new Phaser.Game({
    type: Phaser.AUTO,
    width: W,
    height: H,
    parent: "game",
    backgroundColor: "#000",
    scene: { preload, create, update }
  });

  /* ================= PRELOAD ================= */

  function preload() {
    for (let i = 1; i <= 5; i++) {
      this.load.image(`bg${i}`, `assets/bg/bglvl${i}.jpg`);
    }

    const items = [
      "cherry","strawberry","pineapple",
      "poop","bomb","skull",
      "eye","donut"
    ];

    items.forEach(k => {
      this.load.image(k, `assets/items/${k}.png`);
    });
  }

  /* ================= CREATE ================= */

  function create() {
    sceneRef = this;

    state = {
      mode: "idle",
      lane: 1,
      lanesX: [],
      items: [],
      level: 0,
      levelTime: 0,
      spawnTimer: 0,
      speed: CONFIG.levels[0].speed,
      score: 0,
      lives: 3,
      shield: false,
      shieldUsed: 0,
      lastItem: null
    };

    // BG
    state.bg = this.add.image(W/2, H/2, "bg1")
      .setDisplaySize(W, H)
      .setAlpha(0);

    this.tweens.add({ targets: state.bg, alpha: 1, duration: 600 });

    // Lanes
    const roadWidth = Math.min(W * 0.65, 520);
    const laneW = roadWidth / CONFIG.lanes;
    const cx = W / 2;

    for (let i = 0; i < CONFIG.lanes; i++) {
      state.lanesX.push(cx - roadWidth/2 + laneW/2 + laneW * i);
    }

    // Player
    state.player = this.add.text(
      state.lanesX[state.lane],
      H - 120,
      "🚗",
      { fontSize: `${CONFIG.carSize}px` }
    ).setOrigin(0.5);

    // UI
    state.scoreText = this.add.text(16, 16, "0", { fontSize: "22px", color: "#fff" });
    state.livesText = this.add.text(16, 44, "❤️❤️❤️", { fontSize: "20px" });
    state.levelText = this.add.text(16, 70, "LVL 1", { fontSize: "14px", color: "#aaa" });

    // Rules
    const rules = this.add.text(
      W/2, H/2,
      "ПРАВИЛА\n\n" +
      "🍒 +100\n🍓 +200\n🍍 +300\n\n" +
      "💩 -100\n💣 -200\n☠️ -300\n\n" +
      "🧿 ЩИТ 4 сек\n\nТАП — СТАРТ",
      { fontSize: "20px", color: "#fff", align: "center" }
    ).setOrigin(0.5);

    let startX = 0;

    this.input.on("pointerdown", p => {
      if (state.mode === "idle") {
        state.mode = "play";
        rules.destroy();
        return;
      }
      startX = p.x;
    });

    this.input.on("pointerup", p => {
      if (state.mode !== "play") return;
      const dx = p.x - startX;
      if (Math.abs(dx) < 40) return;

      state.lane = Phaser.Math.Clamp(
        state.lane + (dx > 0 ? 1 : -1),
        0,
        CONFIG.lanes - 1
      );

      state.player.x = state.lanesX[state.lane];
    });
  }

  /* ================= UPDATE ================= */

  function update(_, delta) {
    if (state.mode !== "play") return;

    state.levelTime += delta;
    state.spawnTimer += delta;

    if (state.spawnTimer > CONFIG.spawnDelay && state.level < 5) {
      state.spawnTimer = 0;
      spawnItem(sceneRef);
    }

    for (let i = state.items.length - 1; i >= 0; i--) {
      const it = state.items[i];
      it.y += state.speed;

      if (Math.abs(it.y - state.player.y) < 48 && it.lane === state.lane) {
        applyItem(it);
        it.destroy();
        state.items.splice(i, 1);
        continue;
      }

      if (it.y > H + 80) {
        it.destroy();
        state.items.splice(i, 1);
      }
    }

    if (state.levelTime > CONFIG.levels[state.level].duration) {
      nextLevel(sceneRef);
    }
  }

  /* ================= ITEMS ================= */

  function spawnItem(scene) {
    const pool = [
      "cherry","cherry","cherry",
      "strawberry","strawberry",
      "pineapple",
      "poop","poop",
      "bomb",
      "skull"
    ];

    if (state.shieldUsed < 2 && Math.random() < 0.15) {
      pool.push("eye");
    }

    let type;
    let guard = 0;

    do {
      type = Phaser.Utils.Array.GetRandom(pool);
      guard++;
      if (guard > 10) return;
    } while (type === state.lastItem && Math.random() < 0.7);

    if (!scene.textures.exists(type)) return;

    state.lastItem = type;

    const lane = Phaser.Math.Between(0, CONFIG.lanes - 1);

    const item = scene.add.image(
      state.lanesX[lane],
      -60,
      type
    ).setDisplaySize(CONFIG.itemSize, CONFIG.itemSize);

    item.type = type;
    item.lane = lane;

    state.items.push(item);
  }

  function applyItem(item) {
    if (item.type === "eye") return activateShield();

    const map = {
      cherry: 100,
      strawberry: 200,
      pineapple: 300,
      poop: -100,
      bomb: -200,
      skull: -300
    };

    state.score += map[item.type] || 0;
    state.scoreText.setText(state.score);

    if (map[item.type] < 0) damage(Math.abs(map[item.type]) / 100);
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

  /* ================= LEVELS ================= */

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
      duration: 300,
      onComplete: () => {
        state.bg.setTexture(cfg.bg);
        scene.tweens.add({ targets: state.bg, alpha: 1, duration: 500 });
      }
    });

    if (state.level === 5) {
      scene.time.delayedCall(4000, () => showDonut(scene));
    }
  }

  function showDonut(scene) {
    state.mode = "finish";

    const donut = scene.add.image(W/2, -200, "donut")
      .setDisplaySize(220, 220);

    scene.tweens.add({
      targets: donut,
      y: H/2,
      duration: 2800,
      ease: "Sine.easeOut"
    });

    scene.time.delayedCall(3200, () => {
      scene.add.text(
        W/2,
        H/2 + 160,
        "ПОЗДРАВЛЯЮ 🎉",
        { fontSize: "28px", color: "#fff" }
      ).setOrigin(0.5);
    });
  }

  function endGame() {
    state.mode = "finish";
    sceneRef.add.text(
      W/2,
      H/2,
      "ИГРА ОКОНЧЕНА",
      { fontSize: "26px", color: "#ff4d6d" }
    ).setOrigin(0.5);
  }

})();