import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockSend } = vi.hoisted(() => ({
  mockSend: vi.fn(),
}));

vi.mock('@aws-sdk/client-dynamodb', () => ({
  DynamoDBClient: class {
    constructor() {}
    send = mockSend;
  },
  ScanCommand: vi.fn(function (params) { Object.assign(this, params); }),
  UpdateItemCommand: vi.fn(function (params) { Object.assign(this, params); }),
}));

vi.mock('@aws-sdk/util-dynamodb', () => ({
  unmarshall: vi.fn((item) => item._unmarshalled),
  marshall: vi.fn((obj) => ({ _marshalled: obj })),
}));

import { ScanCommand, UpdateItemCommand } from '@aws-sdk/client-dynamodb';
import { unmarshall, marshall } from '@aws-sdk/util-dynamodb';
import { getSearches, updateSearchData } from '../../src/services/db-crud.service.js';

describe('db-crud-service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('scans searches and unmarshalls returned items', async () => {
    const rawItems = [
      { _unmarshalled: { searchId: '1', alias: 'Cars' } },
      { _unmarshalled: { searchId: '2', alias: 'Bikes' } },
    ];
    mockSend.mockResolvedValueOnce({ Items: rawItems });

    const result = await getSearches();

    expect(ScanCommand).toHaveBeenCalledWith({ TableName: 'FBMSearches' });
    expect(mockSend).toHaveBeenCalledOnce();
    expect(unmarshall).toHaveBeenCalledTimes(2);
    expect(result).toEqual([
      { searchId: '1', alias: 'Cars' },
      { searchId: '2', alias: 'Bikes' },
    ]);
  });

  it('returns empty array when scan returns no items', async () => {
    mockSend.mockResolvedValueOnce({});

    const result = await getSearches();

    expect(result).toEqual([]);
    expect(unmarshall).not.toHaveBeenCalled();
  });

  it('updates newest offer field with remapped offer data', async () => {
    mockSend.mockResolvedValueOnce({});
    const newestResult = { title: 'Honda Civic', price: '$5000' };

    await updateSearchData('search-1', newestResult);

    expect(UpdateItemCommand).toHaveBeenCalledOnce();
    const params = UpdateItemCommand.mock.calls[0][0];
    expect(params.TableName).toBe('FBMSearches');
    expect(params.UpdateExpression).toBe('SET newestOffer = :n');
    expect(marshall).toHaveBeenCalledWith({ searchId: 'search-1' });
    expect(marshall).toHaveBeenCalledWith({ ':n': newestResult });
    expect(mockSend).toHaveBeenCalledOnce();
  });

  it('propagates DynamoDB errors from getSearches', async () => {
    mockSend.mockRejectedValueOnce(new Error('DynamoDB error'));
    await expect(getSearches()).rejects.toThrow('DynamoDB error');
  });

  it('propagates DynamoDB errors from updateSearchData', async () => {
    mockSend.mockRejectedValueOnce(new Error('Write failed'));
    await expect(updateSearchData('s1', {})).rejects.toThrow('Write failed');
  });
});
