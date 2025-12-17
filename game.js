(() => {
  // -----------------------------
  // Config
  // -----------------------------
  const CFG = {
    lanes: 3,
    roadMaxWidth: 520,
    roadSidePadding: 18,      // отступ от краёв экрана до "дороги"
    playerYFromBottom: 120,

    levelEveryMs: 10000,
    warningMs: 1400,          // сколько мигает перед DEAD
    deadHoldMs: 2200,         // сколько держится DEAD
    minSafeLanes: 1,

    spawnEveryMsBase: 700,
    speedBase: 4.0,
    speedPerLevel: 0.55,

    swipeThreshold: 40,

    colors: {
      bg: 0x07000a,
      road: 0x120016,
      neonL: 0xff2bb8,
      neonR: 0x21e6ff,
      warning: 0xffd54a,
      dead: 0xff334a,
      ui: "#ffffff",
      uiDim: "rgba(255,255,255,0.7)"
    }
  };

  // -----------------------------
  // Helpers
  // -----------------------------
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  function pickWeighted(rng, items) {
    // items: [{key, w}]
    let sum = 0;
    for (const it of items) sum += it.w;
    let t = rng() * sum;
    for (const it of items) {
      t -= it.w;
      if (t <= 0) return it.key;
    }
    return items[items.length - 1].key;
  }

  // -----------------------------
  // Game state
  // -----------------------------
  let W = window.innerWidth;
  let H = window.innerHeight;

  let state = null;

  // -----------------------------
  // Scene
  // -----------------------------
  const scene = { preload, create, update };

  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent: "game",
    width: W,
    height: H,
    backgroundColor: CFG.colors.bg,
    scene
  });

  function preload() {}

  function create() {
    const s = this;
    W = s.scale.width;
    H = s.scale.height;

    const roadW = Math.min(W - CFG.roadSidePadding * 2, CFG.roadMaxWidth);
    const roadX = W / 2;
    const laneW = roadW / CFG.lanes;
    const roadLeft = roadX - roadW / 2;

    state = {
      started: false,
      over: false,

      score: 0,
      best: Number(localStorage.getItem("pb_best") || 0),

      level: 1,
      levelTimer: 0,

      speed: CFG.speedBase,
      spawnEvery: CFG.spawnEveryMsBase,
      spawnTimer: 0,

      lane: 1,
      lanesX: [],
      road: { roadW, roadX, roadLeft, laneW },

      // lane states: "SAFE" | "WARNING" | "DEAD"
      laneState: Array(CFG.lanes).fill("SAFE"),
      laneTimers: Array(CFG.lanes).fill(0), // ms for warning/dead cycles

      shieldMs: 0,
      lives: 1,

      items: [],

      // visuals
      roadRect: null,
      laneLines: [],
      neonLeft: null,
      neonRight: null,
      vignette: null,
      flash: null,

      // ui
      ui: {}
    };

    for (let i = 0; i < CFG.lanes; i++) {
      state.lanesX.push(roadLeft + laneW * i + laneW / 2);
    }

    // --- background subtle
    s.add.rectangle(W/2, H/2, W, H, CFG.colors.bg, 1);

    // --- road
    state.roadRect = s.add.rectangle(roadX, H/2, roadW, H + 200, CFG.colors.road, 1);

    // --- lane separators (dashed-ish)
    for (let i = 1; i < CFG.lanes; i++) {
      const x = roadLeft + laneW * i;
      const g = s.add.graphics();
      g.setDepth(1);
      state.laneLines.push({ x, g });
    }

    // --- neon borders
    state.neonLeft = s.add.rectangle(roadLeft - 8, H/2, 6, H + 220, CFG.colors.neonL, 0.65).setDepth(2);
    state.neonRight = s.add.rectangle(roadLeft + roadW + 8, H/2, 6, H + 220, CFG.colors.neonR, 0.65).setDepth(2);

    // --- vignette overlay (cheap but tasty)
    state.vignette = s.add.rectangle(W/2, H/2, W, H, 0x000000, 0.22).setDepth(50);

    // --- flash overlay for hit/level
    state.flash = s.add.rectangle(W/2, H/2, W, H, 0xffffff, 0).setDepth(60);

    // --- player
    const py = H - CFG.playerYFromBottom;
    state.player = s.add.text(state.lanesX[state.lane], py, "🚗", { fontSize: "44px" })
      .setOrigin(0.5)
      .setDepth(10);

    state.playerGlow = s.add.text(state.player.x, state.player.y, "🚗", {
      fontSize: "44px",
      color: "#ff2bb8"
    }).setOrigin(0.5).setAlpha(0.22).setDepth(9);

    // --- UI
    state.ui.score = s.add.text(16, 14, "0", { fontSize: "24px", color: CFG.colors.ui }).setDepth(100);
    state.ui.best = s.add.text(16, 44, `best ${state.best}`, { fontSize: "14px", color: CFG.colors.uiDim }).setDepth(100);

    state.ui.level = s.add.text(W - 16, 14, "lvl 1", { fontSize: "16px", color: CFG.colors.uiDim })
      .setOrigin(1, 0)
      .setDepth(100);

    state.ui.status = s.add.text(W/2, H/2, "ТАП — СТАРТ\nСВАЙП ← →", {
      fontSize: "18px",
      color: CFG.colors.ui,
      align: "center"
    }).setOrigin(0.5).setDepth(100);

    state.ui.lives = s.add.text(W - 16, 38, "❤ 1", { fontSize: "16px", color: CFG.colors.uiDim })
      .setOrigin(1, 0)
      .setDepth(100);

    state.ui.shield = s.add.text(W - 16, 60, "", { fontSize: "14px", color: CFG.colors.uiDim })
      .setOrigin(1, 0)
      .setDepth(100);

    // --- input (tap + swipe)
    let sx = 0;

    s.input.on("pointerdown", (p) => {
      if (state.over) {
        restart(s);
        return;
      }
      if (!state.started) {
        state.started = true;
        state.ui.status.destroy();
        pulseFlash(s, 0x7a00ff, 0.18, 120);
        return;
      }
      sx = p.x;
    });

    s.input.on("pointerup", (p) => {
      if (!state.started || state.over) return;
      const dx = p.x - sx;
      if (Math.abs(dx) < CFG.swipeThreshold) return;

      const dir = dx > 0 ? 1 : -1;
      tryMoveLane(s, dir);
    });

    // handle resize
    s.scale.on("resize", (gameSize) => {
      // минимально, чтобы не ломало
      // (пересчёт сделаем позже, если надо)
    });

    // initial lane visuals
    drawLaneLines(s);
  }

  function update(_, delta) {
    if (!state) return;
    const s = this;

    // always animate road lines + neons a bit
    animateNeon(s, delta);
    drawLaneLines(s);

    if (!state.started || state.over) return;

    // timers
    state.levelTimer += delta;
    state.spawnTimer += delta;

    // shield countdown
    if (state.shieldMs > 0) {
      state.shieldMs = Math.max(0, state.shieldMs - delta);
    }

    // lane warning/dead timers
    updateLaneStates(s, delta);

    // level up
    if (state.levelTimer >= CFG.levelEveryMs) {
      state.levelTimer = 0;
      levelUp(s);
    }

    // spawn items
    const spawnEvery = Math.max(280, state.spawnEvery);
    if (state.spawnTimer >= spawnEvery) {
      state.spawnTimer = 0;
      spawnItem(s);
    }

    // move items + collisions
    updateItems(s, delta);

    // ui sync
    updateUI();
  }

  // -----------------------------
  // Lane logic
  // -----------------------------
  function tryMoveLane(scene, dir) {
    const next = clamp(state.lane + dir, 0, CFG.lanes - 1);
    state.lane = next;
    state.player.x = state.lanesX[state.lane];
    state.playerGlow.x = state.player.x;

    // если въехал на DEAD, получай
    if (state.laneState[state.lane] === "DEAD") {
      hit(scene, "DEAD_LANE");
    }
  }

  function updateLaneStates(scene, delta) {
    for (let i = 0; i < CFG.lanes; i++) {
      const st = state.laneState[i];
      if (st === "WARNING" || st === "DEAD") {
        state.laneTimers[i] -= delta;

        if (st === "WARNING" && state.laneTimers[i] <= 0) {
          // WARNING -> DEAD
          state.laneState[i] = "DEAD";
          state.laneTimers[i] = CFG.deadHoldMs;

          // если игрок на этой полосе, удар
          if (state.lane === i) hit(scene, "DEAD_SWITCH");
        } else if (st === "DEAD" && state.laneTimers[i] <= 0) {
          // DEAD -> SAFE
          state.laneState[i] = "SAFE";
          state.laneTimers[i] = 0;
        }
      }
    }
  }

  // -----------------------------
  // Level system
  // -----------------------------
  function levelUp(scene) {
    state.level += 1;

    // speed step (скачком)
    state.speed = CFG.speedBase + (state.level - 1) * CFG.speedPerLevel;

    // spawn rate чуть быстрее
    state.spawnEvery = CFG.spawnEveryMsBase - (state.level - 1) * 35;

    // flashy feedback
    pulseFlash(scene, 0xffffff, 0.16, 110);

    // lane event: начинаем с 3 уровня
    if (state.level >= 3) roadEvent(scene);

    // bonus: иногда даём жизнь (чуть реже)
    if (state.level % 4 === 0) {
      state.lives = Math.min(3, state.lives + 1);
      tinyToast(scene, "❤ +1", 900);
    }
  }

  function roadEvent(scene) {
    // Правило: минимум одна SAFE должна быть всегда
    // Идея: выбираем 1 полосу на WARNING, но только если сейчас SAFE.
    // Если уже есть DEAD, не делаем две DEAD на мелких уровнях.
    const safeIdx = [];
    const deadIdx = [];
    const warnIdx = [];
    for (let i = 0; i < CFG.lanes; i++) {
      if (state.laneState[i] === "SAFE") safeIdx.push(i);
      if (state.laneState[i] === "DEAD") deadIdx.push(i);
      if (state.laneState[i] === "WARNING") warnIdx.push(i);
    }

    // если SAFE всего 1, не трогаем её
    if (safeIdx.length <= CFG.minSafeLanes) return;

    // на ранних уровнях максимум 1 DEAD
    const maxDead = state.level < 7 ? 1 : 2;

    // если dead уже много, лучше мигать, а не убивать новую
    if (deadIdx.length >= maxDead) {
      // попробуем просто подсветить/мигнуть SAFE (WARNING) на короткое время без ухода в DEAD
      const idx = safeIdx[Math.floor(Math.random() * safeIdx.length)];
      // "fake warning": подсветим неоном, но не меняем состояние
      blinkNeon(scene, 360);
      return;
    }

    // выбираем полосу, которую будем "ломать"
    const candidates = safeIdx.filter(i => i !== state.lane); // не ломаем полосу под игроком слишком часто
    const target = (candidates.length ? candidates : safeIdx)[Math.floor(Math.random() * (candidates.length ? candidates.length : safeIdx.length))];

    // WARNING -> потом DEAD
    state.laneState[target] = "WARNING";
    state.laneTimers[target] = CFG.warningMs;

    // визуальный сигнал: борта + легкий "дзынь"
    blinkNeon(scene, 520);
  }

  // -----------------------------
  // Items
  // -----------------------------
  function spawnItem(scene) {
    // Спавн не в DEAD полосы чаще, но иногда можно рискнуть (чтобы было "ааа, вкусно, но опасно")
    const laneWeights = [];
    for (let i = 0; i < CFG.lanes; i++) {
      const st = state.laneState[i];
      laneWeights.push({
        key: i,
        w: st === "DEAD" ? 0.25 : st === "WARNING" ? 0.75 : 1.0
      });
    }
    const lane = pickWeighted(Math.random, laneWeights);

    // Типы предметов
    const type = pickWeighted(Math.random, [
      { key: "GOOD", w: 6.0 },   // 🍒 / 💩 / 👻 etc
      { key: "BOMB", w: 1.4 },   // 💣
      { key: "SHIELD", w: 0.9 }, // 🧿
      { key: "HEART", w: 0.35 }, // ❤️
      { key: "FLAG", w: 0.22 }   // 🇷🇺
    ]);

    const meta = getItemMeta(type);

    const t = scene.add.text(state.lanesX[lane], -50, meta.emoji, { fontSize: meta.size })
      .setOrigin(0.5)
      .setDepth(20);

    t.lane = lane;
    t.kind = type;
    t.score = meta.score;
    t.speed = state.speed + meta.speedAdd;

    // glow clone for "вау"
    t.glow = scene.add.text(t.x, t.y, meta.emoji, { fontSize: meta.size, color: meta.glow })
      .setOrigin(0.5)
      .setAlpha(0.20)
      .setDepth(19);

    state.items.push(t);
  }

  function getItemMeta(kind) {
    switch (kind) {
      case "GOOD": {
        const emoji = pickWeighted(Math.random, [
          { key: "🍒", w: 3.2 },
          { key: "🍓", w: 1.8 },
          { key: "💩", w: 1.2 },
          { key: "👻", w: 1.0 }
        ]);
        return { emoji, score: 100, size: "34px", speedAdd: 0.0, glow: "#ff2bb8" };
      }
      case "BOMB":
        return { emoji: "💣", score: -500, size: "34px", speedAdd: 0.4, glow: "#ff334a" };
      case "SHIELD":
        return { emoji: "🧿", score: 0, size: "34px", speedAdd: 0.2, glow: "#21e6ff" };
      case "HEART":
        return { emoji: "❤️", score: 0, size: "32px", speedAdd: 0.1, glow: "#ff4d7a" };
      case "FLAG":
        return { emoji: "🇷🇺", score: 1000, size: "30px", speedAdd: 0.6, glow: "#ffffff" };
      default:
        return { emoji: "🍒", score: 100, size: "34px", speedAdd: 0.0, glow: "#ff2bb8" };
    }
  }

  function updateItems(scene, delta) {
    const py = state.player.y;

    for (let i = state.items.length - 1; i >= 0; i--) {
      const it = state.items[i];
      it.y += it.speed;
      it.glow.y = it.y;
      it.glow.x = it.x;

      // collide near player Y
      if (Math.abs(it.y - py) < 26 && it.lane === state.lane) {
        // if lane dead => hit anyway
        if (state.laneState[state.lane] === "DEAD") {
          hit(scene, "DEAD_LANE_ITEM");
          destroyItem(i);
          continue;
        }

        // apply
        applyItem(scene, it);
        destroyItem(i);
        continue;
      }

      // out
      if (it.y > H + 80) {
        destroyItem(i);
      }
    }

    function destroyItem(idx) {
      const it = state.items[idx];
      it.glow.destroy();
      it.destroy();
      state.items.splice(idx, 1);
    }
  }

  function applyItem(scene, it) {
    if (it.kind === "GOOD") {
      state.score += it.score;
      tinyToast(scene, `+${it.score}`, 520);
      popNeon(scene, 140);
      return;
    }

    if (it.kind === "BOMB") {
      state.score = Math.max(0, state.score + it.score);
      hit(scene, "BOMB");
      return;
    }

    if (it.kind === "SHIELD") {
      state.shieldMs = Math.max(state.shieldMs, 4000);
      tinyToast(scene, "🧿 shield", 700);
      pulseFlash(scene, 0x21e6ff, 0.12, 90);
      return;
    }

    if (it.kind === "HEART") {
      state.lives = Math.min(3, state.lives + 1);
      tinyToast(scene, "❤ +1", 700);
      pulseFlash(scene, 0xff4d7a, 0.12, 90);
      return;
    }

    if (it.kind === "FLAG") {
      state.score += it.score;
      tinyToast(scene, `+${it.score}`, 750);
      pulseFlash(scene, 0xffffff, 0.14, 110);
      return;
    }
  }

  // -----------------------------
  // Hit / Game over
  // -----------------------------
  function hit(scene, reason) {
    if (state.over) return;

    // shield absorbs once (per hit)
    if (state.shieldMs > 0) {
      state.shieldMs = 0;
      pulseFlash(scene, 0x21e6ff, 0.16, 110);
      blinkNeon(scene, 260);
      tinyToast(scene, "щит спас 🧿", 650);
      return;
    }

    state.lives -= 1;

    // feedback
    pulseFlash(scene, 0xff1f5a, 0.20, 120);
    blinkNeon(scene, 420);

    if (navigator.vibrate) navigator.vibrate(70);

    if (state.lives <= 0) {
      gameOver(scene);
    } else {
      tinyToast(scene, "хит!", 520);
    }
  }

  function gameOver(scene) {
    state.over = true;

    // save best
    if (state.score > state.best) {
      state.best = state.score;
      localStorage.setItem("pb_best", String(state.best));
    }

    const txt =
      `GAME OVER\n\n` +
      `score: ${state.score}\n` +
      `best: ${state.best}\n\n` +
      `тап — заново`;

    // overlay
    const panel = scene.add.rectangle(W/2, H/2, Math.min(320, W-40), 240, 0x000000, 0.55)
      .setDepth(200);

    const label = scene.add.text(W/2, H/2, txt, {
      fontSize: "18px",
      color: "#ffffff",
      align: "center"
    }).setOrigin(0.5).setDepth(201);

    state.ui._gameOverPanel = panel;
    state.ui._gameOverLabel = label;
  }

  function restart(scene) {
    // clear items
    for (const it of state.items) {
      it.glow.destroy();
      it.destroy();
    }
    state.items = [];

    if (state.ui._gameOverPanel) state.ui._gameOverPanel.destroy();
    if (state.ui._gameOverLabel) state.ui._gameOverLabel.destroy();

    // reset
    state.over = false;
    state.started = false;
    state.score = 0;
    state.level = 1;
    state.levelTimer = 0;
    state.speed = CFG.speedBase;
    state.spawnEvery = CFG.spawnEveryMsBase;
    state.spawnTimer = 0;

    state.lane = 1;
    state.laneState = Array(CFG.lanes).fill("SAFE");
    state.laneTimers = Array(CFG.lanes).fill(0);

    state.shieldMs = 0;
    state.lives = 1;

    // player pos
    state.player.x = state.lanesX[state.lane];
    state.playerGlow.x = state.player.x;

    // show hint again
    state.ui.status = scene.add.text(W/2, H/2, "ТАП — СТАРТ\nСВАЙП ← →", {
      fontSize: "18px",
      color: CFG.colors.ui,
      align: "center"
    }).setOrigin(0.5).setDepth(100);

    updateUI();
    pulseFlash(scene, 0xffffff, 0.10, 90);
  }

  // -----------------------------
  // UI + visuals
  // -----------------------------
  function updateUI() {
    state.ui.score.setText(String(state.score));
    state.ui.best.setText(`best ${state.best}`);
    state.ui.level.setText(`lvl ${state.level}`);
    state.ui.lives.setText(`❤ ${state.lives}`);

    if (state.shieldMs > 0) {
      state.ui.shield.setText(`🧿 ${Math.ceil(state.shieldMs/1000)}s`);
    } else {
      state.ui.shield.setText("");
    }
  }

  function drawLaneLines(scene) {
    // dashed lines + lane state tint
    const { roadLeft, laneW } = state.road;

    for (let i = 0; i < state.laneLines.length; i++) {
      const x = state.laneLines[i].x;
      const g = state.laneLines[i].g;
      g.clear();

      // color depends on adjacent lane states
      const laneIndex = i + 1; // separator between laneIndex-1 and laneIndex
      const leftLane = laneIndex - 1;
      const rightLane = laneIndex;

      const leftState = state.laneState[leftLane];
      const rightState = state.laneState[rightLane];

      // if any side is DEAD => red-ish
      let color = 0xffffff;
      let alpha = 0.22;
      if (leftState === "DEAD" || rightState === "DEAD") { color = CFG.colors.dead; alpha = 0.35; }
      if (leftState === "WARNING" || rightState === "WARNING") { color = CFG.colors.warning; alpha = 0.38; }

      g.lineStyle(2, color, alpha);

      // dashed segments
      const dash = 26;
      const gap = 22;
      let y = -40;
      while (y < H + 80) {
        g.beginPath();
        g.moveTo(x, y);
        g.lineTo(x, y + dash);
        g.strokePath();
        y += dash + gap;
      }

      // lane tint overlay: subtle rectangles per lane
      // (рисуем тут же, чтобы не плодить объекты)
      for (let lane = 0; lane < CFG.lanes; lane++) {
        const st = state.laneState[lane];
        if (st === "SAFE") continue;

        const lx = roadLeft + laneW * lane + laneW / 2;
        const w = laneW - 6;
        const c = st === "WARNING" ? CFG.colors.warning : CFG.colors.dead;
        const a = st === "WARNING" ? 0.06 : 0.08;

        g.fillStyle(c, a);
        g.fillRect(lx - w/2, 0, w, H);
      }
    }
  }

  function animateNeon(scene, delta) {
    // лёгкая "дышащая" анимация
    const t = scene.time.now * 0.004;
    const aL = 0.45 + Math.sin(t) * 0.20;
    const aR = 0.45 + Math.cos(t * 0.9) * 0.20;
    state.neonLeft.setAlpha(aL);
    state.neonRight.setAlpha(aR);

    // player glow wobble
    if (state.playerGlow) {
      state.playerGlow.x = state.player.x + Math.sin(t * 1.6) * 0.6;
      state.playerGlow.y = state.player.y + Math.cos(t * 1.3) * 0.6;
    }
  }

  function pulseFlash(scene, color, alpha, ms) {
    state.flash.setFillStyle(color, 1);
    state.flash.setAlpha(alpha);
    scene.tweens.add({
      targets: state.flash,
      alpha: 0,
      duration: ms,
      ease: "Quad.easeOut"
    });
  }

  function blinkNeon(scene, ms) {
    scene.tweens.add({
      targets: [state.neonLeft, state.neonRight],
      alpha: { from: 0.95, to: 0.25 },
      duration: ms / 6,
      yoyo: true,
      repeat: 3
    });
  }

  function popNeon(scene, ms) {
    scene.tweens.add({
      targets: [state.neonLeft, state.neonRight],
      scaleX: { from: 1.0, to: 1.25 },
      duration: ms / 2,
      yoyo: true,
      ease: "Sine.easeInOut"
    });
  }

  function tinyToast(scene, text, ms) {
    const t = scene.add.text(W/2, 90, text, { fontSize: "16px", color: "rgba(255,255,255,0.92)" })
      .setOrigin(0.5)
      .setDepth(150);

    scene.tweens.add({
      targets: t,
      y: 70,
      alpha: 0,
      duration: ms,
      ease: "Quad.easeOut",
      onComplete: () => t.destroy()
    });
  }
})();