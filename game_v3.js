document.title = "PolinaBibi v3";
console.log("GAME.JS LOADED v3");

(() => {

  const CONFIG = {
    lanes: 3,
    speed: 5,
    spawnGap: 900,
    colors: {
      bg: 0x0d0014
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

  // ---------- PRELOAD ----------
  function preload() {
    this.load.image("bg", "assets/bg/bg1.png");
    this.load.image("road", "assets/road/road1.png");
    this.load.image("borderL", "assets/border/border_left.png");
    this.load.image("borderR", "assets/border/border_right.png");
  }

  // ---------- CREATE ----------
  function create() {

    state = {
      mode: "idle", // idle | play | gameover
      lane: 1,
      lanesX: [],
      items: [],
      timer: 0,
      score: 0
    };

    // BACKGROUND FILL (убирает шахматку)
    this.add.rectangle(W/2, H/2, W, H, CONFIG.colors.bg);

    // BG IMAGE
    this.add.image(W/2, H/2, "bg")
      .setDisplaySize(W, H);

    // ROAD
    const road = this.add.image(W/2, H/2, "road");
    road.setDisplaySize(Math.min(W * 0.6, 520), H + 200);

    // BORDERS
    this.add.image(
      road.x - road.displayWidth/2 - 20,
      H/2,
      "borderL"
    ).setDisplaySize(40, H + 200);

    this.add.image(
      road.x + road.displayWidth/2 + 20,
      H/2,
      "borderR"
    ).setDisplaySize(40, H + 200);

    // LANES
    const laneW = road.displayWidth / CONFIG.lanes;
    for (let i = 0; i < CONFIG.lanes; i++) {
      state.lanesX.push(
        road.x - road.displayWidth/2 + laneW/2 + laneW * i
      );
    }

    // PLAYER
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
      W/2, H/2,
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

    if (state.timer > CONFIG.spawnGap) {
      state.timer = 0;
      spawnGap(this);
    }

    for (let i = state.items.length - 1; i >= 0; i--) {
      const it = state.items[i];
      it.y += it.speed;

      if (
        Math.abs(it.y - state.player.y) < 30 &&
        it.lane === state.lane
      ) {
        gameOver(this);
      }

      if (it.y > H + 80) {
        it.destroy();
        state.items.splice(i, 1);
        state.score++;
        state.scoreText.setText(state.score);
      }
    }
  }

  // ---------- GAP ----------
  function spawnGap(scene) {
    const lane = Phaser.Math.Between(0, CONFIG.lanes - 1);

    const gap = scene.add.rectangle(
      state.lanesX[lane],
      -60,
      60,
      60,
      0x000000
    );

    gap.lane = lane;
    gap.speed = CONFIG.speed;

    state.items.push(gap);
  }

  // ---------- GAME OVER ----------
  function gameOver(scene) {
    if (state.mode === "gameover") return;

    state.mode = "gameover";

    scene.add.text(
      W/2,
      H/2,
      "GAME OVER\nобрыв дороги\n\nТАП — ЗАНОВО",
      {
        fontSize: "22px",
        color: "#ff4d6d",
        align: "center"
      }
    ).setOrigin(0.5);
  }

})();