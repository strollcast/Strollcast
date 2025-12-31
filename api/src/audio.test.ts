import { describe, it, expect, vi } from 'vitest';
import { parseScript, getCachedSegment, saveCachedSegment, getInworldDuration, InworldApiResponse, computeCacheKey } from './audio';

describe('parseScript', () => {
  it('parses speaker segments correctly', () => {
    const script = `
## Introduction

**ERIC:** Welcome to the show!

**MAYA:** Thanks for having me.

## [Section Break]

**ERIC:** Let's dive in.
`;
    const segments = parseScript(script);

    expect(segments).toHaveLength(4); // 3 speech + 1 pause
    expect(segments[0]).toEqual({ speaker: 'ERIC', text: 'Welcome to the show!' });
    expect(segments[1]).toEqual({ speaker: 'MAYA', text: 'Thanks for having me.' });
    expect(segments[2]).toEqual({ speaker: 'PAUSE', text: null });
    expect(segments[3]).toEqual({ speaker: 'ERIC', text: "Let's dive in." });
  });

  it('removes markdown annotations', () => {
    const script = `**ERIC:** This is **bold** and {{page: 1}} citation.`;
    const segments = parseScript(script);

    expect(segments).toHaveLength(1);
    expect(segments[0].text).toBe('This is bold and citation.');
  });

  it('handles empty script', () => {
    const segments = parseScript('');
    expect(segments).toHaveLength(0);
  });

  it('ignores non-speaker lines', () => {
    const script = `
Some random text
# Header
**ERIC:** Valid segment.
More random text
`;
    const segments = parseScript(script);

    expect(segments).toHaveLength(1);
    expect(segments[0].speaker).toBe('ERIC');
  });
});

describe('getCachedSegment', () => {
  it('returns audio and duration from cache with metadata', async () => {
    const audioData = new Uint8Array([1, 2, 3, 4]);
    const mockR2Object = {
      arrayBuffer: vi.fn().mockResolvedValue(audioData.buffer),
      customMetadata: { duration: '5.5' },
    };
    const mockR2Cache = {
      get: vi.fn().mockResolvedValue(mockR2Object),
    } as unknown as R2Bucket;

    const result = await getCachedSegment(mockR2Cache, 'test-key');

    expect(mockR2Cache.get).toHaveBeenCalledWith('tts_cache/test-key.mp3');
    expect(result).not.toBeNull();
    expect(result!.duration).toBe(5.5);
    expect(result!.audio).toEqual(audioData);
  });

  it('returns null for cache miss', async () => {
    const mockR2Cache = {
      get: vi.fn().mockResolvedValue(null),
    } as unknown as R2Bucket;

    const result = await getCachedSegment(mockR2Cache, 'missing-key');

    expect(result).toBeNull();
  });

  it('returns null for legacy cache without duration metadata', async () => {
    const audioData = new Uint8Array([1, 2, 3, 4]);
    const mockR2Object = {
      arrayBuffer: vi.fn().mockResolvedValue(audioData.buffer),
      customMetadata: {}, // No duration
    };
    const mockR2Cache = {
      get: vi.fn().mockResolvedValue(mockR2Object),
    } as unknown as R2Bucket;

    const result = await getCachedSegment(mockR2Cache, 'legacy-key');

    expect(result).toBeNull();
  });

  it('returns null on R2 error', async () => {
    const mockR2Cache = {
      get: vi.fn().mockRejectedValue(new Error('R2 error')),
    } as unknown as R2Bucket;

    const result = await getCachedSegment(mockR2Cache, 'error-key');

    expect(result).toBeNull();
  });
});

describe('saveCachedSegment', () => {
  it('saves audio with duration in customMetadata', async () => {
    const audioData = new Uint8Array([1, 2, 3, 4]);
    const mockR2Cache = {
      put: vi.fn().mockResolvedValue(undefined),
    } as unknown as R2Bucket;

    await saveCachedSegment(mockR2Cache, 'test-key', audioData, 5.5);

    expect(mockR2Cache.put).toHaveBeenCalledWith(
      'tts_cache/test-key.mp3',
      audioData,
      {
        httpMetadata: { contentType: 'audio/mpeg' },
        customMetadata: { duration: '5.5' },
      }
    );
  });

  it('handles R2 put error gracefully', async () => {
    const audioData = new Uint8Array([1, 2, 3, 4]);
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => { });
    const mockR2Cache = {
      put: vi.fn().mockRejectedValue(new Error('R2 error')),
    } as unknown as R2Bucket;

    // Should not throw
    await saveCachedSegment(mockR2Cache, 'error-key', audioData, 3.0);

    expect(consoleError).toHaveBeenCalled();
    consoleError.mockRestore();
  });
});

