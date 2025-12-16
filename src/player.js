export function createPlayer(scene, x, y) {
  const glow = scene.add.circle(x, y, 34, 0xff2b8f, 0.25);
  const bg = scene.add.circle(x, y, 28, 0xffffff, 0.9);
  const icon = scene.add.text(x, y, "🚗", { fontSize: "34px" }).setOrigin(0.5);

  scene.tweens.add({ targets: glow, scale: 1.15, duration: 500, yoyo: true, repeat: -1 });

  return { x, y, glow, bg, icon };
}

export function setPlayerX(player, x) {
  player.x = x;
  player.glow.x = x;
  player.bg.x = x;
  player.icon.x = x;
}

export function setPlayerY(player, y) {
  player.y = y;
  player.glow.y = y;
  player.bg.y = y;
  player.icon.y = y;
}

export function setShield(player, on) {
  if (on) player.glow.setFillStyle(0x00fff2, 0.35);
  else player.glow.setFillStyle(0xff2b8f, 0.25);
}