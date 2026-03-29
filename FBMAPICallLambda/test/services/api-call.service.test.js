import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../src/services/api-call-error-handler.service.js', () => ({
  createErrorSearchEntry: vi.fn(),
}));

import { createErrorSearchEntry } from '../../src/services/api-call-error-handler.service.js';
import { firstCall } from '../../src/services/api-call.service.js';

describe('firstCall', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
  });

  it('returns first page items and builds search URL with filters', async () => {
    const items = [{ id: '1', title: 'Sofa' }];
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ items }),
    });

    const search = {
      alias: 'Furniture',
      query: 'sofa',
      minPrice: '50',
      maxPrice: '500',
      condition: ['new', 'used'],
    };

    const result = await firstCall(search);

    expect(result).toEqual(items);
    expect(global.fetch).toHaveBeenCalledOnce();
    const calledUrl = new URL(global.fetch.mock.calls[0][0]);
    expect(calledUrl.pathname).toBe('/marketplace/sofa');
    expect(calledUrl.searchParams.get('minPrice')).toBe('50');
    expect(calledUrl.searchParams.get('maxPrice')).toBe('500');
    expect(calledUrl.searchParams.get('condition')).toBe('new,used');
  });

  it('builds URL without optional filters when not provided', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ items: [{ id: '1' }] }),
    });

    const search = { alias: 'Basic', query: 'chairs' };
    await firstCall(search);

    const calledUrl = new URL(global.fetch.mock.calls[0][0]);
    expect(calledUrl.pathname).toBe('/marketplace/chairs');
    expect(calledUrl.searchParams.has('minPrice')).toBe(false);
    expect(calledUrl.searchParams.has('maxPrice')).toBe(false);
    expect(calledUrl.searchParams.has('condition')).toBe(false);
  });

  it('follows next pages until a non-empty page is found', async () => {
    global.fetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ items: [], nextPage: 'https://example.com/page2' }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ items: [], nextPage: 'https://example.com/page3' }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ items: [{ id: 'found' }] }),
      });

    const result = await firstCall({ alias: 'Test', query: 'test' });

    expect(result).toEqual([{ id: 'found' }]);
    expect(global.fetch).toHaveBeenCalledTimes(3);
    expect(global.fetch.mock.calls[1][0]).toBe('https://example.com/page2');
    expect(global.fetch.mock.calls[2][0]).toBe('https://example.com/page3');
  });

  it('stops searching after max next page limit is reached', async () => {
    // MAX_NEXT_PAGES is 5; first call + 5 next pages = 6 fetches total
    global.fetch.mockResolvedValue({
      ok: true,
      json: async () => ({ items: [], nextPage: 'https://example.com/next' }),
    });

    const result = await firstCall({ alias: 'Test', query: 'test' });

    expect(result).toEqual([]);
    // 1 initial + 5 next pages = 6
    expect(global.fetch).toHaveBeenCalledTimes(6);
  });

  it('records fetch and first call errors when the API call fails', async () => {
    global.fetch.mockResolvedValueOnce({ ok: false, status: 503 });

    const result = await firstCall({ alias: 'Broken', query: 'fail' });

    expect(result).toEqual([]);
    expect(createErrorSearchEntry).toHaveBeenCalledWith('Broken', 'API_ERROR', 503);
  });

  it('records NEXT_PAGE_ERROR when a subsequent page fails', async () => {
    global.fetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ items: [], nextPage: 'https://example.com/p2' }),
      })
      .mockResolvedValueOnce({ ok: false, status: 429 });

    const result = await firstCall({ alias: 'PagingFail', query: 'test' });

    expect(result).toEqual([]);
    expect(createErrorSearchEntry).toHaveBeenCalledWith('PagingFail', 'NEXT_PAGE_ERROR', 429);
  });

  it('records FETCH_ERROR when fetch throws an exception', async () => {
    global.fetch.mockRejectedValueOnce(new Error('Network down'));

    const result = await firstCall({ alias: 'NetFail', query: 'test' });

    expect(result).toEqual([]);
    expect(createErrorSearchEntry).toHaveBeenCalledWith('NetFail', 'FETCH_ERROR');
  });

  it('returns first page items without pagination when items exist', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ items: [{ id: '1' }], nextPage: 'https://example.com/p2' }),
    });

    const result = await firstCall({ alias: 'Direct', query: 'test' });

    expect(result).toEqual([{ id: '1' }]);
    expect(global.fetch).toHaveBeenCalledOnce();
  });

  it('does not skip empty condition array', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ items: [] }),
    });

    await firstCall({ alias: 'Empty', query: 'test', condition: [] });

    const calledUrl = new URL(global.fetch.mock.calls[0][0]);
    expect(calledUrl.searchParams.has('condition')).toBe(false);
  });
});
