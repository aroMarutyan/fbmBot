import { firstCall } from './src/services/api-call.service.js';
import { sendResultsToTelegram } from './src/services/telegram-bot.service.js';
import { getSearches, updateSearchData } from './src/services/db-crud.service.js';
import { displayCurrentInstanceErrors } from './src/services/api-call-error-handler.service.js';

export const handler = async () => {
  const searches = await getSearches();
  const activeSearches = searches.filter((s) => s.active);
  const newestResults = [];

  for (const search of activeSearches) {
    const items = await firstCall(search);
    if (items.length > 0) {
      const sorted = items.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      const limited = sorted.slice(0, 5);
      newestResults.push(
        ...limited.map((item) => ({
          alias: search.alias,
          ...item,
        }))
      );
      await updateSearchData(search.searchId, limited[0]);
    }
  }

  if (newestResults.length > 0) {
    await sendResultsToTelegram(newestResults);
  }

  await displayCurrentInstanceErrors();

  return { statusCode: 200 };
};
