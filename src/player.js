.import { CONFIG } from "./config.js";

export function createPlayer(scene, state) {
  const y = CONFIG.height - CONFIG.player.yOffset;

  const player = scene.add.text(
    state.lanesX[state.lane],
    y,
    CONFIG.player.emoji,
    { fontSize: "42px" }
  ).setOrigin(0.5);

  return player;
}

export function movePlayer(state, dir) {
  state.lane = Phaser.Math.Clamp(
    state.lane + dir,
    0,
    CONFIG.lanes - 1
  );
  state.player.x = state.lanesX[state.lane];
}