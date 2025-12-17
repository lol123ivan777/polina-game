import { CONFIG } from "./config.js";

export function createUI(scene, state) {
  return {
    score: scene.add.text(16, 16, "0", {
      fontSize: "24px",
      color: CONFIG.colors.text
    })
  };
}

export function updateUI(state) {
  state.ui.score.setText(state.score);
}