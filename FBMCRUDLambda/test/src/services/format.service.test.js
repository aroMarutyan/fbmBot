import { describe, it, expect } from 'vitest';
import { formatSearchToHTML, formatConditions } from '../../../src/services/format.service.js';

describe('format.service', () => {
  it('formats search details to HTML with optional values and condition fallback', () => {
    const search = {
      alias: 'test',
      searchId: '123',
      query: 'laptop',
      minPrice: 10,
      maxPrice: 500,
      condition: ['new'],
      active: true,
    };
    const html = formatSearchToHTML(search);
    expect(html).toContain('<b>Alias:</b> test');
    expect(html).toContain('<b>Search ID:</b> 123');
    expect(html).toContain('<b>Query:</b> laptop');
    expect(html).toContain('<b>Min Price:</b> 10');
    expect(html).toContain('<b>Max Price:</b> 500');
    expect(html).toContain('<b>Condition:</b> new');
    expect(html).toContain('<b>Active:</b> Yes');

    // Missing optional values use N/A
    const minimal = {
      alias: 'a',
      searchId: '1',
      active: false,
      condition: [],
    };
    const html2 = formatSearchToHTML(minimal);
    expect(html2).toContain('<b>Query:</b> N/A');
    expect(html2).toContain('<b>Min Price:</b> N/A');
    expect(html2).toContain('<b>Max Price:</b> N/A');
    expect(html2).toContain('<b>Condition:</b> all');
    expect(html2).toContain('<b>Active:</b> No');
  });

  it('returns all condition when input is missing', () => {
    expect(formatConditions(null)).toBe('all');
    expect(formatConditions(undefined)).toBe('all');
    expect(formatConditions([])).toBe('all');
    expect(formatConditions('')).toBe('all');
  });

  it('filters unknown conditions and trims values', () => {
    expect(formatConditions(['new', ' used ', 'garbage'])).toBe('new, used');
    expect(formatConditions(['unknown'])).toBe('all');
    expect(formatConditions([' refurbished '])).toBe('refurbished');
  });

  it('prioritizes all condition when provided in list', () => {
    expect(formatConditions(['new', 'all', 'used'])).toBe('all');
    expect(formatConditions([' all '])).toBe('all');
  });

  it('handles single string condition', () => {
    expect(formatConditions('new')).toBe('new');
    expect(formatConditions('used')).toBe('used');
    expect(formatConditions('refurbished')).toBe('refurbished');
    expect(formatConditions('all')).toBe('all');
    expect(formatConditions('garbage')).toBe('all');
  });
});
