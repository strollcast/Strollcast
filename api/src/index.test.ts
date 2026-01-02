import { describe, it, expect, vi } from 'vitest';

// Mock Cloudflare Workers modules that index.ts imports
vi.mock('@cloudflare/containers', () => ({
  Container: class Container {},
}));

vi.mock('cloudflare:workers', () => ({}));

import { generateEpisodeId } from './index';

describe('generateEpisodeId', () => {
  it('generates ID with lastname-year-title format', () => {
    const episodeId = generateEpisodeId(
      'Attention Is All You Need',
      2017,
      'Ashish Vaswani'
    );

    expect(episodeId).toBe('vaswani-2017-attention_is_all_you');
  });

  it('handles "et al." suffix by removing it and using first author', () => {
    const episodeId = generateEpisodeId(
      'FlexGen: High-Throughput Generative Inference',
      2023,
      'Ying Sheng et al.'
    );

    expect(episodeId).toBe('sheng-2023-flexgen_high_throug');
  });

  it('extracts last name from "Smith et al."', () => {
    const episodeId = generateEpisodeId(
      'A Study of Machine Learning',
      2024,
      'John Smith et al.'
    );

    expect(episodeId).toBe('smith-2024-a_study_of_machine_l');
  });

  it('handles multiple authors separated by "and"', () => {
    const episodeId = generateEpisodeId(
      'Transformers for Vision',
      2021,
      'Alice Johnson and Bob Williams'
    );

    expect(episodeId).toBe('johnson-2021-transformers_for_vis');
  });

  it('handles multiple authors with commas', () => {
    const episodeId = generateEpisodeId(
      'Deep Learning Advances',
      2022,
      'Chen, Zhang, Liu'
    );

    expect(episodeId).toBe('chen-2022-deep_learning_advanc');
  });

  it('truncates title to 20 characters', () => {
    const episodeId = generateEpisodeId(
      'This Is A Very Long Title That Should Be Truncated',
      2023,
      'Jane Doe'
    );

    expect(episodeId).toBe('doe-2023-this_is_a_very_long');
  });

  it('replaces special characters with underscores', () => {
    const episodeId = generateEpisodeId(
      'GPT-4: A New Era!',
      2023,
      'Sam Altman'
    );

    expect(episodeId).toBe('altman-2023-gpt_4_a_new_era');
  });

  it('removes leading and trailing underscores', () => {
    const episodeId = generateEpisodeId(
      '...Leading and Trailing...',
      2023,
      'Test Author'
    );

    expect(episodeId).toBe('author-2023-leading_and_trail');
  });

  it('handles single-word author names', () => {
    const episodeId = generateEpisodeId(
      'Machine Learning Basics',
      2023,
      'Lecun'
    );

    expect(episodeId).toBe('lecun-2023-machine_learning_bas');
  });

  it('throws error when title is empty', () => {
    expect(() => {
      generateEpisodeId('', 2023, 'John Doe');
    }).toThrow('Title is required for episode ID generation');
  });

  it('throws error when title is whitespace', () => {
    expect(() => {
      generateEpisodeId('   ', 2023, 'John Doe');
    }).toThrow('Title is required for episode ID generation');
  });

  it('throws error when year is invalid (too old)', () => {
    expect(() => {
      generateEpisodeId('Some Title', 1899, 'John Doe');
    }).toThrow('Invalid year: 1899');
  });

  it('throws error when year is invalid (too future)', () => {
    expect(() => {
      generateEpisodeId('Some Title', 2101, 'John Doe');
    }).toThrow('Invalid year: 2101');
  });

  it('throws error when authors is empty', () => {
    expect(() => {
      generateEpisodeId('Some Title', 2023, '');
    }).toThrow('Authors is required for episode ID generation');
  });

  it('throws error when authors is whitespace', () => {
    expect(() => {
      generateEpisodeId('Some Title', 2023, '   ');
    }).toThrow('Authors is required for episode ID generation');
  });

  it('handles complex author format with "et al." at the end', () => {
    const episodeId = generateEpisodeId(
      'Neural Networks Deep Dive',
      2023,
      'Geoffrey Hinton et al.'
    );

    expect(episodeId).toBe('hinton-2023-neural_networks_deep');
  });

  it('lowercases the last name correctly', () => {
    const episodeId = generateEpisodeId(
      'Test Paper',
      2023,
      'UPPERCASE LASTNAME'
    );

    expect(episodeId).toBe('lastname-2023-test_paper');
  });
});
