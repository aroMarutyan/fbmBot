const KNOWN_CONDITIONS = ['new', 'used', 'refurbished'];

export function formatSearchToHTML(search) {
  const lines = [
    `<b>Alias:</b> ${search.alias}`,
    `<b>Search ID:</b> ${search.searchId}`,
    `<b>Query:</b> ${search.query || 'N/A'}`,
    `<b>Min Price:</b> ${search.minPrice ?? 'N/A'}`,
    `<b>Max Price:</b> ${search.maxPrice ?? 'N/A'}`,
    `<b>Condition:</b> ${formatConditions(search.condition)}`,
    `<b>Active:</b> ${search.active ? 'Yes' : 'No'}`,
  ];
  return lines.join('\n');
}

export function formatConditions(condition) {
  if (!condition || (Array.isArray(condition) && condition.length === 0)) {
    return 'all';
  }
  if (Array.isArray(condition)) {
    if (condition.map((c) => c.trim()).includes('all')) {
      return 'all';
    }
    const filtered = condition
      .map((c) => c.trim())
      .filter((c) => KNOWN_CONDITIONS.includes(c));
    return filtered.length > 0 ? filtered.join(', ') : 'all';
  }
  const trimmed = String(condition).trim();
  if (trimmed === 'all' || !KNOWN_CONDITIONS.includes(trimmed)) {
    return 'all';
  }
  return trimmed;
}