describe('getInworldDuration', () => {
  it('extracts duration from documented API response format', () => {
    // Example from Inworld API docs
    const response: InworldApiResponse = {
      audioContent: "UklGRiRQAQBXQVZFZm1...",
      timestampInfo: {
        wordAlignment: {
          words: [
            "Hello,",
            "world!",
            "What",
            "a",
            "wonderful",
            "day",
            "to",
            "be",
            "a",
            "text-to-speech",
            "model!"
          ],
          wordStartTimeSeconds: [
            0,
            0.525,
            1.515,
            1.717,
            1.919,
            2.485,
            2.809,
            2.91,
            3.051,
            3.152,
            3.879
          ],
          wordEndTimeSeconds: [
            0.445,
            0.97,
            1.677,
            1.758,
            2.425,
            2.728,
            2.869,
            3.011,
            3.071,
            3.819,
            4.223
          ]
        }
      }
    };

    const duration = getInworldDuration(response);

    // Last word "model!" ends at 4.223 seconds
    expect(duration).toBe(4.223);
  });

  it('extracts duration from single word response', () => {
    const response: InworldApiResponse = {
      timestampInfo: {
        wordAlignment: {
          words: ["Hello"],
          wordStartTimeSeconds: [0],
          wordEndTimeSeconds: [0.5]
        }
      }
    };

    expect(getInworldDuration(response)).toBe(0.5);
  });

  it('throws when timestampInfo is missing', () => {
    const response: InworldApiResponse = {
      audioContent: "base64..."
    };

    expect(() => getInworldDuration(response)).toThrow('Response missing word timestamps');
  });

  it('throws when wordAlignment is missing', () => {
    const response: InworldApiResponse = {
      timestampInfo: {}
    };

    expect(() => getInworldDuration(response)).toThrow('Response missing word timestamps');
  });

  it('throws when wordEndTimeSeconds is empty', () => {
    const response: InworldApiResponse = {
      timestampInfo: {
        wordAlignment: {
          words: [],
          wordStartTimeSeconds: [],
          wordEndTimeSeconds: []
        }
      }
    };

    expect(() => getInworldDuration(response)).toThrow('Response missing word timestamps');
  });
});

describe('computeCacheKey', () => {
  it('generates different keys for different providers', () => {
    const text = 'Hello world, this is a test.';
    const voiceId = 'test-voice';

    const elevenLabsKey = computeCacheKey(text, voiceId, 'elevenlabs');
    const inworldKey = computeCacheKey(text, voiceId, 'inworld');

    expect(elevenLabsKey).not.toBe(inworldKey);
    expect(elevenLabsKey).toContain('elevenlabs');
    expect(inworldKey).toContain('inworld');
  });

  it('generates different keys for different text', () => {
    const voiceId = 'test-voice';

    const key1 = computeCacheKey('Hello world', voiceId, 'inworld');
    const key2 = computeCacheKey('Goodbye world', voiceId, 'inworld');

    expect(key1).not.toBe(key2);
  });

  it('generates different keys for different voices', () => {
    const text = 'Hello world';

    const key1 = computeCacheKey(text, 'voice-1', 'inworld');
    const key2 = computeCacheKey(text, 'voice-2', 'inworld');

    expect(key1).not.toBe(key2);
  });

  it('generates consistent keys for same inputs', () => {
    const text = 'Hello world, this is a test.';
    const voiceId = 'test-voice';

    const key1 = computeCacheKey(text, voiceId, 'inworld');
    const key2 = computeCacheKey(text, voiceId, 'inworld');

    expect(key1).toBe(key2);
  });

  it('includes version prefix in key', () => {
    const key = computeCacheKey('Hello world', 'voice', 'inworld');

    // Key should start with version number
    expect(key).toMatch(/^3\//);
  });

  it('handles long text by truncating', () => {
    const longText = 'This is a very long piece of text that should be truncated in the cache key to keep it manageable';
    const key = computeCacheKey(longText, 'voice', 'inworld');

    // Key should still be generated and contain provider
    expect(key).toContain('inworld');
    expect(key.length).toBeLessThan(200);
  });
});
