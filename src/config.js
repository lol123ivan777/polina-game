export const CONFIG = {
  width: window.innerWidth,
  height: window.innerHeight,

  lanes: 4,

  colors: {
    bg: 0x0b0014,
    road: 0x140016,
    neon: 0xff2b8f,
    text: "#ffffff"
  },

  player: {
    yOffset: 120,
    emoji: "🚗"
  },

  items: [
    { type: "bad", icon: "💩", score: -100, weight: 30 },
    { type: "bad", icon: "👻", score: -100, weight: 20 },
    { type: "good", icon: "🍒", score: 100, weight: 25 },
    { type: "good", icon: "🍓", score: 100, weight: 25 }
  ]
};