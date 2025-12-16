import { getHiScore } from "./storage.js";

export function createUI(scene) {
  const scoreText = scene.add.text(20, 16, "💣 0", { fontSize: "24px", color: "#fff" });
  const livesText = scene.add.text(20, 44, "❤️❤️❤️", { fontSize: "22px" });

  const hi = getHiScore();
  const hiText = scene.add.text(20, 70, `🏁 ${hi}`, { fontSize: "16px", color: "rgba(255,255,255,0.8)" });

  return { scoreText, livesText, hiText };
}

export function setScore(ui, score) {
  ui.scoreText.setText(`💣 ${score}`);
}

export function setLives(ui, lives) {
  ui.livesText.setText("❤️".repeat(lives));
}

export function showStartOverlay(scene) {
  const { width, height } = scene.scale;

  const c = scene.add.container(width / 2, height / 2);
  const panel = scene.add.rectangle(0, 0, Math.min(340, width - 40), 150, 0x0b0b14, 0.8);
  panel.setStrokeStyle(3, 0xff2b8f, 0.9);

  const t1 = scene.add.text(0, -22, "NEON DRIVE", { fontSize: "28px", color: "#fff" }).setOrigin(0.5);
  const t2 = scene.add.text(0, 18, "Свайп ← / →\n💩 урон, 💣 очки", {
    fontSize: "16px", color: "rgba(255,255,255,0.9)", align: "center"
  }).setOrigin(0.5);
  const t3 = scene.add.text(0, 58, "Тапни, чтобы начать", { fontSize: "16px", color: "#00e5ff" }).setOrigin(0.5);

  c.add([panel, t1, t2, t3]);
  return c;
}

export function showGameOver(scene, score) {
  const { width, height } = scene.scale;
  const c = scene.add.container(width / 2, height / 2);

  const panel = scene.add.rectangle(0, 0, Math.min(360, width - 40), 150, 0x0b0b14, 0.85);
  panel.setStrokeStyle(3, 0xff0033, 0.9);

  const t1 = scene.add.text(0, -24, "💥 CRASH", { fontSize: "30px", color: "#fff" }).setOrigin(0.5);
  const t2 = scene.add.text(0, 16, `💣 ${score}`, { fontSize: "20px", color: "#ff2b8f" }).setOrigin(0.5);
  const t3 = scene.add.text(0, 56, "Тапни, чтобы заново", { fontSize: "16px", color: "rgba(255,255,255,0.9)" }).setOrigin(0.5);

  c.add([panel, t1, t2, t3]);
  return c;
}