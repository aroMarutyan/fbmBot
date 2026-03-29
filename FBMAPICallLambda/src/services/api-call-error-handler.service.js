import { botResponseHTML } from './telegram-bot.service.js';

export const ERROR_SEARCHES_ARRAY = [];

export async function displayCurrentInstanceErrors() {
  if (ERROR_SEARCHES_ARRAY.length === 0) {
    ERROR_SEARCHES_ARRAY.length = 0;
    return;
  }
  const errorMessages = ERROR_SEARCHES_ARRAY.map(
    (e) => `<b>${e.alias}</b> - ${e.errorType} (Code: ${e.errorCode})`
  ).join('\n');
  await botResponseHTML(`<b>Errors:</b>\n${errorMessages}`);
  ERROR_SEARCHES_ARRAY.length = 0;
}

export function createErrorSearchEntry(alias, errorType, errorCode = 'N/A') {
  ERROR_SEARCHES_ARRAY.push({ alias, errorType, errorCode });
}
