document.title = "PolinaBibi v3";
console.log("GAME.JS CLEAN FINAL v3");

(() => {

  const CONFIG = {
    lanes: 4,
    itemSize: 42,
    carSize: 52,

    spawnBase: 480, // чаще, чем было

    levels: [
      { speed: 4.5, duration: 10000, bg: "bg1" },
      { speed: 5.5, duration: 10000, bg: "bg2" },
      { speed: 6.6, duration: 10000, bg: "bg3" },
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

    // items
    this.load.image("cherry", "assets/items/cherry.png");
    this.load.image("strawberry", "assets/items/strawberry.png");
    this.load.image("pineapple", "assets/items/pineapple.png");

    this.load.image("poop", "assets/items/poop.png");
    this.load.image("bomb", "assets/items/bomb.png");
    this.load.image("skull", "assets/items/skull.png");

    this.load.image("eye", "assets/items/eye.png");
    this.load.image("heart", "assets/items/heart.png");
    this.load.image("donut", "assets/items/donut.png");
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

    // background
    state.bg = this.add.image(W/2, H/2, "bg1")
      .setDisplaySize(W, H)
      .setAlpha(0);

    this.tweens.add({ targets: state.bg, alpha: 1, duration: 800 });

    // lanes
    const roadWidth = Math.min(W * 0.65, 520);
    const laneW = roadWidth / CONFIG.lanes;
    const cx = W / 2;

    for (let i = 0; i < CONFIG.lanes; i++) {
      state.lanesX.push(cx - roadWidth/2 + laneW/2 + laneW * i);
    }

    // player
    state.player = this.add.text(
      state.lanesX[state.lane],
      H - 130,
      "🚗",
      { fontSize: `${CONFIG.carSize}px` }
    ).setOrigin(0.5);

    // UI
    state.scoreText = this.add.text(16, 16, "0", {
      fontSize: "22px",
      color: "#fff",
      fontFamily: "Arial"
    });

    state.livesText = this.add.text(16, 44, "❤️❤️❤️", {
      fontSize: "20px"
    });

    state.levelText = this.add.text(16, 70, "LVL 1", {
      fontSize: "14px",
      color: "#aaa"
    });

    // rules screen
    const rules = this.add.text(
      W/2,
      H/2,
      "ПРАВИЛА\n\n" +
      "🍒 +100\n🍓 +200\n🍍 +300\n\n" +
      "💩 -100\n💣 -200\n☠️ -300\n\n" +
      "🧿 ЩИТ (4 сек)\n❤️ +1 ЖИЗНЬ (1 раз)\n\nТАП — СТАРТ",
      {
        fontSize: "20px",
        color: "#fff",
        align: "center"
      }
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

    const spawnDelay =
      CONFIG.spawnBase -
      state.level * 40; // чаще с каждым уровнем

    if (state.spawnTimer > spawnDelay && state.level < 5) {
      state.spawnTimer = 0;
      spawnItem(sceneRef);
    }

    for (let i = state.items.length - 1; i >= 0; i--) {
      const it = state.items[i];
      it.y += state.speed;

      if (
        Math.abs(it.y - state.player.y) < 55 &&
        it.lane === state.lane
      ) {
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
      // плюсы (чаще)
      "cherry","cherry","cherry",
      "strawberry","strawberry","strawberry",
      "pineapple","pineapple",

      // минусы
      "poop","poop",
      "bomb",
      "skull"
    ];

    if (state.shieldUsed < 2 && Math.random() < 0.12) {
      weighted.push("eye");
    }

    if (state.lives < 3 && Math.random() < 0.05) {
      weighted.push("heart");
    }

    let type;
    do {
      type = Phaser.Utils.Array.GetRandom(weighted);
    } while (type === state.lastItem && Math.random() < 0.7);

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
    if (item.type === "eye") return activateShield();
    if (item.type === "heart") return gainLife();

    if (item.type === "cherry") state.score += 100;
    if (item.type === "strawberry") state.score += 200;
    if (item.type === "pineapple") state.score += 300;

    if (item.type === "poop") damage(1);
    if (item.type === "bomb") damage(2);
    if (item.type === "skull") damage(3);

    state.scoreText.setText(state.score);
  }

  function damage(d) {
    if (state.shield) return;
    state.lives -= d;
    if (state.lives < 0) state.lives = 0;
    state.livesText.setText("❤️".repeat(state.lives));
    if (state.lives <= 0) endGame();
  }

  function gainLife() {
    if (state.lives < 4) {
      state.lives++;
      state.livesText.setText("❤️".repeat(state.lives));
    }
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

  /* ================= FINISH ================= */

  function showDonut(scene) {
    state.mode = "finish";

    const donut = scene.add.image(
      W / 2,
      -200,
      "donut"
    ).setDisplaySize(220, 220);

    scene.tweens.add({
      targets: donut,
      y: H / 2,
      duration: 2800,
      ease: "Sine.easeOut"
    });

    scene.time.delayedCall(3200, () => {
      scene.add.text(
        W / 2,
        H / 2 + 160,
        "ПОЗДРАВЛЯЮ 🎉",
        { fontSize: "28px", color: "#fff" }
      ).setOrigin(0.5);
    });
  }

  function endGame() {
    state.mode = "finish";
    sceneRef.add.text(
      W / 2,
      H / 2,
      "ИГРА ОКОНЧЕНА",
      { fontSize: "26px", color: "#ff4d6d" }
    ).setOrigin(0.5);
  }

})();