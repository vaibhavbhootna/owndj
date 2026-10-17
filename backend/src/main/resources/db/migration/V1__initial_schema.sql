-- V1__initial_schema.sql
-- Initial schema for Virtual DJ backend

CREATE TABLE IF NOT EXISTS sessions (
    id UUID PRIMARY KEY,
    room_code VARCHAR(16) NOT NULL UNIQUE,
    name VARCHAR(128) NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'CREATED',
    host_session_token_hash VARCHAR(128) NOT NULL,
    settings_json TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    started_at TIMESTAMP WITH TIME ZONE,
    ended_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_sessions_room_code ON sessions(room_code);
CREATE INDEX IF NOT EXISTS idx_sessions_status ON sessions(status);

CREATE TABLE IF NOT EXISTS guests (
    id UUID PRIMARY KEY,
    session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    nickname VARCHAR(64) NOT NULL,
    guest_token_hash VARCHAR(128) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    last_seen_at TIMESTAMP WITH TIME ZONE NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_guests_session_id ON guests(session_id);
CREATE INDEX IF NOT EXISTS idx_guests_token_hash ON guests(guest_token_hash);

CREATE TABLE IF NOT EXISTS songs (
    id UUID PRIMARY KEY,
    youtube_video_id VARCHAR(64) NOT NULL UNIQUE,
    title VARCHAR(255) NOT NULL,
    channel_title VARCHAR(255),
    thumbnail_url VARCHAR(512),
    duration_seconds INTEGER NOT NULL DEFAULT 0,
    embeddable_status VARCHAR(32) NOT NULL DEFAULT 'EMBEDDABLE',
    metadata_updated_at TIMESTAMP WITH TIME ZONE NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_songs_youtube_video_id ON songs(youtube_video_id);

CREATE TABLE IF NOT EXISTS song_requests (
    id UUID PRIMARY KEY,
    session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    guest_id UUID NOT NULL REFERENCES guests(id) ON DELETE CASCADE,
    song_id UUID NOT NULL REFERENCES songs(id) ON DELETE CASCADE,
    requested_start_seconds INTEGER NOT NULL DEFAULT 0,
    requested_duration_seconds INTEGER NOT NULL DEFAULT 60,
    requested_end_seconds INTEGER NOT NULL DEFAULT 60,
    status VARCHAR(32) NOT NULL DEFAULT 'PENDING',
    queue_position INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    approved_at TIMESTAMP WITH TIME ZONE,
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_song_requests_session_id ON song_requests(session_id);
CREATE INDEX IF NOT EXISTS idx_song_requests_guest_id ON song_requests(guest_id);
CREATE INDEX IF NOT EXISTS idx_song_requests_status ON song_requests(status);
CREATE INDEX IF NOT EXISTS idx_song_requests_session_status_pos ON song_requests(session_id, status, queue_position);

CREATE TABLE IF NOT EXISTS song_moments (
    id UUID PRIMARY KEY,
    song_id UUID NOT NULL REFERENCES songs(id) ON DELETE CASCADE,
    label VARCHAR(64) NOT NULL,
    start_seconds INTEGER NOT NULL,
    end_seconds INTEGER,
    confidence NUMERIC(5, 2) NOT NULL DEFAULT 1.0,
    detection_method VARCHAR(32) NOT NULL DEFAULT 'MANUAL',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_song_moments_song_id ON song_moments(song_id);

CREATE TABLE IF NOT EXISTS song_moment_feedback (
    id UUID PRIMARY KEY,
    song_moment_id UUID NOT NULL REFERENCES song_moments(id) ON DELETE CASCADE,
    guest_id UUID NOT NULL REFERENCES guests(id) ON DELETE CASCADE,
    vote INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    CONSTRAINT uq_moment_guest UNIQUE(song_moment_id, guest_id)
);

CREATE INDEX IF NOT EXISTS idx_moment_feedback_moment ON song_moment_feedback(song_moment_id);

CREATE TABLE IF NOT EXISTS song_request_votes (
    id UUID PRIMARY KEY,
    song_request_id UUID NOT NULL REFERENCES song_requests(id) ON DELETE CASCADE,
    guest_id UUID NOT NULL REFERENCES guests(id) ON DELETE CASCADE,
    vote INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    CONSTRAINT uq_request_guest UNIQUE(song_request_id, guest_id)
);

CREATE INDEX IF NOT EXISTS idx_request_votes_request ON song_request_votes(song_request_id);
