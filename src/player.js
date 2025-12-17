export function createPlayer(scene, state) {
  const y = scene.scale.height - 120;

  const player = scene.add.text(
    state.lanesX[state.lane],
    y,
    "🚗",
    { fontSize: "42px" }
  ).setOrigin(0.5);

  // glow
  player.glow = scene.add.text(
    player.x,
    player.y,
    "🚗",
    { fontSize: "42px", color: "#ff2b8f" }
  ).setOrigin(0.5).setAlpha(0.3);

  return player;
}

export function movePlayer(state, dir) {
  state.lane += dir;
  state.lane = Phaser.Math.Clamp(state.lane, 0, state.lanesX.length - 1);

  state.player.x = state.lanesX[state.lane];
  state.player.glow.x = state.player.x;
}