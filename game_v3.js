document.title = "PolinaBibi v4";
console.log("GAME.JS LOADED v4");

(() => {

  /* ================= CONFIG ================= */

  const CONFIG = {
    lanes: 4,
    levelDuration: 10000,
    donutDelay: 4000,

    levels: {
  1: { speed: 4.6, spawn: 850 },
  2: { speed: 6.2, spawn: 560 },
  3: { speed: 7.4, spawn: 520 },
  4: { speed: 8.6, spawn: 490 },
  5: { speed: 10.2, spawn: 470 },
  6: { speed: 4.0, spawn: 9999 } // финал: без спавна
}
  };

  const W = window.innerWidth;
  const H = window.innerHeight;

  let state;

  const scene = { preload, create, update };

  new Phaser.Game({
    type: Phaser.AUTO,
    width: W,
    height: H,
    parent: "game",
    backgroundColor: "#0d0014",
    scene
  });

  /* ================= PRELOAD ================= */

  function preload() {
    for (let i = 1; i <= 5; i++) {
      this.load.image(`bglvl${i}`, `assets/bg/bglvl${i}.jpg`);
    }
  }

  /* ================= CREATE ================= */

  function create() {

    state = {
      mode: "rules", // rules | play | transition | win | gameover
      level: 1,
      timer: 0,
      spawnTimer: 0,

      speed: CONFIG.levels[1].speed,
      spawnGap: CONFIG.levels[1].spawn,

      lanesX: [],
      lane: 1,

      items: [],
      score: 0,
      lives: 3,

      lifeUsed: false,
      shieldUsed: 0,
      shield: false
    };

    /* ---------- BG ---------- */

    this.bg = this.add.image(W/2, H/2, "bglvl1")
      .setDisplaySize(W, H);

    /* ---------- LANES ---------- */

    const roadWidth = Math.min(W * 0.65, 560);
    const laneW = roadWidth / CONFIG.lanes;
    const roadX = W / 2;

    for (let i = 0; i < CONFIG.lanes; i++) {
      state.lanesX.push(
        roadX - roadWidth/2 + laneW/2 + laneW * i
      );
    }

    /* ---------- PLAYER ---------- */

    state.player = this.add.text(
  state.lanesX[state.lane],
  H - 135,
  "🚗",
  {
    fontFamily: "Press Start 2P",
    fontSize: "96px"
  }
).setOrigin(0.5);

// небольшая тень, чтобы “вес” был
state.player.setShadow(0, 6, "#000", 10, true, true);

state.shieldAura = this.add.text(
  state.player.x,
  state.player.y,
  "🟦",
  { fontSize: "150px" }
).setOrigin(0.5).setAlpha(0);

state.shieldAura.setBlendMode(Phaser.BlendModes.ADD);

    /* ---------- UI ---------- */

    state.scoreText = this.add.text(16, 16, "0", {
      fontFamily: "Press Start 2P",
      fontSize: "14px",
      color: "#fff"
    });

    state.livesText = this.add.text(16, 40, "❤️❤️❤️", {
      fontFamily: "Press Start 2P",
      fontSize: "14px"
    });

    state.levelText = this.add.text(16, 64, "LVL 1", {
      fontFamily: "Press Start 2P",
      fontSize: "12px",
      color: "#aaa"
    });

    /* ---------- RULES ---------- */
    
    state.rulesBox = this.add.rectangle(W/2, H/2, W, H, 0x000000, 0.82);

state.rules = this.add.text(
  W/2, H/2,
  "ПРАВИЛА\n\n" +
  "🍒  +100     🍓  +200\n" +
  "💩  -100     💣  -200\n" +
  "💀  -1 жизнь (если нет щита)\n" +
  "❤️  +1 жизнь (1 раз за игру)\n" +
  "🛡  Щит 4 сек (2 раза за игру)\n\n" +
  "СВАЙП ← →  |  ТАП — СТАРТ",
  {
    fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, Arial",
    fontSize: "18px",
    align: "center",
    color: "#ffffff",
    lineSpacing: 10
  }
).setOrigin(0.5);

state.rules.setShadow(0, 2, "#000", 8, true, true);

    /* ---------- INPUT ---------- */

    let startX = 0;

    this.input.on("pointerdown", p => {

      if (state.mode === "rules") {
        state.mode = "play";
        state.rules.destroy();
        state.rulesBox.destroy();
        return;
      }

      if (state.mode === "gameover" || state.mode === "win") {
        this.scene.restart();
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

    // щит следует за машиной
state.shieldAura.x = state.player.x;
state.shieldAura.y = state.player.y;

if (state.shield) {
  state.shieldAura.setAlpha(0.35);
} else {
  state.shieldAura.setAlpha(0);
}

    state.timer += delta;
    state.spawnTimer += delta;

    if (state.level < 6 && state.timer >= CONFIG.levelDuration) {
      nextLevel(this);
    }

    if (state.spawnTimer >= state.spawnGap) {
      state.spawnTimer = 0;
      spawnItem(this);
    }

    for (let i = state.items.length - 1; i >= 0; i--) {
      const it = state.items[i];
      it.y += state.speed;

      if (
        Math.abs(it.y - state.player.y) < 28 &&
        it.lane === state.lane
      ) {
        handleHit(this, it);
        it.destroy();
        state.items.splice(i, 1);
        continue;
      }

      if (it.y > H + 80) {
        it.destroy();
        state.items.splice(i, 1);
      }
    }
  }

  /* ================= ITEMS ================= */

  function spawnItem(scene) {

    const lane = Phaser.Math.Between(0, CONFIG.lanes - 1);

    let emoji = "🍒";

    const r = Math.random();

    if (r < 0.12) emoji = "💀";
    else if (r < 0.25) emoji = "💣";
    else if (r < 0.4) emoji = "💩";
    else if (r < 0.6) emoji = "🍓";

    if (!state.lifeUsed && Math.random() < 0.04) emoji = "❤️";
    if (state.shieldUsed < 2 && Math.random() < 0.05) emoji = "🛡";

    const t = scene.add.text(
      state.lanesX[lane],
      -40,
      emoji,
      {
        fontFamily: "Press Start 2P",
        fontSize: "78px"
      }
    ).setOrigin(0.5);

    t.lane = lane;
    t.emoji = emoji;

    state.items.push(t);
  }

  /* ================= HIT ================= */

  function handleHit(scene, it) {

    const e = it.emoji;

    if (e === "🍒") state.score += 100;
    if (e === "🍓") state.score += 200;
    if (e === "💩") state.score -= 100;
    if (e === "💣") state.score -= 200;

    if (e === "💀" && !state.shield) {
      state.lives--;
    }

    if (e === "❤️" && !state.lifeUsed) {
      state.lifeUsed = true;
      state.lives++;
    }

    if (e === "🛡" && state.shieldUsed < 2) {
      state.shield = true;
      scene.tweens.add({
  targets: state.shieldAura,
  alpha: { from: 0.0, to: 0.45 },
  duration: 200,
  yoyo: true,
  repeat: 1
});

      state.shieldUsed++;
      scene.time.delayedCall(4000, () => state.shield = false);
    }

    if (state.lives <= 0) {
      gameOver(scene);
    }

    state.scoreText.setText(state.score);
    state.livesText.setText("❤️".repeat(state.lives));
  }

  /* ================= LEVEL ================= */

  function nextLevel(scene) {

    state.mode = "transition";
    state.level++;
    state.timer = 0;

    for (const it of state.items) it.destroy();
    state.items.length = 0;

    scene.cameras.main.fadeOut(400);

    scene.time.delayedCall(500, () => {

      if (state.level <= 5) {
        scene.bg.setTexture(`bglvl${state.level}`);
      }

      state.speed = CONFIG.levels[state.level].speed;
      state.spawnGap = CONFIG.levels[state.level].spawn;

      state.levelText.setText("LVL " + state.level);

      scene.cameras.main.fadeIn(400);

      state.mode = "play";

      if (state.level === 6) {
        scene.time.delayedCall(CONFIG.donutDelay, () => spawnDonut(scene));
      }
    });
  }

  /* ================= DONUT ================= */

  function spawnDonut(scene) {

    const donut = scene.add.text(
      W/2,
      -120,
      "🍩",
      {
        fontFamily: "Press Start 2P",
        fontSize: "120px"
      }
    ).setOrigin(0.5);

    scene.tweens.add({
      targets: donut,
      y: H/2,
      duration: 3000,
      ease: "Sine.easeOut",
      onComplete: () => win(scene)
    });
  }

  /* ================= END ================= */

  function gameOver(scene) {
    state.mode = "gameover";

    scene.add.text(
      W/2, H/2,
      "GAME OVER",
      {
        fontFamily: "Press Start 2P",
        fontSize: "130px",
        color: "#ff4d6d"
      }
    ).setOrigin(0.5);
  }

  function win(scene) {
    state.mode = "win";

    scene.add.text(
      W/2,
      H/2 + 140,
      "ПОЗДРАВЛЯЮ",
      {
        fontFamily: "Press Start 2P",
        fontSize: "22px",
        color: "#fff"
      }
    ).setOrigin(0.5);
  }

})();