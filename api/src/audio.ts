/**
 * Audio utilities for Strollcast.
 *
 * Provides helper functions for script parsing, caching, and R2 uploads.
 */

const TTS_CACHE_BASE = "tts_cache";

// TTS Provider types
export type TTSProvider = "elevenlabs" | "inworld";

const ELEVENLABS_MODEL_ID = "eleven_turbo_v2_5";
const INWORLD_MODEL_ID = "inworld-tts-1";

interface Segment {
  speaker: string;
  text: string | null;
}

/**
 * Parse podcast script and extract speaker segments.
 */
export function parseScript(scriptContent: string): Segment[] {
  const segments: Segment[] = [];

  for (const line of scriptContent.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // Match speaker lines: **ERIC:** or **MAYA:**
    const speakerMatch = trimmed.match(/\*\*([A-Z]+):\*\*\s*(.*)/);
    if (speakerMatch) {
      const speaker = speakerMatch[1];
      let text = speakerMatch[2];

      // Clean up markdown and source annotations
      text = text.replace(/\{\{[^}]+\}\}/g, ""); // Remove {{...}}
      text = text.replace(/\*\*\[[^\]]*\]\*\*/g, ""); // Remove **[...]**
      text = text.replace(/\[[^\]]*\]/g, ""); // Remove [...]
      text = text.replace(/\*\*/g, "").replace(/\*/g, "");
      text = text.replace(/\s+/g, " ").trim(); // Collapse multiple spaces

      if (text && (speaker === "ERIC" || speaker === "MAYA")) {
        segments.push({ speaker, text });
      }
    }
    // Add pause for section headers
    else if (trimmed.startsWith("## [")) {
      segments.push({ speaker: "PAUSE", text: null });
    }
  }

  return segments;
}

/**
 * Compute cache key for a segment.
 */
export function computeCacheKey(text: string, voiceId: string, provider: TTSProvider): string {
  const modelId = provider === "elevenlabs" ? ELEVENLABS_MODEL_ID : INWORLD_MODEL_ID;
  const version = 3

  const cacheData = JSON.stringify(
    {
      text,
      voice_id: voiceId,
      model_id: modelId,
      provider,
      version,
    },
    Object.keys({
      text,
      voice_id: voiceId,
      model_id: modelId,
      provider,
      version,
    }).sort()
  );

  let hash = 0;
  for (let i = 0; i < cacheData.length; i++) {
    const char = cacheData.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  var truncated = text.slice(0, 20) + "_" + text.slice(-10);
  truncated = truncated.replace(/[^a-zA-Z0-9]/g, "");
  return String(version) + "/" + truncated.slice(0, 2) + "/" + Math.abs(hash).toString(16).padStart(8, "0") + "_" + provider + "_" + truncated;
}


/**
 * Inworld API response with word-level timestamps.
 */
export interface InworldApiResponse {
  audioContent?: string;  // Base64-encoded audio
  audio?: { url?: string };  // Alternative: audio URL (AIML API)
  timestampInfo?: {
    wordAlignment?: {
      words: string[];
      wordStartTimeSeconds: number[];
      wordEndTimeSeconds: number[];
    };
  };
}

/**
 * Extract duration from Inworld API response word timestamps.
 * Returns the end time of the last word.
 */
export function getInworldDuration(response: InworldApiResponse): number {
  const wordEndTimes = response.timestampInfo?.wordAlignment?.wordEndTimeSeconds;
  if (!wordEndTimes || wordEndTimes.length === 0) {
    throw new Error(`Response missing word timestamps`);
  }
  return wordEndTimes[wordEndTimes.length - 1];
}


/**
 * Upload VTT transcript to R2.
 */
export async function uploadTranscript(
  r2Bucket: R2Bucket,
  episodeId: string,
  vttContent: string
): Promise<string> {
  const key = `episodes/${episodeId}/${episodeId}.vtt`;
  await r2Bucket.put(key, vttContent, {
    httpMetadata: { contentType: "text/vtt" },
  });

  return `https://released.strollcast.com/${key}`;
}
