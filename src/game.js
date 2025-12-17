(() => {
  const W = window.innerWidth;
  const H = window.innerHeight;

  const CONFIG = {
    lanes: 4,
    colors: { bg: "#0d0014", road: 0x16001f, neon: 0xff2b8f },
  };

  let state;

  const scene = { preload, create, update };

  new Phaser.Game({
    type: Phaser.AUTO,
    parent: "game",
    width: W,
    height: H,
    backgroundColor: CONFIG.colors.bg,
    scene,
  });

  function preload() {}

  function create() {
    state = {
      started: false,
      lane: 1,
      lanesX: [],
      items: [],
      spawnTimer: 0,
      score: 0,
      player: null,
      ui: null,
    };

    const laneW = W / CONFIG.lanes;
    for (let i = 0; i < CONFIG.lanes; i++) state.lanesX.push(laneW * i + laneW / 2);

    // road
    this.road = this.add.rectangle(
      W / 2,
      H / 2,
      Math.min(W - 40, 520),
      H + 100,
      CONFIG.colors.road
    );

    // side neon borders (чтобы хоть “вау” было сразу)
    this.leftNeon = this.add.rectangle(6, H / 2, 6, H + 200, CONFIG.colors.neon, 0.6);
    this.rightNeon = this.add.rectangle(W - 6, H / 2, 6, H + 200, CONFIG.colors.neon, 0.6);

    // player
    const py = H - 120;
    state.player = this.add.text(state.lanesX[state.lane], py, "🚗", { fontSize: "42px" }).setOrigin(0.5);
    state.playerGlow = this.add.text(state.player.x, state.player.y, "🚗", {
      fontSize: "42px",
      color: "#ff2b8f",
    }).setOrigin(0.5).setAlpha(0.28);

    // UI
    state.ui = {
      score: this.add.text(16, 16, "0", { fontSize: "24px", color: "#fff" }),
      hint: this.add.text(W / 2, H / 2, "ТАП — СТАРТ\nСВАЙП ← →", {
        fontSize: "18px",
        color: "#fff",
        align: "center",
      }).setOrigin(0.5),
    };

    // input
    let sx = 0;
    this.input.on("pointerdown", (p) => {
      if (!state.started) {
        state.started = true;
        state.ui.hint.destroy();
        return;
      }
      sx = p.x;
    });

    this.input.on("pointerup", (p) => {
      if (!state.started) return;
      const dx = p.x - sx;
      if (Math.abs(dx) < 40) return;

      state.lane = Phaser.Math.Clamp(state.lane + (dx > 0 ? 1 : -1), 0, CONFIG.lanes - 1);
      state.player.x = state.lanesX[state.lane];
      state.playerGlow.x = state.player.x;
    });
  }

  function update(_, delta) {
    if (!state?.started) return;

    // sync glow
    state.playerGlow.x = state.player.x;
    state.playerGlow.y = state.player.y;

    // spawn
    state.spawnTimer += delta;
    if (state.spawnTimer > 900) {
      state.spawnTimer = 0;
      spawnItem(this);
    }

    // move
    for (let i = state.items.length - 1; i >= 0; i--) {
      const it = state.items[i];
      it.y += it.speed;

      if (it.y > H + 60) {
        it.destroy();
        state.items.splice(i, 1);
      }
    }
  }

  function spawnItem(scene) {
    const lane = Phaser.Math.Between(0, CONFIG.lanes - 1);
    const t = scene.add.text(state.lanesX[lane], -40, "🍒", { fontSize: "32px" }).setOrigin(0.5);
    t.speed = 4.2;
    state.items.push(t);
  }
})();