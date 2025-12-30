-- Migration: Add submitted_by column to track user submissions
-- Created: 2024-12-29

ALTER TABLE jobs ADD COLUMN submitted_by TEXT;

-- Index for querying jobs by user
CREATE INDEX idx_jobs_submitted_by ON jobs(submitted_by);
