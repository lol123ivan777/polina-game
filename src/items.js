export function spawnItem(scene, state) {
  const lane = Phaser.Math.Between(0, state.lanesX.length - 1);

  const item = scene.add.text(
    state.lanesX[lane],
    -40,
    "🍒",
    { fontSize: "32px" }
  ).setOrigin(0.5);

  item.speed = 4;

  state.items.push(item);
}

export function updateItems(scene, state, delta) {
  state.spawnTimer += delta;

  if (state.spawnTimer > 900) {
    state.spawnTimer = 0;
    spawnItem(scene, state);
  }

  for (let i = state.items.length - 1; i >= 0; i--) {
    const it = state.items[i];
    it.y += it.speed;

    if (it.y > scene.scale.height + 40) {
      it.destroy();
      state.items.splice(i, 1);
    }
  }
}