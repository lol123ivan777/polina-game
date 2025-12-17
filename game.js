document.title = "PolinaBibi v3 " + new Date().toLocaleTimeString();
console.log("GAME.JS LOADED v3", new Date().toISOString());

(() => {
  const LEVELS = [
    { bg: "#0d0014", road: 0x16001f, neon: 0xff2b8f, speed: 4 },
    { bg: "#020d14", road: 0x001a26, neon: 0x2bfff2, speed: 5 },
    { bg: "#140007", road: 0x26000f, neon: 0xff2b5c, speed: 6 },
  ];

  const CONFIG = {
    lanes: 3,
    levelLength: 20, // очков до смены уровня
  };

  const W = window.innerWidth;
  const H = window.innerHeight;

  let state;
  let sceneRef;

  const scene = { preload(){}, create, update };

  new Phaser.Game({
    type: Phaser.AUTO,
    parent: "game",
    width: W,
    height: H,
    backgroundColor: LEVELS[0].bg,
    scene
  });

  function create() {
    sceneRef = this;

    state = {
      started: false,
      lane: 1,
      lanesX: [],
      objects: [],
      spawnTimer: 0,
      score: 0,
      level: 0,
      speed: LEVELS[0].speed,
      road: null,
      neonL: null,
      neonR: null,
    };

    const laneW = W / CONFIG.lanes;
    for (let i = 0; i < CONFIG.lanes; i++) {
      state.lanesX.push(laneW * i + laneW / 2);
    }

    // road
    state.road = this.add.rectangle(
      W / 2,
      H / 2,
      Math.min(W - 40, 520),
      H + 200,
      LEVELS[0].road
    );

    // neon borders
    state.neonL = this.add.rectangle(6, H/2, 6, H+300, LEVELS[0].neon, 0.6);
    state.neonR = this.add.rectangle(W-6, H/2, 6, H+300, LEVELS[0].neon, 0.6);

    // UI
    state.scoreText = this.add.text(16, 16, "0", { fontSize:"22px", color:"#fff" });
    state.levelText = this.add.text(16, 42, "lvl 1", { fontSize:"14px", color:"#aaa" });

    const hint = this.add.text(
      W/2,
      H/2,
      "ТАП — СТАРТ\nСВАЙП ← →",
      { fontSize:"18px", color:"#fff", align:"center" }
    ).setOrigin(0.5);

    // player
    const py = H - 120;
    state.player = this.add.text(
      state.lanesX[state.lane],
      py,
      "🚗",
      { fontSize:"42px" }
    ).setOrigin(0.5);

    let sx = 0;

    this.input.on("pointerdown", p => {
      if (!state.started) {
        state.started = true;
        hint.destroy();
        return;
      }
      sx = p.x;
    });

    this.input.on("pointerup", p => {
      if (!state.started) return;
      const dx = p.x - sx;
      if (Math.abs(dx) < 40) return;

      state.lane = Phaser.Math.Clamp(
        state.lane + (dx > 0 ? 1 : -1),
        0,
        CONFIG.lanes - 1
      );
      state.player.x = state.lanesX[state.lane];
    });
  }

  function update(_, delta) {
    if (!state.started) return;

    state.spawnTimer += delta;

    if (state.spawnTimer > 900) {
      state.spawnTimer = 0;
      spawnObject(sceneRef);
    }

    for (let i = state.objects.length - 1; i >= 0; i--) {
      const o = state.objects[i];
      o.y += o.speed;

      // collision
      if (
        Math.abs(o.y - state.player.y) < 30 &&
        o.lane === state.lane
      ) {
        if (o.type === "gap") {
          gameOver();
          return;
        } else {
          o.destroy();
          state.objects.splice(i, 1);
          addScore();
          continue;
        }
      }

      if (o.y > H + 80) {
        o.destroy();
        state.objects.splice(i, 1);
      }
    }
  }

  function spawnObject(scene) {
    const lane = Phaser.Math.Between(0, CONFIG.lanes - 1);
    const isGap = Math.random() < 0.3;

    let obj;

    if (isGap) {
      obj = scene.add.rectangle(
        state.lanesX[lane],
        -60,
        80,
        60,
        0x000000
      );
      obj.alpha = 0.8;
      obj.type = "gap";
    } else {
      obj = scene.add.text(
        state.lanesX[lane],
        -40,
        "🍒",
        { fontSize:"32px" }
      ).setOrigin(0.5);
      obj.type = "bonus";
    }

    obj.lane = lane;
    obj.speed = state.speed;
    state.objects.push(obj);
  }

  function addScore() {
    state.score++;
    state.scoreText.setText(state.score);

    if (state.score % CONFIG.levelLength === 0) {
      nextLevel();
    }
  }

  function nextLevel() {
    state.level = (state.level + 1) % LEVELS.length;
    const lvl = LEVELS[state.level];

    sceneRef.cameras.main.setBackgroundColor(lvl.bg);
    state.road.fillColor = lvl.road;
    state.neonL.fillColor = lvl.neon;
    state.neonR.fillColor = lvl.neon;

    state.speed = lvl.speed;
    state.levelText.setText("lvl " + (state.level + 1));
  }

  function gameOver() {
    state.started = false;

    sceneRef.add.text(
      W/2,
      H/2,
      "GAME OVER\nобрыв дороги",
      { fontSize:"20px", color:"#ff5566", align:"center" }
    ).setOrigin(0.5);
  }
})();