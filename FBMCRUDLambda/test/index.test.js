import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockBotResponse = vi.fn();
const mockListSearches = vi.fn();
const mockGetNewestResults = vi.fn();
const mockCreateNewSearch = vi.fn();
const mockUpdateSearch = vi.fn();
const mockDeleteSearch = vi.fn();

vi.mock('../src/services/telegram-bot.service.js', () => ({
  botResponse: (...args) => mockBotResponse(...args),
}));

vi.mock('../src/services/db-crud.service.js', () => ({
  listSearches: (...args) => mockListSearches(...args),
  getNewestResults: (...args) => mockGetNewestResults(...args),
  createNewSearch: (...args) => mockCreateNewSearch(...args),
  updateSearch: (...args) => mockUpdateSearch(...args),
  deleteSearch: (...args) => mockDeleteSearch(...args),
}));

import { handler } from '../index.js';

describe('handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('routes /ls to listSearches', async () => {
    const result = await handler({ message: { text: '/ls' } });
    expect(mockListSearches).toHaveBeenCalledWith('/ls');
    expect(result).toEqual({ statusCode: 200 });
  });

  it('routes /gl to getNewestResults', async () => {
    const result = await handler({ message: { text: '/gl 123' } });
    expect(mockGetNewestResults).toHaveBeenCalledWith('/gl 123');
    expect(result).toEqual({ statusCode: 200 });
  });

  it('routes /ns to createNewSearch', async () => {
    const result = await handler({ message: { text: '/ns alias query 100' } });
    expect(mockCreateNewSearch).toHaveBeenCalledWith('/ns alias query 100');
    expect(result).toEqual({ statusCode: 200 });
  });

  it('routes /us to updateSearch', async () => {
    const result = await handler({ message: { text: '/us 1 key val' } });
    expect(mockUpdateSearch).toHaveBeenCalledWith('/us 1 key val');
    expect(result).toEqual({ statusCode: 200 });
  });

  it('routes /ds to deleteSearch', async () => {
    const result = await handler({ message: { text: '/ds 1' } });
    expect(mockDeleteSearch).toHaveBeenCalledWith('/ds 1');
    expect(result).toEqual({ statusCode: 200 });
  });

  it('responds with help text for /help command', async () => {
    const result = await handler({ message: { text: '/help' } });
    expect(mockBotResponse).toHaveBeenCalledWith(expect.stringContaining('Available commands:'));
    expect(result).toEqual({ statusCode: 200 });
  });

  it('responds with unrecognized command fallback', async () => {
    const result = await handler({ message: { text: '/unknown' } });
    expect(mockBotResponse).toHaveBeenCalledWith('Unrecognized command. Type /help for available commands.');
    expect(result).toEqual({ statusCode: 200 });
  });

  it('handles missing message gracefully', async () => {
    const result = await handler({});
    expect(mockBotResponse).toHaveBeenCalledWith('Unrecognized command. Type /help for available commands.');
    expect(result).toEqual({ statusCode: 200 });
  });

  it('handles empty text', async () => {
    const result = await handler({ message: { text: '' } });
    expect(mockBotResponse).toHaveBeenCalledWith('Unrecognized command. Type /help for available commands.');
    expect(result).toEqual({ statusCode: 200 });
  });
});
