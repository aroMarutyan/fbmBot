import { SEARCH_URL, HEADERS } from '../config/url-config.js';
import { createErrorSearchEntry } from './api-call-error-handler.service.js';

const MAX_NEXT_PAGES = 5;

export async function firstCall(search) {
  try {
    const url = new URL(SEARCH_URL.toString());
    url.pathname += `/${search.query}`;
    if (search.minPrice) url.searchParams.set('minPrice', search.minPrice);
    if (search.maxPrice) url.searchParams.set('maxPrice', search.maxPrice);
    if (search.condition && search.condition.length > 0) {
      url.searchParams.set('condition', search.condition.join(','));
    }

    const response = await fetch(url.toString(), { headers: HEADERS });
    if (!response.ok) {
      createErrorSearchEntry(search.alias, 'API_ERROR', response.status);
      return [];
    }
    const data = await response.json();
    let items = data.items || [];

    let nextPage = data.nextPage;
    let pageCount = 0;
    while (items.length === 0 && nextPage && pageCount < MAX_NEXT_PAGES) {
      const nextResponse = await fetch(nextPage, { headers: HEADERS });
      if (!nextResponse.ok) {
        createErrorSearchEntry(search.alias, 'NEXT_PAGE_ERROR', nextResponse.status);
        break;
      }
      const nextData = await nextResponse.json();
      items = nextData.items || [];
      nextPage = nextData.nextPage;
      pageCount++;
    }

    return items;
  } catch (error) {
    createErrorSearchEntry(search.alias, 'FETCH_ERROR');
    return [];
  }
}
