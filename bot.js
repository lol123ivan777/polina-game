require("dotenv").config(); // 🔴 ВАЖНО

const TelegramBot = require("node-telegram-bot-api");

const token = process.env.BOT_TOKEN;

if (!token) {
  console.error("❌ BOT_TOKEN не найден. Проверь .env");
  process.exit(1);
}

console.log("🤖 Bot starting...");

const bot = new TelegramBot(token, { polling: true });

bot.onText(/\/start/, (msg) => {
  bot.sendMessage(
    msg.chat.id,
    "Запуск игры 👇",
    {
      reply_markup: {
        inline_keyboard: [[
          {
            text: "🎮 Играть",
            web_app: {
              url: "https://polina-game.vercel.app/"
            }
          }
        ]]
      }
    }
  );
});