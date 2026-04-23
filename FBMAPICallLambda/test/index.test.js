import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../src/services/api-call.service.js', () => ({
  firstCall: vi.fn(),
}));
vi.mock('../src/services/telegram-bot.service.js', () => ({
  sendResultsToTelegram: vi.fn().mockResolvedValue(undefined),
}));
vi.mock('../src/services/db-crud.service.js', () => ({
  getSearches: vi.fn(),
  updateSearchData: vi.fn().mockResolvedValue(undefined),
}));
vi.mock('../src/services/api-call-error-handler.service.js', () => ({
  displayCurrentInstanceErrors: vi.fn().mockResolvedValue(undefined),
}));

import { handler } from '../index.js';
import { firstCall } from '../src/services/api-call.service.js';
import { sendResultsToTelegram } from '../src/services/telegram-bot.service.js';
import { getSearches, updateSearchData } from '../src/services/db-crud.service.js';
import { displayCurrentInstanceErrors } from '../src/services/api-call-error-handler.service.js';

describe('handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('processes only active searches and returns a successful response', async () => {
    const searches = [
      { searchId: '1', alias: 'Active', active: true, query: 'cars' },
      { searchId: '2', alias: 'Inactive', active: false, query: 'bikes' },
    ];
    getSearches.mockResolvedValue(searches);
    firstCall.mockResolvedValueOnce([
      { title: 'Car1', createdAt: '2024-01-01', price: '$100', location: 'NYC', url: 'http://x' },
    ]);

    const result = await handler();

    expect(result).toEqual({ statusCode: 200 });
    expect(getSearches).toHaveBeenCalledOnce();
    expect(firstCall).toHaveBeenCalledOnce();
    expect(firstCall).toHaveBeenCalledWith(searches[0]);
    expect(sendResultsToTelegram).toHaveBeenCalledOnce();
    expect(updateSearchData).toHaveBeenCalledWith('1', expect.objectContaining({ title: 'Car1' }));
    expect(displayCurrentInstanceErrors).toHaveBeenCalledOnce();
  });

  it('sends sorted newest results and limits payload to five entries', async () => {
    const searches = [{ searchId: '1', alias: 'Test', active: true, query: 'items' }];
    getSearches.mockResolvedValue(searches);

    const items = Array.from({ length: 8 }, (_, i) => ({
      title: `Item${i}`,
      createdAt: `2024-01-0${i + 1}`,
      price: `$${i * 10}`,
      location: 'NYC',
      url: `http://x/${i}`,
    }));
    firstCall.mockResolvedValueOnce(items);

    await handler();

    const sentResults = sendResultsToTelegram.mock.calls[0][0];
    expect(sentResults).toHaveLength(5);
    // Should be sorted newest-first: Item7, Item6, Item5, Item4, Item3
    expect(sentResults[0].title).toBe('Item7');
    expect(sentResults[4].title).toBe('Item3');
    // All should have alias attached
    sentResults.forEach((r) => expect(r.alias).toBe('Test'));
    // updateSearchData should receive the newest item (Item7)
    expect(updateSearchData).toHaveBeenCalledWith(
      '1',
      expect.objectContaining({ title: 'Item7' })
    );
  });

  it('does not send telegram messages when there are no results', async () => {
    getSearches.mockResolvedValue([{ searchId: '1', alias: 'Empty', active: true, query: 'x' }]);
    firstCall.mockResolvedValueOnce([]);

    const result = await handler();

    expect(result).toEqual({ statusCode: 200 });
    expect(sendResultsToTelegram).not.toHaveBeenCalled();
    expect(updateSearchData).not.toHaveBeenCalled();
    expect(displayCurrentInstanceErrors).toHaveBeenCalledOnce();
  });

  it('handles no active searches gracefully', async () => {
    getSearches.mockResolvedValue([
      { searchId: '1', alias: 'Off', active: false },
    ]);

    const result = await handler();

    expect(result).toEqual({ statusCode: 200 });
    expect(firstCall).not.toHaveBeenCalled();
    expect(sendResultsToTelegram).not.toHaveBeenCalled();
  });

  it('handles empty searches list', async () => {
    getSearches.mockResolvedValue([]);

    const result = await handler();

    expect(result).toEqual({ statusCode: 200 });
    expect(firstCall).not.toHaveBeenCalled();
  });

  it('processes multiple active searches and aggregates results', async () => {
    getSearches.mockResolvedValue([
      { searchId: '1', alias: 'A', active: true, query: 'a' },
      { searchId: '2', alias: 'B', active: true, query: 'b' },
    ]);
    firstCall
      .mockResolvedValueOnce([{ title: 'ItemA', createdAt: '2024-01-01', price: '$1', location: 'X', url: 'http://a' }])
      .mockResolvedValueOnce([{ title: 'ItemB', createdAt: '2024-01-02', price: '$2', location: 'Y', url: 'http://b' }]);

    await handler();

    expect(firstCall).toHaveBeenCalledTimes(2);
    expect(updateSearchData).toHaveBeenCalledTimes(2);
    const sentResults = sendResultsToTelegram.mock.calls[0][0];
    expect(sentResults).toHaveLength(2);
    expect(sentResults.map((r) => r.alias)).toEqual(['A', 'B']);
  });
});
