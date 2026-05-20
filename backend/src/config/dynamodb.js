const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient } = require('@aws-sdk/lib-dynamodb');

const client = new DynamoDBClient({ region: process.env.AWS_REGION || 'eu-north-1' });
const dynamoDB = DynamoDBDocumentClient.from(client);

module.exports = dynamoDB;