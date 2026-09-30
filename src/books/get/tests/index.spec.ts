// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

import * as chai from 'chai';
import { mockClient } from 'aws-sdk-client-mock';
import { DynamoDBClient, GetItemCommand, GetItemCommandOutput } from '@aws-sdk/client-dynamodb';

const expect = chai.expect;

import { v4 as uuidv4 } from 'uuid';

import { handler } from '../index';

interface Book {
  isbn: string;
  title: string;
  year: number;
  author: string;
  publisher: string;
  rating: number;
  pages: number;
};

describe('get book tests', () => {
  const dynamoDbMock = mockClient(DynamoDBClient);

  beforeEach(() => {
    dynamoDbMock.reset();
  });

  it('should get a single book from dynamodb', async () => {
    // arrange
    const isbn = uuidv4();
    dynamoDbMock.on(GetItemCommand).resolves(buildDynamoDbBook(isbn));

    // act
    const response = await handler({ pathParameters: { isbn } });

    // assert
    expect(dynamoDbMock.commandCalls(GetItemCommand, {
      TableName: 'books',
      Key: { isbn: { S: isbn } }
    })).to.have.length(1);
    expect(response).to.have.property('statusCode', 200);
    expect(response).to.have.deep.property('headers', { 'Content-Type': 'application/json' });
    expect(response).to.have.property('body');

    const book: Book = JSON.parse(response.body);
    expect(book).to.not.null;
    expect(book).to.have.property('isbn', isbn);
    expect(book).to.have.property('title', 'a');
    expect(book).to.have.property('year', 2000);
    expect(book).to.have.property('author', 'b');
    expect(book).to.have.property('publisher', 'c');
    expect(book).to.have.property('rating', 5);
    expect(book).to.have.property('pages', 100);
  });

  it('should return 404 when the book does not exist', async () => {
    // arrange
    const isbn = uuidv4();
    dynamoDbMock.on(GetItemCommand).resolves({ $metadata: {} });

    // act
    const response = await handler({ pathParameters: { isbn } });

    // assert
    expect(dynamoDbMock.commandCalls(GetItemCommand, {
      TableName: 'books',
      Key: { isbn: { S: isbn } }
    })).to.have.length(1);
    expect(response).to.deep.equal({
      statusCode: 404,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'Book not found' })
    });
    expect(JSON.parse(response.body)).to.have.property('message', 'Book not found');
  });

  it('should return 400 when no isbn path parameter is provided', async () => {
    // act
    const response = await handler({ pathParameters: {} });

    // assert
    expect(dynamoDbMock.commandCalls(GetItemCommand)).to.have.length(0);
    expect(response).to.deep.equal({
      statusCode: 400,
      headers: {},
      body: ''
    });
  });

  it('should return an error if call to DynamoDB fails', async () => {
    // arrange
    const isbn = uuidv4();
    dynamoDbMock.on(GetItemCommand).rejects('Error');

    // act
    const response = await handler({ pathParameters: { isbn } });

    // assert
    expect(dynamoDbMock.commandCalls(GetItemCommand, {
      TableName: 'books',
      Key: { isbn: { S: isbn } }
    })).to.have.length(1);
    expect(response).to.deep.equal({
      statusCode: 500,
      headers: {},
      body: ''
    });
  });

  function buildDynamoDbBook(isbn: string): GetItemCommandOutput {
    return {
      $metadata: {},
      Item: {
        isbn: { S: isbn },
        title: { S: 'a' },
        year: { N: '2000' },
        author: { S: 'b' },
        publisher: { S: 'c' },
        rating: { N: '5' },
        pages: { N: '100' }
      }
    };
  }

});
