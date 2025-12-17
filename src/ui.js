export function createUI(scene, state) {
  const scoreText = scene.add.text(
    16,
    16,
    "0",
    { fontSize: "24px", color: "#ffffff" }
  );

  const hint = scene.add.text(
    scene.scale.width / 2,
    scene.scale.height / 2,
    "ТАП — СТАРТ\nСВАЙП ← →",
    { fontSize: "18px", color: "#ffffff", align: "center" }
  ).setOrigin(0.5);

  return { scoreText, hint };
}

export function updateUI(state) {
  state.ui.scoreText.setText(state.score);
}