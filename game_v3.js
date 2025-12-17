document.title = "PolinaBibi v3";
console.log("GAME.JS LOADED v3");

(() => {

  const CONFIG = {
    lanes: 3,
    baseSpeed: 4,
    baseSpawnGap: 900,
    levelUpScore: 8, // сколько очков на уровень
    maxLevel: 5
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

  // ---------- PRELOAD ----------
  function preload() {
    for (let i = 1; i <= CONFIG.maxLevel; i++) {
      this.load.image(`bglvl${i}`, `assets/bg/bglvl${i}.jpg`);
    }
  }

  // ---------- CREATE ----------
  function create() {

    state = {
      mode: "idle", // idle | play | gameover
      lane: 1,
      lanesX: [],
      items: [],
      timer: 0,
      score: 0,
      level: 1,
      speed: CONFIG.baseSpeed,
      spawnGap: CONFIG.baseSpawnGap,
      bg: null
    };

    // фон
    state.bg = this.add.image(W / 2, H / 2, "bglvl1")
      .setDisplaySize(W, H);

    // полосы движения (логические)
    const roadWidth = W * 0.6;
    const laneW = roadWidth / CONFIG.lanes;
    const roadX = W / 2;

    for (let i = 0; i < CONFIG.lanes; i++) {
      state.lanesX.push(
        roadX - roadWidth / 2 + laneW / 2 + laneW * i
      );
    }

    // игрок
    state.player = this.add.text(
      state.lanesX[state.lane],
      H - 120,
      "🚗",
      { fontSize: "42px" }
    ).setOrigin(0.5);

    // UI
    state.scoreText = this.add.text(16, 16, "0", {
      fontSize: "20px",
      color: "#fff"
    });

    state.levelText = this.add.text(16, 40, "lvl 1", {
      fontSize: "14px",
      color: "#aaa"
    });

    const hint = this.add.text(
      W / 2, H / 2,
      "ТАП — СТАРТ\nСВАЙП ← →",
      { fontSize: "18px", color: "#fff", align: "center" }
    ).setOrigin(0.5);

    let startX = 0;

    this.input.on("pointerdown", p => {
      if (state.mode === "idle") {
        state.mode = "play";
        hint.destroy();
        return;
      }

      if (state.mode === "gameover") {
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

  // ---------- UPDATE ----------
  function update(_, delta) {
    if (state.mode !== "play") return;

    state.timer += delta;

    if (state.timer > state.spawnGap) {
      state.timer = 0;
      spawnGap(this);
    }

    for (let i = state.items.length - 1; i >= 0; i--) {
      const it = state.items[i];
      it.y += it.speed;

      if (
        Math.abs(it.y - state.player.y) < 32 &&
        it.lane === state.lane
      ) {
        gameOver(this);
        return;
      }

      if (it.y > H + 80) {
        it.destroy();
        state.items.splice(i, 1);
        state.score++;
        state.scoreText.setText(state.score);

        checkLevelUp(this);
      }
    }
  }

  // ---------- GAP ----------
  function spawnGap(scene) {
    const lane = Phaser.Math.Between(0, CONFIG.lanes - 1);

    const gap = scene.add.rectangle(
      state.lanesX[lane],
      -60,
      70,
      70,
      0x000000
    );

    gap.lane = lane;
    gap.speed = state.speed;

    state.items.push(gap);
  }

  // ---------- LEVEL UP ----------
  function checkLevelUp(scene) {
    const newLevel =
      Math.floor(state.score / CONFIG.levelUpScore) + 1;

    if (newLevel > state.level && newLevel <= CONFIG.maxLevel) {
      state.level = newLevel;
      state.levelText.setText(`lvl ${state.level}`);

      // смена фона
      state.bg.setTexture(`bglvl${state.level}`);

      // усложнение
      state.speed += 0.8;
      state.spawnGap = Math.max(400, state.spawnGap - 100);
    }
  }

  // ---------- GAME OVER ----------
  function gameOver(scene) {
    if (state.mode === "gameover") return;

    state.mode = "gameover";

    scene.add.text(
      W / 2,
      H / 2,
      "GAME OVER\nобрыв дороги\n\nТАП — ЗАНОВО",
      {
        fontSize: "22px",
        color: "#ff4d6d",
        align: "center"
      }
    ).setOrigin(0.5);
  }

})();