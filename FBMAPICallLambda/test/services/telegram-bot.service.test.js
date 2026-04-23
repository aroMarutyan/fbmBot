import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockSendMessage } = vi.hoisted(() => {
  process.env.TELEGRAM_BOT_TOKEN = 'test-token';
  process.env.TELEGRAM_CHAT_ID = '12345';
  return { mockSendMessage: vi.fn().mockResolvedValue(undefined) };
});

vi.mock('node-telegram-bot-api', () => ({
  default: class {
    constructor() {}
    sendMessage = mockSendMessage;
  },
}));

import {
  sendResultsToTelegram,
  botResponse,
  botResponseHTML,
} from '../../src/services/telegram-bot.service.js';

describe('telegram-bot-service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('sends plain and HTML responses to configured chat', async () => {
    await botResponse('hello');
    expect(mockSendMessage).toHaveBeenCalledWith('12345', 'hello');

    mockSendMessage.mockClear();

    await botResponseHTML('<b>bold</b>');
    expect(mockSendMessage).toHaveBeenCalledWith('12345', '<b>bold</b>', {
      parse_mode: 'HTML',
    });
  });

  it('formats and sends each result as HTML', async () => {
    const results = [
      {
        alias: 'Car',
        title: 'Honda',
        price: '$5000',
        location: 'NYC',
        url: 'https://fb.com/1',
      },
      {
        alias: 'Bike',
        title: 'Trek',
        price: '$200',
        location: 'LA',
        url: 'https://fb.com/2',
      },
    ];

    await sendResultsToTelegram(results);

    expect(mockSendMessage).toHaveBeenCalledTimes(2);

    const firstMsg = mockSendMessage.mock.calls[0][1];
    expect(firstMsg).toContain('<b>Car</b>');
    expect(firstMsg).toContain('<b>Title:</b> Honda');
    expect(firstMsg).toContain('<b>Price:</b> $5000');
    expect(firstMsg).toContain('<b>Location:</b> NYC');
    expect(firstMsg).toContain('<a href="https://fb.com/1">View Listing</a>');
    expect(mockSendMessage.mock.calls[0][2]).toEqual({ parse_mode: 'HTML' });

    const secondMsg = mockSendMessage.mock.calls[1][1];
    expect(secondMsg).toContain('<b>Bike</b>');
    expect(secondMsg).toContain('<b>Title:</b> Trek');
  });

  it('handles empty results array without sending messages', async () => {
    await sendResultsToTelegram([]);
    expect(mockSendMessage).not.toHaveBeenCalled();
  });

  it('propagates sendMessage errors', async () => {
    mockSendMessage.mockRejectedValueOnce(new Error('network'));
    await expect(botResponse('test')).rejects.toThrow('network');
  });
});
