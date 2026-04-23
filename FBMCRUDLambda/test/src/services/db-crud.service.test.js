import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockSend } = vi.hoisted(() => ({
  mockSend: vi.fn(),
}));

vi.mock('@aws-sdk/client-dynamodb', () => ({
  DynamoDBClient: class { constructor() { this.send = mockSend; } },
  ScanCommand: class { constructor(params) { Object.assign(this, params); } },
  PutItemCommand: class { constructor(params) { Object.assign(this, params); } },
  UpdateItemCommand: class { constructor(params) { Object.assign(this, params); } },
  DeleteItemCommand: class { constructor(params) { Object.assign(this, params); } },
  GetItemCommand: class { constructor(params) { Object.assign(this, params); } },
}));

vi.mock('@aws-sdk/util-dynamodb', () => ({
  marshall: vi.fn((obj) => obj),
  unmarshall: vi.fn((obj) => obj),
}));

const { mockBotResponse, mockBotResponseHTML } = vi.hoisted(() => ({
  mockBotResponse: vi.fn(),
  mockBotResponseHTML: vi.fn(),
}));
vi.mock('../../../src/services/telegram-bot.service.js', () => ({
  botResponse: (...args) => mockBotResponse(...args),
  botResponseHTML: (...args) => mockBotResponseHTML(...args),
}));

import {
  listSearches,
  getNewestResults,
  createNewSearch,
  updateSearch,
  deleteSearch,
} from '../../../src/services/db-crud.service.js';

