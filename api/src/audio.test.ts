import { describe, it, expect, vi } from 'vitest';
import { parseScript, getCachedSegment, saveCachedSegment } from './audio';

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

    expect(mockR2Cache.get).toHaveBeenCalledWith('segments/test-key.mp3');
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
      'segments/test-key.mp3',
      audioData,
      {
        httpMetadata: { contentType: 'audio/mpeg' },
        customMetadata: { duration: '5.5' },
      }
    );
  });

  it('handles R2 put error gracefully', async () => {
    const audioData = new Uint8Array([1, 2, 3, 4]);
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    const mockR2Cache = {
      put: vi.fn().mockRejectedValue(new Error('R2 error')),
    } as unknown as R2Bucket;

    // Should not throw
    await saveCachedSegment(mockR2Cache, 'error-key', audioData, 3.0);

    expect(consoleError).toHaveBeenCalled();
    consoleError.mockRestore();
  });
});
