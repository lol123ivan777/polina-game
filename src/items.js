import { pop } from "./effects.js";

export function pickWeighted(dropTable) {
  const total = dropTable.reduce((s, it) => s + it.weight, 0);
  let r = Math.random() * total;
  for (const it of dropTable) {
    r -= it.weight;
    if (r <= 0) return it.type;
  }
  return dropTable[0].type;
}

export function spawnItem(scene, x, type, itemCfg, vy) {
  const y = -60;
  const spec = itemCfg[type];

  const glow = scene.add.circle(x, y, 30, spec.glow, 0.22);
  const bg = scene.add.circle(x, y, 24, 0x0b0b14, 0.85);
  bg.setStrokeStyle(2, spec.glow, 0.9);

  const icon = scene.add.text(x, y, spec.emoji, { fontSize: "40px" }).setOrigin(0.5);

  // пульс
  scene.tweens.add({ targets: glow, scale: 1.18, duration: 420, yoyo: true, repeat: -1 });

  return { type, x, y, vy, glow, bg, icon };
}

export function moveItem(it, dt) {
  it.y += it.vy * dt;
  it.glow.setPosition(it.x, it.y);
  it.bg.setPosition(it.x, it.y);
  it.icon.setPosition(it.x, it.y);
}

export function destroyItem(it) {
  it.glow.destroy();
  it.bg.destroy();
  it.icon.destroy();
}

export function hitFX(scene, it) {
  pop(scene, [it.glow, it.bg, it.icon]);
}