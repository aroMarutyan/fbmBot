import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../src/services/telegram-bot.service.js', () => ({
  botResponseHTML: vi.fn().mockResolvedValue(undefined),
}));

import { botResponseHTML } from '../../src/services/telegram-bot.service.js';
import {
  ERROR_SEARCHES_ARRAY,
  createErrorSearchEntry,
  displayCurrentInstanceErrors,
} from '../../src/services/api-call-error-handler.service.js';

describe('api-call-error-handler', () => {
  beforeEach(() => {
    ERROR_SEARCHES_ARRAY.length = 0;
    vi.clearAllMocks();
  });

  it('creates an error entry with default error code', () => {
    createErrorSearchEntry('TestSearch', 'FETCH_ERROR');
    expect(ERROR_SEARCHES_ARRAY).toHaveLength(1);
    expect(ERROR_SEARCHES_ARRAY[0]).toEqual({
      alias: 'TestSearch',
      errorType: 'FETCH_ERROR',
      errorCode: 'N/A',
    });
  });

  it('creates an error entry with a custom error code', () => {
    createErrorSearchEntry('TestSearch', 'API_ERROR', 500);
    expect(ERROR_SEARCHES_ARRAY).toHaveLength(1);
    expect(ERROR_SEARCHES_ARRAY[0]).toEqual({
      alias: 'TestSearch',
      errorType: 'API_ERROR',
      errorCode: 500,
    });
  });

  it('sends formatted errors and clears stored errors', async () => {
    createErrorSearchEntry('Search1', 'API_ERROR', 404);
    createErrorSearchEntry('Search2', 'FETCH_ERROR');

    await displayCurrentInstanceErrors();

    expect(botResponseHTML).toHaveBeenCalledOnce();
    const msg = botResponseHTML.mock.calls[0][0];
    expect(msg).toContain('<b>Errors:</b>');
    expect(msg).toContain('<b>Search1</b> - API_ERROR (Code: 404)');
    expect(msg).toContain('<b>Search2</b> - FETCH_ERROR (Code: N/A)');
    expect(ERROR_SEARCHES_ARRAY).toHaveLength(0);
  });

  it('clears errors without sending a message when there are no failures', async () => {
    await displayCurrentInstanceErrors();

    expect(botResponseHTML).not.toHaveBeenCalled();
    expect(ERROR_SEARCHES_ARRAY).toHaveLength(0);
  });

  it('accumulates multiple error entries', () => {
    createErrorSearchEntry('A', 'ERR1', 400);
    createErrorSearchEntry('B', 'ERR2', 500);
    createErrorSearchEntry('C', 'ERR3');
    expect(ERROR_SEARCHES_ARRAY).toHaveLength(3);
  });
});
