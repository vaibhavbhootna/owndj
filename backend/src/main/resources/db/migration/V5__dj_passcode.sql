-- V5__dj_passcode.sql
-- Add dj_passcode and host_session_token to sessions table for remote DJ phone access

ALTER TABLE sessions ADD COLUMN IF NOT EXISTS dj_passcode VARCHAR(64) DEFAULT '1234';
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS host_session_token VARCHAR(128);

-- Backfill existing sessions with default dj_passcode if null
UPDATE sessions SET dj_passcode = '1234' WHERE dj_passcode IS NULL;
