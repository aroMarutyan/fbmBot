import { DynamoDBClient, ScanCommand, PutItemCommand, UpdateItemCommand, DeleteItemCommand, GetItemCommand } from '@aws-sdk/client-dynamodb';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';
import { botResponse, botResponseHTML } from './telegram-bot.service.js';
import { formatSearchToHTML } from './format.service.js';
import {
  getTableName,
  getSearchParams,
  validateSearch,
  validateParamCount,
  handleNewValue,
  handleNumericInput,
  getIdNum,
} from './search-handler.service.js';

const client = new DynamoDBClient({});

export async function listSearches() {
  try {
    const result = await client.send(new ScanCommand({ TableName: getTableName() }));
    const items = (result.Items || []).map((item) => unmarshall(item));
    const activeSearches = items.filter((item) => item.active);
    if (activeSearches.length === 0) {
      await botResponse('No active searches found.');
      return;
    }
    for (const search of activeSearches) {
      await botResponseHTML(formatSearchToHTML(search));
    }
  } catch (error) {
    await botResponse('Error fetching searches.');
  }
}

export async function getNewestResults(text) {
  try {
    const params = text.trim().split(' ');
    const validation = validateParamCount(params, 2, '/gl', 'searchId');
    if (!validation.valid) {
      await botResponse(validation.message);
      return;
    }
    const searchId = params[1];
    const searchParams = getSearchParams(searchId);
    const result = await client.send(new GetItemCommand(searchParams));
    if (!result.Item) {
      await botResponse(`Search with id ${searchId} not found.`);
      return;
    }
    const search = unmarshall(result.Item);
    if (search.newestResults && search.newestResults.length > 0) {
      for (const item of search.newestResults) {
        await botResponseHTML(item);
      }
    } else {
      await botResponse('No results found for this search.');
    }
  } catch (error) {
    await botResponse('Error fetching newest results.');
  }
}

export async function createNewSearch(text) {
  try {
    const params = text.trim().split(' ');
    const validation = validateParamCount(params, 4, '/ns', 'alias, query, maxPrice');
    if (!validation.valid) {
      await botResponse(validation.message);
      return;
    }
    const [, alias, query, maxPrice, minPrice, ...conditions] = params;
    const maxPriceValidation = handleNumericInput(maxPrice, 'maxPrice');
    if (!maxPriceValidation.valid) {
      await botResponse(maxPriceValidation.message);
      return;
    }
    const minPriceValidation = handleNumericInput(minPrice, 'minPrice');
    if (!minPriceValidation.valid) {
      await botResponse(minPriceValidation.message);
      return;
    }
    const searchId = String(getIdNum());
    const newSearch = {
      searchId,
      alias,
      query,
      maxPrice: maxPriceValidation.value,
      minPrice: minPriceValidation.value,
      condition: conditions.length > 0 ? conditions : [],
      active: true,
      newestResults: [],
    };
    await client.send(
      new PutItemCommand({
        TableName: getTableName(),
        Item: marshall(newSearch, { removeUndefinedValues: true }),
      })
    );
    await botResponseHTML(`Search created:\n${formatSearchToHTML(newSearch)}`);
  } catch (error) {
    await botResponse('Error creating search.');
  }
}

export async function updateSearch(text) {
  try {
    const params = text.trim().split(' ');
    const validation = validateParamCount(params, 4, '/us', 'searchId, key, value');
    if (!validation.valid) {
      await botResponse(validation.message);
      return;
    }
    const [, searchId, key, value] = params;
    const scanResult = await client.send(new ScanCommand({ TableName: getTableName() }));
    const searches = (scanResult.Items || []).map((item) => unmarshall(item));
    const searchValidation = validateSearch(searchId, searches);
    if (!searchValidation.valid) {
      await botResponse(searchValidation.message);
      return;
    }
    const newValue = handleNewValue(key, value);
    await client.send(
      new UpdateItemCommand({
        TableName: getTableName(),
        Key: marshall({ searchId }),
        UpdateExpression: 'SET #k = :v',
        ExpressionAttributeNames: { '#k': key },
        ExpressionAttributeValues: marshall({ ':v': newValue }),
      })
    );
    await botResponseHTML(`Search <b>${searchId}</b> updated: <b>${key}</b> = ${newValue}`);
  } catch (error) {
    await botResponse('Error updating search.');
  }
}

export async function deleteSearch(text) {
  try {
    const params = text.trim().split(' ');
    const validation = validateParamCount(params, 2, '/ds', 'searchId');
    if (!validation.valid) {
      await botResponse(validation.message);
      return;
    }
    const [, searchId] = params;
    const scanResult = await client.send(new ScanCommand({ TableName: getTableName() }));
    const searches = (scanResult.Items || []).map((item) => unmarshall(item));
    const searchValidation = validateSearch(searchId, searches);
    if (!searchValidation.valid) {
      await botResponse(searchValidation.message);
      return;
    }
    await client.send(
      new DeleteItemCommand({
        TableName: getTableName(),
        Key: marshall({ searchId }),
      })
    );
    await botResponse(`Search ${searchId} deleted.`);
  } catch (error) {
    await botResponse('Error deleting search.');
  }
}
