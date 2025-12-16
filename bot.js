require("dotenv").config();
const TelegramBot = require("node-telegram-bot-api");

const TOKEN = process.env.BOT_TOKEN;
if (!TOKEN) {
  console.error("❌ BOT_TOKEN не найден в .env");
  process.exit(1);
}

const bot = new TelegramBot(TOKEN, { polling: true });

console.log("🤖 Бот запущен. Напиши /start или отправь что-нибудь в канал.");

// ----- Команда /start -----
bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  const type = msg.chat.type;

  bot.sendMessage(
    chatId,
    `👋 Привет, ${msg.from.first_name || "друг"}!\n\n` +
      `Отправь сюда сообщение из нужного чата или канала, и я покажу его ID прямо в консоли Termux.\n\n` +
      `Текущий чат ID: \`${chatId}\`\nТип: \`${type}\``,
    { parse_mode: "Markdown" }
  );

  console.log(
    `📩 Личное сообщение от ${msg.from.first_name} (${msg.chat.id}) [${type}]`
  );
});

// ----- Логирование всех сообщений -----
bot.on("message", (msg) => {
  const chat = msg.chat;
  console.log(
    "🧩 CHAT:",
    chat.title || `${msg.from.first_name} ${msg.from.last_name || ""}`,
    "| ID:",
    chat.id,
    "| TYPE:",
    chat.type
  );
});