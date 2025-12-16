require("dotenv").config();
const TelegramBot = require("node-telegram-bot-api");

/* ===============================
   CONFIG
================================ */

const TOKEN = process.env.BOT_TOKEN;
if (!TOKEN) {
  console.error("❌ BOT_TOKEN не найден в .env");
  process.exit(1);
}

// твой WebApp
const GAME_URL = "https://polina-game.vercel.app/";

// админы бота (ты + она)
const ADMINS = new Set([
  922560728, // её user_id
  // добавь свой, если другой
]);

/* ===============================
   INIT
================================ */

const bot = new TelegramBot(TOKEN, { polling: true });

console.log("🤖 GameBot запущен");

/* ===============================
   HELPERS
================================ */

function isAdmin(msg) {
  return ADMINS.has(msg.from?.id);
}

function gameButton() {
  return {
    reply_markup: {
      inline_keyboard: [[
        {
          text: "🎮 Играть",
          web_app: { url: GAME_URL }
        }
      ]]
    }
  };
}

/* ===============================
   COMMANDS
================================ */

// /start — старт в личке
bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;

  bot.sendMessage(
    chatId,
    "🚗 *Neon Drive*\n\n" +
    "Уворачивайся, собирай бусты и бей рекорды.\n" +
    "Игра открывается прямо в Telegram 👇",
    {
      parse_mode: "Markdown",
      ...gameButton()
    }
  );
});

// /play — просто открыть игру
bot.onText(/\/play/, (msg) => {
  bot.sendMessage(
    msg.chat.id,
    "🎮 Поехали:",
    gameButton()
  );
});

// /id — узнать свой user_id (удобно для whitelist)
bot.onText(/\/id/, (msg) => {
  bot.sendMessage(
    msg.chat.id,
    `🆔 Твой user_id:\n\`${msg.from.id}\``,
    { parse_mode: "Markdown" }
  );
});

// /admin — проверка прав
bot.onText(/\/admin/, (msg) => {
  if (!isAdmin(msg)) {
    bot.sendMessage(msg.chat.id, "⛔ Нет доступа");
    return;
  }

  bot.sendMessage(msg.chat.id, "✅ Ты админ бота");
});

/* ===============================
   OPTIONAL: POST TO CHANNEL
   (оставляем, но не используем
   пока не нужно)
================================ */

// пример, если позже появится ID канала
/*
const CHANNEL_ID = "-100XXXXXXXXXX";

bot.onText(/\/postgame/, (msg) => {
  if (!isAdmin(msg)) return;

  bot.sendMessage(
    CHANNEL_ID,
    "🔥 *Neon Drive запущена!*\n\nЖми и играй 👇",
    {
      parse_mode: "Markdown",
      ...gameButton()
    }
  );
});
*/

/* ===============================
   SAFE FALLBACK
================================ */

// игнорируем мусор
bot.on("message", (msg) => {
  if (!msg.text?.startsWith("/")) return;
});