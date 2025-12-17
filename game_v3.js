document.title = "PolinaBibi v3 " + new Date().toLocaleTimeString();
console.log("GAME.JS LOADED v3", new Date().toISOString());

(() => {

  const CONFIG = {
    lanes: 3,
    speed: 5
  };

  const W = window.innerWidth;
  const H = window.innerHeight;

  let state = {};

  const scene = {
    preload,
    create,
    update
  };

  new Phaser.Game({
    type: Phaser.AUTO,
    parent: "game",
    width: W,
    height: H,
    backgroundColor: "#0d0014",
    scene
  });

  function preload() {
    // фон
    this.load.image("bg", "assets/bg/bg1.png");

    // дорога
    this.load.image("road", "assets/road/road1.png");

    // борта
    this.load.image("borderL", "assets/border/border_left.png");
    this.load.image("borderR", "assets/border/border_right.png");
  }

  function create() {
    state.started = false;
    state.lane = 1;
    state.items = [];
    state.spawnTimer = 0;
    state.score = 0;

    // фон
    this.add.image(W/2, H/2, "bg")
      .setDisplaySize(W, H);

    // дорога (две плитки)
    state.road1 = this.add.image(W/2, H/2, "road");
    state.road2 = this.add.image(W/2, H/2 - state.road1.height, "road");

    // борта
    this.add.image(0, H/2, "borderL").setOrigin(0,0.5);
    this.add.image(W, H/2, "borderR").setOrigin(1,0.5);

    // полосы
    state.lanesX = [];
    const laneW = W / CONFIG.lanes;
    for (let i = 0; i < CONFIG.lanes; i++) {
      state.lanesX.push(laneW * i + laneW/2);
    }

    // текст
    state.scoreText = this.add.text(16,16,"0",{fontSize:"24px",color:"#fff"});
    state.levelText = this.add.text(16,44,"lvl 1",{fontSize:"16px",color:"#aaa"});

    const hint = this.add.text(
      W/2, H/2,
      "ТАП — СТАРТ\nСВАЙП ← →",
      { fontSize:"18px", color:"#fff", align:"center" }
    ).setOrigin(0.5);

    // игрок
    state.player = this.add.text(
      state.lanesX[state.lane],
      H - 120,
      "🚗",
      { fontSize:"42px" }
    ).setOrigin(0.5);

    let startX = 0;

    this.input.on("pointerdown", p => {
      if (!state.started) {
        state.started = true;
        hint.destroy();
        return;
      }
      startX = p.x;
    });

    this.input.on("pointerup", p => {
      if (!state.started) return;
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

  function update(_, delta) {
    if (!state.started) return;

    // скролл дороги
    state.road1.y += CONFIG.speed;
    state.road2.y += CONFIG.speed;

    if (state.road1.y >= H + state.road1.height/2) {
      state.road1.y = state.road2.y - state.road2.height;
    }
    if (state.road2.y >= H + state.road2.height/2) {
      state.road2.y = state.road1.y - state.road1.height;
    }

    // спавн обрывов (чёрный квадрат)
    state.spawnTimer += delta;
    if (state.spawnTimer > 1600) {
      state.spawnTimer = 0;
      spawnGap(this);
    }

    for (let i = state.items.length - 1; i >= 0; i--) {
      const g = state.items[i];
      g.y += CONFIG.speed;

      if (g.y > H + 100) {
        g.destroy();
        state.items.splice(i,1);
      }

      // столкновение
      if (
        Math.abs(g.x - state.player.x) < 40 &&
        Math.abs(g.y - state.player.y) < 40
      ) {
        gameOver(this);
      }
    }
  }

  function spawnGap(scene) {
    const lane = Phaser.Math.Between(0, CONFIG.lanes - 1);

    const gap = scene.add.rectangle(
      state.lanesX[lane],
      -60,
      80,
      80,
      0x000000
    );

    state.items.push(gap);
    state.score++;
    state.scoreText.setText(String(state.score));
  }

  function gameOver(scene) {
    state.started = false;

    scene.add.text(
      W/2, H/2,
      "GAME OVER\nобрыв дороги",
      { fontSize:"24px", color:"#ff4d6d", align:"center" }
    ).setOrigin(0.5);
  }

})();