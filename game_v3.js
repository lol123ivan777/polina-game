const tg = window.Telegram?.WebApp;

if (tg) {
  tg.ready();
  tg.expand();
  tg.disableVerticalSwipes(); // чтобы не свайпался Telegram
}

document.title = "PolinaBibi v3";
console.log("GAME.JS LOADED v3 — 4 LANES");

(() => {
  const W = window.innerWidth;
  const H = window.innerHeight;

  const CONFIG = {
    lanes: 4,
    levelDurationDefault: 10000,
    levelDurationLevel5: 15000,
    maxLevel: 5,

    levels: {
      1: { speed: 4,  spawn: 800 },
      2: { speed: 6,  spawn: 690 },
      3: { speed: 8,  spawn: 550 },
      4: { speed: 10, spawn: 420 },
      5: { speed: 15, spawn: 350 }, // почти ад
    },

    items: [
      { emoji: "🍒", score:  100, weight: 3 },
      { emoji: "🍓", score:  200, weight: 2 },
      { emoji: "💩", score: -100, weight: 2 },
      { emoji: "💣", score: -200, weight: 1 },
    ]
  };

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
      mode: "idle",
      lane: 1,
      lanesX: [],
      items: [],
      spawnTimer: 0,
      levelTimer: 0,
      level: 1,
      score: 0,
      speed: CONFIG.levels[1].speed,
      spawnGap: CONFIG.levels[1].spawn,
      goText: null
    };

    // BACKGROUND
    this.bg = this.add.image(W/2, H/2, "bglvl1")
      .setDisplaySize(W, H);

    // затемнение для читаемости
    this.dark = this.add.rectangle(W/2, H/2, W, H, 0x000000, 0.35);

    // ROAD
    const roadW = Math.min(W * 0.7, 560);
    const roadX = W / 2;

    this.add.rectangle(roadX, H/2, roadW, H + 200, 0x000000, 0.25);

    // LANES
    const laneW = roadW / CONFIG.lanes;
    for (let i = 0; i < CONFIG.lanes; i++) {
      state.lanesX.push(
        roadX - roadW/2 + laneW/2 + laneW * i
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
      color: "#fff",
      fontFamily: "monospace"
    });

    state.levelText = this.add.text(16, 40, "lvl 1", {
      fontSize: "14px",
      color: "#aaa",
      fontFamily: "monospace"
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

    // LEVEL //

     state.levelTimer += delta;

const levelLimit =
  state.level === 5 ? CONFIG.levelDurationLevel5 : CONFIG.levelDurationDefault;

if (state.levelTimer >= levelLimit) {
  state.levelTimer = 0;
  nextLevel(this);
}

    // SPAWN
    state.spawnTimer += delta;
    if (state.spawnTimer >= state.spawnGap) {
      state.spawnTimer = 0;
      spawnItem(this);
    }

    // ITEMS MOVE
    for (let i = state.items.length - 1; i >= 0; i--) {
      const it = state.items[i];
      it.y += state.speed;

      if (
        Math.abs(it.y - state.player.y) < 32 &&
        it.lane === state.lane
      ) {
        state.score += it.score;
        state.scoreText.setText(state.score);
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

  // ---------- SPAWN ITEM ----------
  function spawnItem(scene) {
    const lane = Phaser.Math.Between(0, CONFIG.lanes - 1);
    const item = weightedRandom(CONFIG.items);

    const t = scene.add.text(
      state.lanesX[lane],
      -40,
      item.emoji,
      { fontSize: "34px" }
    ).setOrigin(0.5);

    t.lane = lane;
    t.score = item.score;

    state.items.push(t);
  }

  // ---------- NEXT LEVEL ----------
  function nextLevel(scene) {
  // если уже на 5 и таймер закончился -> победа
  if (state.level >= CONFIG.maxLevel) {
    win(scene);
    return;
  }

  state.level++;
  const cfg = CONFIG.levels[state.level];

  state.speed = cfg.speed;
  state.spawnGap = cfg.spawn;

  state.levelText.setText("lvl " + state.level);
  scene.bg.setTexture("bglvl" + state.level);
}

  // ---------- UTILS ----------
  function weightedRandom(arr) {
    const sum = arr.reduce((a, b) => a + b.weight, 0);
    let r = Math.random() * sum;
    for (const it of arr) {
      if ((r -= it.weight) <= 0) return it;
    }
    return arr[0];
  }

function win(scene) {
  if (state.mode !== "play") return;

  state.mode = "win";

  // убираем все предметы
  for (const it of state.items) it.destroy();
  state.items.length = 0;

  // большой пончик (да, размер можно любой)
  const donut = scene.add.text(
    W / 2,
    H / 2 - 40,
    "🍩",
    { fontSize: "140px" } // огромный
  ).setOrigin(0.5);

  scene.add.text(
    W / 2,
    H / 2 + 90,
    "ТЫ ПРОШЁЛ(А) 5 УРОВЕНЬ\nИГРА ОКОНЧЕНА\n\nТАП — ЗАНОВО",
    { fontSize: "20px", color: "#fff", align: "center" }
  ).setOrigin(0.5);

  // тап -> рестарт
  scene.input.once("pointerdown", () => scene.scene.restart());
}

})();