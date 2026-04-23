import TelegramBot from 'node-telegram-bot-api';

const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN);
const CHAT_ID = process.env.TELEGRAM_CHAT_ID;

export async function sendResultsToTelegram(newestResults) {
  for (const result of newestResults) {
    const text =
      `<b>${result.alias}</b>\n` +
      `<b>Title:</b> ${result.title}\n` +
      `<b>Price:</b> ${result.price}\n` +
      `<b>Location:</b> ${result.location}\n` +
      `<a href="${result.url}">View Listing</a>`;
    await botResponseHTML(text);
  }
}

export async function botResponse(text) {
  await bot.sendMessage(CHAT_ID, text);
}

export async function botResponseHTML(text) {
  await bot.sendMessage(CHAT_ID, text, { parse_mode: 'HTML' });
}
