import { CONFIG } from "./config.js";

export function spawnItem(scene, state) {
  const item = CONFIG.items[
    Math.floor(Math.random() * CONFIG.items.length)
  ];

  const lane = Phaser.Math.Between(0, CONFIG.lanes - 1);

  const t = scene.add.text(
    state.lanesX[lane],
    -40,
    item.icon,
    { fontSize: "32px" }
  ).setOrigin(0.5);

  t.meta = item;
  state.items.push(t);
}

export function updateItems(scene, state, delta) {
  if (Math.random() < 0.02) spawnItem(scene, state);

  for (let i = state.items.length - 1; i >= 0; i--) {
    const it = state.items[i];
    it.y += 4;

    if (
      Math.abs(it.x - state.player.x) < 30 &&
      Math.abs(it.y - state.player.y) < 30
    ) {
      state.score += it.meta.score;
      it.destroy();
      state.items.splice(i, 1);
      continue;
    }

    if (it.y > CONFIG.height + 40) {
      it.destroy();
      state.items.splice(i, 1);
    }
  }
}