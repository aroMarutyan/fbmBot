import { botResponse } from './src/services/telegram-bot.service.js';
import { listSearches, getNewestResults, createNewSearch, updateSearch, deleteSearch } from './src/services/db-crud.service.js';

const HELP_TEXT = `Available commands:
/ls - List active searches
/gl <searchId> - Get newest results
/ns <alias> <query> <maxPrice> [minPrice] [conditions...] - Create new search
/us <searchId> <key> <value> - Update a search
/ds <searchId> - Delete a search
/help - Show this help message`;

export const handler = async (event) => {
  const text = event.message?.text || '';
  const command = text.trim().split(' ')[0];

  switch (command) {
    case '/ls':
      await listSearches(text);
      break;
    case '/gl':
      await getNewestResults(text);
      break;
    case '/ns':
      await createNewSearch(text);
      break;
    case '/us':
      await updateSearch(text);
      break;
    case '/ds':
      await deleteSearch(text);
      break;
    case '/help':
      await botResponse(HELP_TEXT);
      break;
    default:
      await botResponse('Unrecognized command. Type /help for available commands.');
      break;
  }

  return { statusCode: 200 };
};
