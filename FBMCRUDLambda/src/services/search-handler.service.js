import { marshall } from '@aws-sdk/util-dynamodb';

const TABLE_NAME = process.env.TABLE_NAME || 'FBMSearches';

export function getTableName() {
  return TABLE_NAME;
}

export function getSearchParams(searchId) {
  return {
    TableName: TABLE_NAME,
    Key: marshall({ searchId }),
  };
}

export function handleNewValue(key, value) {
  if (key === 'active') {
    return value === 'true';
  }
  if (value === undefined || value === null || value.trim() === '') {
    return '';
  }
  const num = Number(value);
  if (!isNaN(num)) {
    return num;
  }
  return value;
}

export function validateSearch(searchId, searches) {
  const found = searches.some((s) => s.searchId === searchId);
  if (!found) {
    return { valid: false, message: `Search with id ${searchId} not found.` };
  }
  return { valid: true };
}

export function handleNumericInput(param, paramName) {
  if (param === undefined || param === null || param === '') {
    return { valid: true, value: undefined };
  }
  return validateNumericParam(param, paramName);
}

export function validateNumericParam(param, paramName) {
  const num = Number(param);
  if (isNaN(num) || num < 0) {
    return { valid: false, message: `${paramName} must be a valid positive number.` };
  }
  return { valid: true, value: num };
}

export function getIdNum() {
  return Math.floor(Math.random() * 1000000);
}

export function validateParamCount(params, count, operation, requiredParams) {
  if (params.length < count) {
    return {
      valid: false,
      message: `${operation} requires at least ${count} parameter(s): ${requiredParams}.`,
    };
  }
  return { valid: true };
}
