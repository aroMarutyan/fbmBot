import { firstCall } from './src/services/api-call.service.js';
import { sendResultsToTelegram } from './src/services/telegram-bot.service.js';
import { getSearches, updateSearchData } from './src/services/db-crud.service.js';
import { ERROR_SEARCHES_ARRAY, displayCurrentInstanceErrors } from './src/services/api-call-error-handler.service.js';

export const handler = async () => {};
