import { DynamoDBClient, ScanCommand, UpdateItemCommand } from '@aws-sdk/client-dynamodb';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';

const client = new DynamoDBClient({});
const TABLE_NAME = process.env.TABLE_NAME || 'FBMSearches';

export async function getSearches() {
  const result = await client.send(new ScanCommand({ TableName: TABLE_NAME }));
  return (result.Items || []).map((item) => unmarshall(item));
}

export async function updateSearchData(searchId, newestResult) {
  await client.send(
    new UpdateItemCommand({
      TableName: TABLE_NAME,
      Key: marshall({ searchId }),
      UpdateExpression: 'SET newestOffer = :n',
      ExpressionAttributeValues: marshall({ ':n': newestResult }),
    })
  );
}
