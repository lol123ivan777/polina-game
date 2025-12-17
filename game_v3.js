document.title = "PolinaBibi v3";
console.log("GAME.JS FINAL BUILD v3");

(() => {

  const CONFIG = {
    lanes: 4,
    spawnBase: 520, // ↑ общая частота
    itemSize: 42,
    carSize: 52,

    levels: [
      { speed: 4.8, duration: 10000, bg: "bg1" },
      { speed: 5.8, duration: 10000, bg: "bg2" },
      { speed: 6.8, duration: 10000, bg: "bg3" },
      { speed: 7.8, duration: 10000, bg: "bg4" },
      { speed: 9.2, duration: 15000, bg: "bg5" },
      { speed: 0,   duration: 4000,  bg: "bg5" } // финал
    ]
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

  /* ================= PRELOAD ================= */

  function preload() {
    for (let i = 1; i <= 5; i++) {
      this.load.image(`bg${i}`, `assets/bg/bglvl${i}.jpg`);
    }

    this.load.image("rules", "assets/rules/rules.png");
    this.load.image("start", "assets/start/start.png");

    const items = [
      "cherry","strawberry","pineapple",
      "poop","bomb","skull",
      "eye","heart","donut"
    ];

    items.forEach(i =>
      this.load.image(i, `assets/items/${i}.png`)
    );
  }

  /* ================= CREATE ================= */

  function create() {
    sceneRef = this;

    state = {
      mode: "rules",
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

    // RULES SCREEN
    state.rulesScreen = this.add.image(W/2, H/2, "rules")
      .setDisplaySize(W, H)
      .setAlpha(1);

    // START SCREEN
    state.startScreen = this.add.image(W/2, H/2, "start")
      .setDisplaySize(W, H)
      .setAlpha(0);

    // BG (игровой)
    state.bg = this.add.image(W/2, H/2, "bg1")
      .setDisplaySize(W, H)
      .setAlpha(0);

    // INPUT
    this.input.on("pointerdown", () => {
      if (state.mode === "rules") {
        fade(state.rulesScreen, 0);
        fade(state.startScreen, 1);
        state.mode = "start";
        return;
      }

      if (state.mode === "start") {
        fade(state.startScreen, 0);
        fade(state.bg, 1);
        initGame(this);
        state.mode = "play";
      }
    });
  }

  /* ================= INIT GAME ================= */

  function initGame(scene) {

    const roadWidth = Math.min(W * 0.65, 520);
    const laneW = roadWidth / CONFIG.lanes;
    const cx = W / 2;

    for (let i = 0; i < CONFIG.lanes; i++) {
      state.lanesX.push(cx - roadWidth / 2 + laneW / 2 + laneW * i);
    }

    state.player = scene.add.text(
      state.lanesX[state.lane],
      H - 120,
      "🚗",
      { fontSize: `${CONFIG.carSize}px` }
    ).setOrigin(0.5);

    state.scoreText = scene.add.text(16, 16, "0", {
      fontSize: "22px",
      color: "#fff"
    });

    state.livesText = scene.add.text(16, 44, "❤️❤️❤️", {
      fontSize: "20px"
    });

    state.levelText = scene.add.text(16, 70, "LVL 1", {
      fontSize: "14px",
      color: "#aaa"
    });

    let startX = 0;

    scene.input.on("pointerdown", p => startX = p.x);
    scene.input.on("pointerup", p => {
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

    if (state.spawnTimer > CONFIG.spawnBase && state.level < 5) {
      state.spawnTimer = 0;
      spawnItem(sceneRef);
    }

    for (let i = state.items.length - 1; i >= 0; i--) {
      const it = state.items[i];
      it.y += state.speed;

      if (Math.abs(it.y - state.player.y) < 55 && it.lane === state.lane) {
        handleItem(it);
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
    const weighted = [
      "cherry","cherry","cherry",
      "strawberry","strawberry","strawberry",
      "pineapple","pineapple",
      "poop","poop",
      "bomb",
      "skull"
    ];

    if (state.shieldUsed < 2 && Math.random() < 0.12) weighted.push("eye");
    if (Math.random() < 0.06) weighted.push("heart");

    let type;
    do {
      type = Phaser.Utils.Array.GetRandom(weighted);
    } while (type === state.lastItem && Math.random() < 0.6);

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

  function handleItem(item) {
    switch (item.type) {
      case "cherry": state.score += 100; break;
      case "strawberry": state.score += 200; break;
      case "pineapple": state.score += 300; break;
      case "poop": damage(1); break;
      case "bomb": damage(2); break;
      case "skull": damage(3); break;
      case "heart":
        if (state.lives < 4) state.lives++;
        state.livesText.setText("❤️".repeat(state.lives));
        return;
      case "eye": activateShield(); return;
    }
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

  /* ================= LEVEL FLOW ================= */

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
      scene.add.text(W/2, H/2 + 160, "ПОЗДРАВЛЯЮ 🎉", {
        fontSize: "28px",
        color: "#fff"
      }).setOrigin(0.5);
    });
  }

  function endGame() {
    state.mode = "finish";
    sceneRef.add.text(W/2, H/2, "ИГРА ОКОНЧЕНА", {
      fontSize: "26px",
      color: "#ff4d6d"
    }).setOrigin(0.5);
  }

  function fade(target, alpha) {
    sceneRef.tweens.add({
      targets: target,
      alpha,
      duration: 600
    });
  }

})();