describe('db-crud.service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('lists active searches only and returns no-results message when none are active', async () => {
    // With active searches
    const items = [
      { searchId: '1', alias: 'a', active: true, query: 'q', condition: [] },
      { searchId: '2', alias: 'b', active: false, query: 'q2', condition: [] },
    ];
    mockSend.mockResolvedValueOnce({ Items: items });
    await listSearches();
    expect(mockBotResponseHTML).toHaveBeenCalledTimes(1);
    expect(mockBotResponse).not.toHaveBeenCalled();

    vi.clearAllMocks();

    // No active searches
    mockSend.mockResolvedValueOnce({ Items: [{ searchId: '1', active: false }] });
    await listSearches();
    expect(mockBotResponse).toHaveBeenCalledWith('No active searches found.');
    expect(mockBotResponseHTML).not.toHaveBeenCalled();
  });

  it('fetches newest results for a specific search id', async () => {
    // With results
    mockSend.mockResolvedValueOnce({
      Item: { searchId: '1', newestResults: ['<b>Result1</b>', '<b>Result2</b>'] },
    });
    await getNewestResults('/gl 1');
    expect(mockBotResponseHTML).toHaveBeenCalledTimes(2);
    expect(mockBotResponseHTML).toHaveBeenCalledWith('<b>Result1</b>');
    expect(mockBotResponseHTML).toHaveBeenCalledWith('<b>Result2</b>');

    vi.clearAllMocks();

    // No results
    mockSend.mockResolvedValueOnce({
      Item: { searchId: '1', newestResults: [] },
    });
    await getNewestResults('/gl 1');
    expect(mockBotResponse).toHaveBeenCalledWith('No results found for this search.');

    vi.clearAllMocks();

    // Not found
    mockSend.mockResolvedValueOnce({ Item: null });
    await getNewestResults('/gl 999');
    expect(mockBotResponse).toHaveBeenCalledWith('Search with id 999 not found.');

    vi.clearAllMocks();

    // Missing param
    await getNewestResults('/gl');
    expect(mockBotResponse).toHaveBeenCalledWith(
      expect.stringContaining('/gl requires at least 2 parameter(s)')
    );
  });

  it('creates a search and sends confirmation with created search details', async () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.123456);
    mockSend.mockResolvedValueOnce({});
    await createNewSearch('/ns myAlias laptop 500');
    expect(mockSend).toHaveBeenCalledTimes(1);
    expect(mockBotResponseHTML).toHaveBeenCalledTimes(1);
    expect(mockBotResponseHTML).toHaveBeenCalledWith(
      expect.stringContaining('Search created:')
    );
    vi.restoreAllMocks();
  });

  it('updates a search and sends the updated payload', async () => {
    mockSend
      .mockResolvedValueOnce({ Items: [{ searchId: '1', active: true }] }) // scan
      .mockResolvedValueOnce({}); // update
    await updateSearch('/us 1 query newValue');
    expect(mockSend).toHaveBeenCalledTimes(2);
    expect(mockBotResponseHTML).toHaveBeenCalledWith(
      expect.stringContaining('updated')
    );
  });

  it('deletes a search after validation and confirms deletion', async () => {
    mockSend
      .mockResolvedValueOnce({ Items: [{ searchId: '1', active: true }] }) // scan
      .mockResolvedValueOnce({}); // delete
    await deleteSearch('/ds 1');
    expect(mockSend).toHaveBeenCalledTimes(2);
    expect(mockBotResponse).toHaveBeenCalledWith('Search 1 deleted.');
  });

  it('sends error response when listing searches fails', async () => {
    mockSend.mockRejectedValueOnce(new Error('DB error'));
    await listSearches();
    expect(mockBotResponse).toHaveBeenCalledWith('Error fetching searches.');
  });

  it('sends error when creating search with invalid maxPrice', async () => {
    await createNewSearch('/ns alias query abc');
    expect(mockBotResponse).toHaveBeenCalledWith(
      expect.stringContaining('maxPrice must be a valid positive number')
    );
  });

  it('sends error when creating search with missing params', async () => {
    await createNewSearch('/ns alias');
    expect(mockBotResponse).toHaveBeenCalledWith(
      expect.stringContaining('/ns requires at least 4 parameter(s)')
    );
  });

  it('sends error when updating a non-existent search', async () => {
    mockSend.mockResolvedValueOnce({ Items: [{ searchId: '1' }] });
    await updateSearch('/us 999 key val');
    expect(mockBotResponse).toHaveBeenCalledWith('Search with id 999 not found.');
  });

  it('sends error when deleting a non-existent search', async () => {
    mockSend.mockResolvedValueOnce({ Items: [{ searchId: '1' }] });
    await deleteSearch('/ds 999');
    expect(mockBotResponse).toHaveBeenCalledWith('Search with id 999 not found.');
  });

  it('sends error when update throws', async () => {
    mockSend.mockRejectedValueOnce(new Error('fail'));
    await updateSearch('/us 1 key val');
    expect(mockBotResponse).toHaveBeenCalledWith('Error updating search.');
  });

  it('sends error when delete throws', async () => {
    mockSend.mockRejectedValueOnce(new Error('fail'));
    await deleteSearch('/ds 1');
    expect(mockBotResponse).toHaveBeenCalledWith('Error deleting search.');
  });

  it('sends error when getNewestResults throws', async () => {
    mockSend.mockRejectedValueOnce(new Error('fail'));
    await getNewestResults('/gl 1');
    expect(mockBotResponse).toHaveBeenCalledWith('Error fetching newest results.');
  });

  it('sends error when createNewSearch throws', async () => {
    mockSend.mockRejectedValueOnce(new Error('fail'));
    await createNewSearch('/ns alias query 100');
    expect(mockBotResponse).toHaveBeenCalledWith('Error creating search.');
  });

  it('lists searches with empty Items array', async () => {
    mockSend.mockResolvedValueOnce({ Items: [] });
    await listSearches();
    expect(mockBotResponse).toHaveBeenCalledWith('No active searches found.');
  });

  it('lists searches with missing Items', async () => {
    mockSend.mockResolvedValueOnce({});
    await listSearches();
    expect(mockBotResponse).toHaveBeenCalledWith('No active searches found.');
  });

  it('handles delete with missing params', async () => {
    await deleteSearch('/ds');
    expect(mockBotResponse).toHaveBeenCalledWith(
      expect.stringContaining('/ds requires at least 2 parameter(s)')
    );
  });

  it('handles update with missing params', async () => {
    await updateSearch('/us id');
    expect(mockBotResponse).toHaveBeenCalledWith(
      expect.stringContaining('/us requires at least 4 parameter(s)')
    );
  });

  it('creates a search with minPrice and conditions', async () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5);
    mockSend.mockResolvedValueOnce({});
    await createNewSearch('/ns alias query 500 100 new used');
    expect(mockSend).toHaveBeenCalledTimes(1);
    expect(mockBotResponseHTML).toHaveBeenCalledWith(
      expect.stringContaining('Search created:')
    );
    vi.restoreAllMocks();
  });

  it('sends error for invalid minPrice', async () => {
    await createNewSearch('/ns alias query 500 abc');
    expect(mockBotResponse).toHaveBeenCalledWith(
      expect.stringContaining('minPrice must be a valid positive number')
    );
  });
});
