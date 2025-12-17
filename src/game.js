import { CONFIG } from "./config.js";
import { createPlayer, movePlayer } from "./player.js";
import { spawnItem, updateItems } from "./items.js";
import { createUI, updateUI } from "./ui.js";

let state;

const scene = {
  preload,
  create,
  update
};

new Phaser.Game({
  type: Phaser.AUTO,
  width: CONFIG.width,
  height: CONFIG.height,
  parent: "game",
  backgroundColor: CONFIG.colors.bg,
  scene
});

function preload() {}

function create() {
  state = {
    score: 0,
    lane: 1,
    lanesX: [],
    items: [],
    started: false
  };

  const laneWidth = CONFIG.width / CONFIG.lanes;
  for (let i = 0; i < CONFIG.lanes; i++) {
    state.lanesX.push(laneWidth * i + laneWidth / 2);
  }

  // road
  this.road = this.add.rectangle(
    CONFIG.width / 2,
    CONFIG.height / 2,
    Math.min(CONFIG.width - 40, 520),
    CONFIG.height + 100,
    CONFIG.colors.road
  );

  // player
  state.player = createPlayer(this, state);

  // UI
  state.ui = createUI(this, state);

  // input
  let startX = 0;

  this.input.on("pointerdown", p => {
    if (!state.started) {
      state.started = true;
      return;
    }
    startX = p.x;
  });

  this.input.on("pointerup", p => {
    if (!state.started) return;
    const dx = p.x - startX;
    if (Math.abs(dx) < 40) return;
    movePlayer(state, dx > 0 ? 1 : -1);
  });
}

function update(_, delta) {
  if (!state.started) return;

  updateItems(this, state, delta);
  updateUI(state);
}