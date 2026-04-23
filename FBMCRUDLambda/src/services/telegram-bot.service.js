import TelegramBot from 'node-telegram-bot-api';

const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN);
const CHAT_ID = process.env.TELEGRAM_CHAT_ID;

export async function botResponse(text) {
  await bot.sendMessage(CHAT_ID, text);
}

export async function botResponseHTML(text) {
  await bot.sendMessage(CHAT_ID, text, { parse_mode: 'HTML' });
}

export function buildTelegramResponse(alias, item) {
  return {
    alias,
    title: item.title,
    price: item.price,
    location: item.location,
    url: item.url,
    imageUrl: item.imageUrl,
  };
}
