import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockSendMessage } = vi.hoisted(() => ({
  mockSendMessage: vi.fn().mockResolvedValue(true),
}));

vi.mock('node-telegram-bot-api', () => {
  return {
    default: class {
      constructor() {
        this.sendMessage = mockSendMessage;
      }
    },
  };
});

import { botResponse, botResponseHTML, buildTelegramResponse } from '../../../src/services/telegram-bot.service.js';

describe('telegram-bot.service', () => {
  beforeEach(() => {
    mockSendMessage.mockClear();
  });

  it('sends plain and html responses to the configured chat id', async () => {
    await botResponse('hello');
    expect(mockSendMessage).toHaveBeenCalledWith(undefined, 'hello');

    mockSendMessage.mockClear();
    await botResponseHTML('<b>hi</b>');
    expect(mockSendMessage).toHaveBeenCalledWith(undefined, '<b>hi</b>', { parse_mode: 'HTML' });
  });

  it('builds telegram response payload from offer details', () => {
    const item = {
      title: 'Laptop',
      price: '$100',
      location: 'NYC',
      url: 'http://example.com',
      imageUrl: 'http://img.com/1.jpg',
      extra: 'ignored',
    };
    const result = buildTelegramResponse('myAlias', item);
    expect(result).toEqual({
      alias: 'myAlias',
      title: 'Laptop',
      price: '$100',
      location: 'NYC',
      url: 'http://example.com',
      imageUrl: 'http://img.com/1.jpg',
    });
    expect(result).not.toHaveProperty('extra');
  });

  it('handles missing item fields gracefully', () => {
    const result = buildTelegramResponse('alias', {});
    expect(result.alias).toBe('alias');
    expect(result.title).toBeUndefined();
    expect(result.price).toBeUndefined();
  });
});
