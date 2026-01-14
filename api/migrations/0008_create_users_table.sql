-- Migration: Create users table for quota management
-- Created: 2026-01-13

CREATE TABLE users (
    id TEXT PRIMARY KEY,
    github_username TEXT,
    allowed_casts INTEGER NOT NULL DEFAULT 1,
    used_casts INTEGER NOT NULL DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

-- Index for searching by username
CREATE INDEX idx_users_github_username ON users(github_username);
