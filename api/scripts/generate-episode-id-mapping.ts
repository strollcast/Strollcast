/**
 * Generate episode ID mapping from old format to new format
 *
 * Old format: {title_slug}-{year} (e.g., "punica-2023")
 * New format: {lastname}-{year}-{title_slug} (e.g., "chen-2023-punica_multi_tenant")
 *
 * This script queries all episodes from D1 and generates a mapping of old_id → new_id
 * using the generateEpisodeId() function to ensure consistency.
 */

import { generateEpisodeId } from '../src/index';

export interface EpisodeIdMapping {
  [oldId: string]: string; // old_id → new_id
}

export interface Episode {
  id: string;
  title: string;
  authors: string;
  year: number;
}

/**
 * Generate mapping of old episode IDs to new episode IDs
 *
 * @param db - D1 database binding
 * @returns Mapping object: { old_id: new_id }
 */
export async function generateEpisodeIdMapping(db: D1Database): Promise<EpisodeIdMapping> {
  const mapping: EpisodeIdMapping = {};
  const errors: Array<{ oldId: string; error: string }> = [];

  // Query all episodes from database
  const result = await db.prepare(
    `SELECT id, title, authors, year FROM episodes ORDER BY year DESC, id ASC`
  ).all();

  const episodes = result.results as Episode[];

  console.log(`Found ${episodes.length} episodes to process`);

  for (const episode of episodes) {
    try {
      // Validate required fields
      if (!episode.title || !episode.year || !episode.authors) {
        console.warn(`Skipping episode ${episode.id}: missing title, year, or authors`);
        errors.push({
          oldId: episode.id,
          error: 'Missing required fields (title, year, or authors)',
        });
        continue;
      }

      // Generate new episode ID using the same function used for new episodes
      const newId = generateEpisodeId(episode.title, episode.year, episode.authors);

      // Store mapping
      mapping[episode.id] = newId;

      console.log(`Mapped: ${episode.id} → ${newId}`);

      // Warn if old and new are the same (already migrated?)
      if (episode.id === newId) {
        console.warn(`Episode ${episode.id} already uses new format`);
      }
    } catch (error) {
      console.error(`Error generating new ID for episode ${episode.id}:`, error);
      errors.push({
        oldId: episode.id,
        error: String(error),
      });
    }
  }

  // Report statistics
  console.log('\n=== Mapping Generation Summary ===');
  console.log(`Total episodes: ${episodes.length}`);
  console.log(`Successfully mapped: ${Object.keys(mapping).length}`);
  console.log(`Errors: ${errors.length}`);

  if (errors.length > 0) {
    console.log('\nErrors encountered:');
    errors.forEach(({ oldId, error }) => {
      console.log(`  - ${oldId}: ${error}`);
    });
  }

  return mapping;
}

/**
 * Get detailed migration info for a specific episode
 *
 * @param db - D1 database binding
 * @param oldId - Old episode ID
 * @returns Episode details with old and new IDs
 */
export async function getEpisodeMigrationInfo(
  db: D1Database,
  oldId: string
): Promise<{ episode: Episode; newId: string } | null> {
  const episode = await db.prepare(
    `SELECT id, title, authors, year FROM episodes WHERE id = ?`
  ).bind(oldId).first<Episode>();

  if (!episode) {
    return null;
  }

  const newId = generateEpisodeId(episode.title, episode.year, episode.authors);

  return { episode, newId };
}
