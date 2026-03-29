import { describe, it, expect, vi } from 'vitest';

vi.mock('@aws-sdk/util-dynamodb', () => ({
  marshall: vi.fn((obj) => ({ marshalled: obj })),
}));

import {
  getTableName,
  getSearchParams,
  handleNewValue,
  validateSearch,
  handleNumericInput,
  validateNumericParam,
  getIdNum,
  validateParamCount,
} from '../../../src/services/search-handler.service.js';

describe('search-handler.service', () => {
  it('returns table name and marshalled search params', () => {
    expect(getTableName()).toBe('FBMSearches');

    const params = getSearchParams('abc123');
    expect(params).toEqual({
      TableName: 'FBMSearches',
      Key: { marshalled: { searchId: 'abc123' } },
    });
  });

  it('maps new values for active, numeric and empty values', () => {
    expect(handleNewValue('active', 'true')).toBe(true);
    expect(handleNewValue('active', 'false')).toBe(false);
    expect(handleNewValue('maxPrice', '100')).toBe(100);
    expect(handleNewValue('minPrice', '0')).toBe(0);
    expect(handleNewValue('query', '')).toBe('');
    expect(handleNewValue('query', '   ')).toBe('');
    expect(handleNewValue('query', null)).toBe('');
    expect(handleNewValue('query', undefined)).toBe('');
    expect(handleNewValue('query', 'laptop')).toBe('laptop');
  });

  it('validates existing searches and rejects unknown search id', () => {
    const searches = [{ searchId: 'abc' }, { searchId: 'def' }];
    expect(validateSearch('abc', searches)).toEqual({ valid: true });
    expect(validateSearch('xyz', searches)).toEqual({
      valid: false,
      message: 'Search with id xyz not found.',
    });
  });

  it('handles numeric validation and parameter count checks', () => {
    expect(handleNumericInput(undefined, 'price')).toEqual({ valid: true, value: undefined });
    expect(handleNumericInput(null, 'price')).toEqual({ valid: true, value: undefined });
    expect(handleNumericInput('', 'price')).toEqual({ valid: true, value: undefined });
    expect(handleNumericInput('50', 'price')).toEqual({ valid: true, value: 50 });
    expect(handleNumericInput('0', 'price')).toEqual({ valid: true, value: 0 });
    expect(handleNumericInput('abc', 'price')).toEqual({
      valid: false,
      message: 'price must be a valid positive number.',
    });
    expect(handleNumericInput('-5', 'price')).toEqual({
      valid: false,
      message: 'price must be a valid positive number.',
    });

    expect(validateNumericParam('42', 'maxPrice')).toEqual({ valid: true, value: 42 });
    expect(validateNumericParam('abc', 'maxPrice')).toEqual({
      valid: false,
      message: 'maxPrice must be a valid positive number.',
    });

    expect(validateParamCount(['a', 'b'], 3, '/ns', 'alias, query')).toEqual({
      valid: false,
      message: '/ns requires at least 3 parameter(s): alias, query.',
    });
    expect(validateParamCount(['a', 'b', 'c'], 3, '/ns', 'x')).toEqual({ valid: true });
  });

  it('generates deterministic id when random is mocked', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5);
    expect(getIdNum()).toBe(500000);
    vi.restoreAllMocks();
  });

  it('generates id in valid range', () => {
    const id = getIdNum();
    expect(id).toBeGreaterThanOrEqual(0);
    expect(id).toBeLessThan(1000000);
  });

  it('validates empty searches array', () => {
    expect(validateSearch('any', [])).toEqual({
      valid: false,
      message: 'Search with id any not found.',
    });
  });

  it('handles negative zero as valid', () => {
    expect(validateNumericParam('0', 'p')).toEqual({ valid: true, value: 0 });
  });
});
