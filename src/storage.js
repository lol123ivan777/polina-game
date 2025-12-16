const HI_KEY = "neon_hi";

export function getHiScore() {
  return Number(localStorage.getItem(HI_KEY) || "0");
}

export function setHiScore(score) {
  localStorage.setItem(HI_KEY, String(score));
}