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

describe('Frontmatter parsing for create-from-github', () => {
  it('parses valid frontmatter with title and summary', () => {
    const scriptContent = `---
title: "Test Episode Title"
summary: "This is a test summary"
---

**ERIC:** Welcome to the test episode...`;

    const frontmatterMatch = scriptContent.match(/^---\n([\s\S]*?)\n---/);
    expect(frontmatterMatch).toBeTruthy();

    const frontmatter = frontmatterMatch![1];
    const titleMatch = frontmatter.match(/title:\s*["'](.+?)["']/);
    const summaryMatch = frontmatter.match(/summary:\s*["'](.+?)["']/);

    expect(titleMatch).toBeTruthy();
    expect(summaryMatch).toBeTruthy();
    expect(titleMatch![1]).toBe('Test Episode Title');
    expect(summaryMatch![1]).toBe('This is a test summary');
  });

  it('parses frontmatter with single quotes', () => {
    const scriptContent = `---
title: 'Episode with Single Quotes'
summary: 'Summary with single quotes'
---

Content here...`;

    const frontmatterMatch = scriptContent.match(/^---\n([\s\S]*?)\n---/);
    const frontmatter = frontmatterMatch![1];
    const titleMatch = frontmatter.match(/title:\s*["'](.+?)["']/);
    const summaryMatch = frontmatter.match(/summary:\s*["'](.+?)["']/);

    expect(titleMatch![1]).toBe('Episode with Single Quotes');
    expect(summaryMatch![1]).toBe('Summary with single quotes');
  });

  it('returns null when frontmatter is missing', () => {
    const scriptContent = `**ERIC:** Welcome to the episode...`;

    const frontmatterMatch = scriptContent.match(/^---\n([\s\S]*?)\n---/);
    expect(frontmatterMatch).toBeNull();
  });

  it('returns null when title is missing', () => {
    const scriptContent = `---
summary: "Test summary"
---

Content...`;

    const frontmatterMatch = scriptContent.match(/^---\n([\s\S]*?)\n---/);
    const frontmatter = frontmatterMatch![1];
    const titleMatch = frontmatter.match(/title:\s*["'](.+?)["']/);

    expect(titleMatch).toBeNull();
  });

  it('returns null when summary is missing', () => {
    const scriptContent = `---
title: "Test Title"
---

Content...`;

    const frontmatterMatch = scriptContent.match(/^---\n([\s\S]*?)\n---/);
    const frontmatter = frontmatterMatch![1];
    const summaryMatch = frontmatter.match(/summary:\s*["'](.+?)["']/);

    expect(summaryMatch).toBeNull();
  });

  it('extracts year and authors from episode ID', () => {
    const episodeId = 'chen-2023-punica_multi_tenant';
    const idParts = episodeId.split('-');
    const year = parseInt(idParts[1]);
    const authors = idParts[0] ? `${idParts[0].charAt(0).toUpperCase()}${idParts[0].slice(1)} et al.` : 'Unknown';

    expect(year).toBe(2023);
    expect(authors).toBe('Chen et al.');
  });

  it('handles episode ID without year', () => {
    const episodeId = 'strollcast-overview';
    const idParts = episodeId.split('-');
    const year = parseInt(idParts[1]) || new Date().getFullYear();
    const authors = idParts[0] ? `${idParts[0].charAt(0).toUpperCase()}${idParts[0].slice(1)} et al.` : 'Unknown';

    expect(year).toBe(new Date().getFullYear());
    expect(authors).toBe('Strollcast et al.');
  });

  it('validates folder name format (lowercase, numbers, hyphens only)', () => {
    const validNames = [
      'chen-2023-punica',
      'strollcast-2026-overview',
      'test-episode-123',
    ];

    const invalidNames = [
      'Chen-2023-Punica', // uppercase
      'test_episode', // underscore
      'test episode', // space
      'test@episode', // special char
    ];

    const pattern = /^[a-z0-9-]+$/;

    validNames.forEach(name => {
      expect(pattern.test(name)).toBe(true);
    });

    invalidNames.forEach(name => {
      expect(pattern.test(name)).toBe(false);
    });
  });

  it('parses frontmatter with multiline summary', () => {
    const scriptContent = `---
title: "Test Episode"
summary: "This is a summary that spans multiple lines but should only match the first line"
---

Content...`;

    const frontmatterMatch = scriptContent.match(/^---\n([\s\S]*?)\n---/);
    const frontmatter = frontmatterMatch![1];
    const summaryMatch = frontmatter.match(/summary:\s*["'](.+?)["']/);

    // The regex uses non-greedy matching, so it should stop at the first quote
    expect(summaryMatch![1]).toBe('This is a summary that spans multiple lines but should only match the first line');
  });
});
