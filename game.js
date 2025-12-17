document.title = "PolinaBibi v2 " + new Date().toLocaleTimeString();
console.log("GAME.JS LOADED v2", new Date().toISOString());

(() => {
  const CONFIG = {
    lanes: 3,
    bg: "#0d0014",
    road: 0x16001f,
    neon: 0xff2b8f,
  };

  const W = window.innerWidth;
  const H = window.innerHeight;

  let state;

  const scene = { preload(){}, create, update };

  new Phaser.Game({
    type: Phaser.AUTO,
    parent: "game",
    width: W,
    height: H,
    backgroundColor: CONFIG.bg,
    scene
  });

  function create() {
    state = {
      started: false,
      lane: 1,
      lanesX: [],
      items: [],
      spawnTimer: 0,
      score: 0,
    };

    const laneW = W / CONFIG.lanes;
    for (let i = 0; i < CONFIG.lanes; i++) state.lanesX.push(laneW * i + laneW/2);

    // road
    this.add.rectangle(W/2, H/2, Math.min(W - 40, 520), H + 200, CONFIG.road);

    // neon borders
    this.add.rectangle(6, H/2, 6, H + 300, CONFIG.neon, 0.55);
    this.add.rectangle(W-6, H/2, 6, H + 300, CONFIG.neon, 0.55);

    // score
    const scoreText = this.add.text(16, 16, "0", { fontSize:"24px", color:"#fff" });

    // hint
    const hint = this.add.text(W/2, H/2, "ТАП — СТАРТ\nСВАЙП ← →", {
      fontSize:"18px", color:"#fff", align:"center"
    }).setOrigin(0.5);

    // player
    const py = H - 120;
    const player = this.add.text(state.lanesX[state.lane], py, "🚗", { fontSize:"42px" }).setOrigin(0.5);

    let sx = 0;

    this.input.on("pointerdown", (p) => {
      if (!state.started) {
        state.started = true;
        hint.destroy();
        return;
      }
      sx = p.x;
    });

    this.input.on("pointerup", (p) => {
      if (!state.started) return;
      const dx = p.x - sx;
      if (Math.abs(dx) < 40) return;

      state.lane = Phaser.Math.Clamp(state.lane + (dx > 0 ? 1 : -1), 0, CONFIG.lanes - 1);
      player.x = state.lanesX[state.lane];
    });

    state.scoreText = scoreText;
    state.player = player;
  }

  function update(_, delta) {
    if (!state?.started) return;

    state.spawnTimer += delta;
    if (state.spawnTimer > 800) {
      state.spawnTimer = 0;
      spawnItem(this);
    }

    for (let i = state.items.length - 1; i >= 0; i--) {
      const it = state.items[i];
      it.y += it.speed;

      if (it.y > H + 80) {
        it.destroy();
        state.items.splice(i, 1);
      }
    }
  }

  function spawnItem(scene) {
    const lane = Phaser.Math.Between(0, CONFIG.lanes - 1);
    const t = scene.add.text(state.lanesX[lane], -40, "🍒", { fontSize:"32px" }).setOrigin(0.5);
    t.speed = 5;
    state.items.push(t);

    state.score += 1;
    state.scoreText.setText(String(state.score));
  }
})();