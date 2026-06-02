import { describe, it, expect, vi } from 'vitest'
import { sendMessageStream } from '../lib/api'

// Mock fetch globally
global.fetch = vi.fn()

describe('sendMessageStream', () => {
  it('should call onError if stream ends unexpectedly without done flag', async () => {
    const mockReader = {
      read: vi.fn()
        .mockResolvedValueOnce({ done: false, value: new TextEncoder().encode('data: {"token": "hello"}\n') })
        .mockResolvedValueOnce({ done: true, value: undefined }),
    }
    
    const mockResponse = {
      ok: true,
      body: {
        getReader: () => mockReader,
      },
    }
    
    vi.mocked(fetch).mockResolvedValue(mockResponse as any)

    const callbacks = {
      onToken: vi.fn(),
      onDone: vi.fn(),
      onError: vi.fn(),
    }

    await sendMessageStream('test question', null, null, null, callbacks)

    expect(callbacks.onToken).toHaveBeenCalledWith('hello')
    expect(callbacks.onError).toHaveBeenCalledWith('Stream ended unexpectedly')
    expect(callbacks.onDone).not.toHaveBeenCalled()
  })

  it('should skip malformed JSON lines without crashing', async () => {
    const mockReader = {
      read: vi.fn()
        .mockResolvedValueOnce({ done: false, value: new TextEncoder().encode('data: {invalid json}\n') })
        .mockResolvedValueOnce({ done: false, value: new TextEncoder().encode('data: {"done": true, "conv_id": "123"}\n') })
        .mockResolvedValueOnce({ done: true, value: undefined }),
    }
    
    const mockResponse = {
      ok: true,
      body: {
        getReader: () => mockReader,
      },
    }
    
    vi.mocked(fetch).mockResolvedValue(mockResponse as any)

    const callbacks = {
      onToken: vi.fn(),
      onDone: vi.fn(),
      onError: vi.fn(),
    }

    await sendMessageStream('test question', null, null, null, callbacks)

    expect(callbacks.onError).not.toHaveBeenCalled()
    expect(callbacks.onDone).toHaveBeenCalledWith({ conv_id: '123' })
  })
})
