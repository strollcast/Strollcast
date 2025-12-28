-- Migration: Create episodes table
-- Created: 2024-12-27

CREATE TABLE episodes (
    -- Primary key: slug-style ID (e.g., "punica-2023")
    id TEXT PRIMARY KEY,

    -- Core metadata
    title TEXT NOT NULL,
    authors TEXT NOT NULL,
    year INTEGER NOT NULL,
    description TEXT NOT NULL,

    -- Duration
    duration TEXT NOT NULL,          -- "14 min" for display
    duration_seconds INTEGER,        -- 840 for sorting/filtering

    -- Full URLs (supports R2, external sources, CDNs)
    audio_url TEXT NOT NULL,
    transcript_url TEXT,

    -- External links
    paper_url TEXT,

    -- Timestamps
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),

    -- Publishing control
    published INTEGER DEFAULT 1      -- 0 = draft, 1 = published
);

-- Indexes for common queries
CREATE INDEX idx_episodes_year ON episodes(year DESC);
CREATE INDEX idx_episodes_published ON episodes(published, created_at DESC);
