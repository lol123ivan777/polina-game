require("dotenv").config();
const TelegramBot = require("node-telegram-bot-api");

const bot = new TelegramBot(process.env.BOT_TOKEN, { polling: true });

bot.onText(/\/start/, (msg) => {
  bot.sendMessage(
    msg.chat.id,
    "🎮 PolinaBibi\nГотова?",
    {
      reply_markup: {
        inline_keyboard: [[
          {
            text: "▶️ ИГРАТЬ",
            web_app: {
              url: "https://lol123ivan777.github.io/polina-game/?v=3"
            }
          }
        ]]
      }
    }
  );
});