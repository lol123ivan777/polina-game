export function haptic(type = "light") {
  const tg = window.Telegram?.WebApp;
  const h = tg?.HapticFeedback;
  if (!h) return;

  // type: "light" | "medium" | "heavy" | "success" | "error"
  try {
    if (type === "success") h.notificationOccurred("success");
    else if (type === "error") h.notificationOccurred("error");
    else h.impactOccurred(type);
  } catch {}
}

export function flash(scene, color = 0xff0033, alpha = 0.22, ms = 110) {
  const { width, height } = scene.scale;
  const r = scene.add.rectangle(width / 2, height / 2, width, height, color, alpha);
  scene.tweens.add({
    targets: r,
    alpha: 0,
    duration: ms,
    onComplete: () => r.destroy(),
  });
}

export function pop(scene, targets) {
  scene.tweens.add({
    targets,
    scale: 1.2,
    duration: 120,
    yoyo: true,
  });
}