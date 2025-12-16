export const CFG = {
  lanes: 4,
  playerYOffset: 130,

  // спавн
  spawn: {
    baseDelayMs: 520,
    minDelayMs: 240,
    accelPerSec: 35, // уменьшение delay со временем
  },

  // скорость падения (ручная)
  fall: {
    base: 6.0,
    growPerSec: 0.9,
  },

  // жизни
  lives: {
    start: 3,
    max: 5,
  },

  // свайп
  swipe: {
    thresholdPx: 40,
  },

  // таблица выпадений (веса)
  dropTable: [
    { type: "poop", weight: 30 },   // урон
    { type: "bomb", weight: 40 },   // +score
    { type: "speed", weight: 22 },  // буст скорости
    { type: "life", weight: 8 },    // +hp (редко)
  ],

  // визуал предметов (пока эмодзи)
  items: {
    poop:  { emoji: "💩", glow: 0xff0033 },
    bomb:  { emoji: "💣", glow: 0xff2b8f },
    speed: { emoji: "⚡", glow: 0xffe600 },
    life:  { emoji: "❤️", glow: 0xff4d6d },
  },
};