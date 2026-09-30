// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

import { APIGatewayProxyResult } from 'aws-lambda';
import { DynamoDBClient, DynamoDBClientConfig, GetItemCommand } from '@aws-sdk/client-dynamodb';
import * as AWSXRay from 'aws-xray-sdk-core';

const ddbOptions: DynamoDBClientConfig = {};

// https://github.com/awslabs/aws-sam-cli/issues/217
if (process.env.AWS_SAM_LOCAL) {
  ddbOptions.endpoint = 'http://dynamodb:8000';
}

const client = process.env.AWS_SAM_LOCAL
  ? new DynamoDBClient(ddbOptions)
  : AWSXRay.captureAWSv3Client(new DynamoDBClient(ddbOptions));

async function handler(event: any): Promise<APIGatewayProxyResult> {
  let response: APIGatewayProxyResult;
  try {
    const isbn = event?.pathParameters?.isbn;

    if (!isbn) {
      return {
        statusCode: 400,
        headers: {},
        body: ''
      };
    }

    const params = {
      TableName: process.env.TABLE || 'books',
      Key: {
        isbn: { S: isbn }
      }
    };

    const result = await client.send(new GetItemCommand(params));

    if (!result.Item) {
      return {
        statusCode: 404,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: 'Book not found' })
      };
    }

    const item = result.Item;
    const bookDto = {
      isbn: item['isbn'].S,
      title: item['title'].S,
      year: parseInt(item['year'].N!, 10),
      author: item['author'].S,
      publisher: item['publisher'].S,
      rating: parseInt(item['rating'].N!, 10),
      pages: parseInt(item['pages'].N!, 10)
    };

    response = {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(bookDto)
    };

  } catch (e) {
    response = {
      statusCode: 500,
      headers: {},
      body: ''
    };
  }
  return response;
}

export { handler };
