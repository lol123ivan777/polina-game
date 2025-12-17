document.title = "PolinaBibi v3.1 " + new Date().toLocaleTimeString();
console.log("GAME.JS LOADED v3.1", new Date().toISOString());

(() => {
  const CONFIG = {
    lanes: 3,
    speed: 6,
    spawnGapEvery: 1400,
  };

  const W = window.innerWidth;
  const H = window.innerHeight;

  let state;

  const scene = { preload, create, update };

  new Phaser.Game({
    type: Phaser.AUTO,
    parent: "game",
    width: W,
    height: H,
    backgroundColor: "#0b0012",
    scene
  });

  function preload() {
    // фон можно потом
    // дорога
    this.load.image("road", "assets/road/road1.png");

    // обрыв — если файла нет, просто не загрузится, это ок
    this.load.image("gap", "assets/road/road_gap.png");
  }

  function create() {
    state = {
      started: false,
      lane: 1,
      lanesX: [],
      gaps: [],
      spawnTimer: 0,
    };

    // дорога (скролл)
    state.road = this.add.tileSprite(
      W / 2,
      H / 2,
      Math.min(W - 40, 520),
      H,
      "road"
    );

    // полосы
    const laneW = state.road.width / CONFIG.lanes;
    const left = W / 2 - state.road.width / 2;
    for (let i = 0; i < CONFIG.lanes; i++) {
      state.lanesX.push(left + laneW * i + laneW / 2);
    }

    // игрок
    state.player = this.add.text(
      state.lanesX[state.lane],
      H - 120,
      "🚗",
      { fontSize: "42px" }
    ).setOrigin(0.5);

    // подсказка
    const hint = this.add.text(W / 2, H / 2, "ТАП — СТАРТ\nСВАЙП ← →", {
      fontSize: "18px",
      color: "#fff",
      align: "center"
    }).setOrigin(0.5);

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

    // движение дороги
    state.road.tilePositionY += CONFIG.speed;

    // спавн обрывов
    state.spawnTimer += delta;
    if (state.spawnTimer > CONFIG.spawnGapEvery) {
      state.spawnTimer = 0;
      spawnGap(this);
    }

    // движение обрывов
    for (let i = state.gaps.length - 1; i >= 0; i--) {
      const g = state.gaps[i];
      g.y += CONFIG.speed;

      if (g.y > H + 100) {
        g.destroy();
        state.gaps.splice(i, 1);
      }
    }
  }

  function spawnGap(scene) {
    const lane = Phaser.Math.Between(0, CONFIG.lanes - 1);
    let gap;

    if (scene.textures.exists("gap")) {
      // если картинка есть
      gap = scene.add.image(
        state.lanesX[lane],
        -80,
        "gap"
      ).setOrigin(0.5);
    } else {
      // если картинки нет — временный прямоугольник
      gap = scene.add.rectangle(
        state.lanesX[lane],
        -80,
        60,
        80,
        0x000000
      );
    }

    state.gaps.push(gap);
  }
})();