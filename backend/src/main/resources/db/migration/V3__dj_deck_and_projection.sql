-- V3__dj_deck_and_projection.sql
-- Feature: DJ Deck, Event Playlists, Reusable Sets & Visual Projection

-- 1. Extend sessions table with Event Details & DJ Deck settings
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS event_type VARCHAR(64) DEFAULT 'PARTY';
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS venue VARCHAR(255);
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS event_date VARCHAR(64);
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS start_time VARCHAR(32);
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS end_time VARCHAR(32);
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS theme_color VARCHAR(32) DEFAULT '#06b6d4';
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS banner_text VARCHAR(255) DEFAULT 'Welcome to the Party!';
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS active_visual_preset VARCHAR(32) DEFAULT 'NOW_PLAYING';
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS ticker_text VARCHAR(512) DEFAULT 'Scan the QR code to request songs!';
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS current_dj_track_index INTEGER DEFAULT 0;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS deck_repeat BOOLEAN DEFAULT TRUE;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS deck_shuffle BOOLEAN DEFAULT FALSE;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS guest_requests_paused BOOLEAN DEFAULT FALSE;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS request_cooldown_seconds INTEGER DEFAULT 30;

-- 2. Reusable DJ Sets / Master Playlists (DJ Library)
CREATE TABLE IF NOT EXISTS dj_playlists (
    id UUID PRIMARY KEY,
    name VARCHAR(128) NOT NULL,
    description TEXT,
    tags VARCHAR(255),
    genre VARCHAR(64),
    mood VARCHAR(64),
    event_type VARCHAR(64),
    estimated_duration_seconds INTEGER NOT NULL DEFAULT 0,
    track_count INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_dj_playlists_event_type ON dj_playlists(event_type);
CREATE INDEX IF NOT EXISTS idx_dj_playlists_genre ON dj_playlists(genre);

-- 3. Tracks in Reusable DJ Sets
CREATE TABLE IF NOT EXISTS dj_playlist_tracks (
    id UUID PRIMARY KEY,
    playlist_id UUID NOT NULL REFERENCES dj_playlists(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    artist VARCHAR(255),
    album VARCHAR(255),
    source_type VARCHAR(32) NOT NULL DEFAULT 'YOUTUBE',
    source_identifier VARCHAR(255) NOT NULL,
    duration_seconds INTEGER NOT NULL DEFAULT 0,
    start_seconds INTEGER NOT NULL DEFAULT 0,
    transition_type VARCHAR(32) NOT NULL DEFAULT 'CROSSFADE',
    transition_duration_seconds INTEGER NOT NULL DEFAULT 5,
    is_favorite BOOLEAN NOT NULL DEFAULT FALSE,
    notes TEXT,
    sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_dj_playlist_tracks_playlist ON dj_playlist_tracks(playlist_id, sort_order);

-- 4. Event DJ Deck Tracks (Active event-specific copy)
CREATE TABLE IF NOT EXISTS event_dj_tracks (
    id UUID PRIMARY KEY,
    session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    artist VARCHAR(255),
    album VARCHAR(255),
    source_type VARCHAR(32) NOT NULL DEFAULT 'YOUTUBE',
    source_identifier VARCHAR(255) NOT NULL,
    duration_seconds INTEGER NOT NULL DEFAULT 0,
    start_seconds INTEGER NOT NULL DEFAULT 0,
    transition_type VARCHAR(32) NOT NULL DEFAULT 'CROSSFADE',
    transition_duration_seconds INTEGER NOT NULL DEFAULT 5,
    is_favorite BOOLEAN NOT NULL DEFAULT FALSE,
    notes TEXT,
    sort_order INTEGER NOT NULL DEFAULT 0,
    playback_status VARCHAR(32) NOT NULL DEFAULT 'UNPLAYED', -- 'UNPLAYED', 'PLAYING', 'PLAYED', 'SKIPPED'
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_event_dj_tracks_session ON event_dj_tracks(session_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_event_dj_tracks_status ON event_dj_tracks(session_id, playback_status);

-- 5. Chronological Event Playback History
CREATE TABLE IF NOT EXISTS event_playback_history (
    id UUID PRIMARY KEY,
    session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    track_title VARCHAR(255) NOT NULL,
    artist VARCHAR(255),
    source_type VARCHAR(32) NOT NULL,
    source_identifier VARCHAR(255),
    playlist_source VARCHAR(32) NOT NULL, -- 'DJ_DECK' or 'GUEST_REQUEST'
    requester_nickname VARCHAR(64),
    requested_start_seconds INTEGER DEFAULT 0,
    played_duration_seconds INTEGER DEFAULT 0,
    outcome VARCHAR(32) NOT NULL DEFAULT 'COMPLETED', -- 'COMPLETED', 'SKIPPED', 'FAILED'
    started_at TIMESTAMP WITH TIME ZONE NOT NULL,
    ended_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_playback_history_session ON event_playback_history(session_id, started_at);

-- 6. Visual Projection Templates
CREATE TABLE IF NOT EXISTS visual_templates (
    id UUID PRIMARY KEY,
    template_name VARCHAR(128) NOT NULL,
    event_type VARCHAR(64) DEFAULT 'PARTY',
    banner_title VARCHAR(255) NOT NULL,
    greeting_message VARCHAR(512),
    ticker_text VARCHAR(512),
    theme_preset VARCHAR(32) NOT NULL DEFAULT 'NOW_PLAYING',
    bg_type VARCHAR(32) NOT NULL DEFAULT 'ANIMATED_PATTERN',
    bg_media_url VARCHAR(512),
    bg_opacity NUMERIC(3, 2) DEFAULT 0.85,
    show_qr_code BOOLEAN DEFAULT TRUE,
    show_now_playing BOOLEAN DEFAULT TRUE,
    show_guest_announcements BOOLEAN DEFAULT TRUE,
    show_visualizer BOOLEAN DEFAULT TRUE,
    primary_color VARCHAR(32) DEFAULT '#06b6d4',
    accent_color VARCHAR(32) DEFAULT '#ec4899',
    font_family VARCHAR(64) DEFAULT 'sans-serif',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 7. Media Assets Storage (Videos, Backgrounds, Overlays)
CREATE TABLE IF NOT EXISTS media_assets (
    id UUID PRIMARY KEY,
    storage_key VARCHAR(512) NOT NULL UNIQUE,
    original_filename VARCHAR(255) NOT NULL,
    mime_type VARCHAR(64) NOT NULL,
    file_size_bytes BIGINT NOT NULL DEFAULT 0,
    asset_type VARCHAR(32) NOT NULL, -- 'BACKGROUND_VIDEO', 'IMAGE', 'LOGO'
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 8. Seed Sample Reusable DJ Sets into DJ Library
INSERT INTO dj_playlists (id, name, description, tags, genre, mood, event_type, estimated_duration_seconds, track_count)
VALUES
    ('a1111111-1111-1111-1111-111111111111', 'Warm-up Sunset Groove', 'Mellow build-up tracks to start the evening right', 'Warm-up, Sunset, Chill, House', 'Deep House', 'Relaxed', 'PARTY', 840, 3),
    ('b2222222-2222-2222-2222-222222222222', 'Peak Hour Party Anthems', 'High energy chart-toppers to pack the dance floor', 'Dance, Hits, Peak, EDM', 'Pop Dance', 'High Energy', 'PARTY', 1120, 4),
    ('c3333333-3333-3333-3333-333333333333', 'Bollywood Dance Dhamaka', 'Festive upbeat Bollywood hits for weddings and celebrations', 'Bollywood, Wedding, Desi, Dance', 'Bollywood', 'Celebratory', 'WEDDING', 980, 3)
ON CONFLICT (id) DO NOTHING;

INSERT INTO dj_playlist_tracks (id, playlist_id, title, artist, source_type, source_identifier, duration_seconds, start_seconds, transition_type, sort_order)
VALUES
    ('a1111111-1111-1111-1111-000000000001', 'a1111111-1111-1111-1111-111111111111', 'Calvin Harris - Summer', 'Calvin Harris', 'YOUTUBE', 'ebXbLfLACGM', 234, 0, 'CROSSFADE', 0),
    ('a1111111-1111-1111-1111-000000000002', 'a1111111-1111-1111-1111-111111111111', 'Dua Lipa - Levitating', 'Dua Lipa', 'YOUTUBE', 'TUVcZfQe-Kw', 203, 15, 'CROSSFADE', 1),
    ('a1111111-1111-1111-1111-000000000003', 'a1111111-1111-1111-1111-111111111111', 'The Weeknd - Blinding Lights', 'The Weeknd', 'YOUTUBE', '4NRXx6U8ABQ', 200, 0, 'CROSSFADE', 2),

    ('b2222222-2222-2222-2222-000000000001', 'b2222222-2222-2222-2222-222222222222', 'Avicii - Levels', 'Avicii', 'YOUTUBE', '_ovdm2yX4MA', 199, 30, 'CROSSFADE', 0),
    ('b2222222-2222-2222-2222-000000000002', 'b2222222-2222-2222-2222-222222222222', 'Daft Punk - One More Time', 'Daft Punk', 'YOUTUBE', 'F57P9C4SAW4', 320, 0, 'CROSSFADE', 1),
    ('b2222222-2222-2222-2222-000000000003', 'b2222222-2222-2222-2222-222222222222', 'Swedish House Mafia - Don''t You Worry Child', 'Swedish House Mafia', 'YOUTUBE', '2zToEPpFEN8', 212, 10, 'CROSSFADE', 2),
    ('b2222222-2222-2222-2222-000000000004', 'b2222222-2222-2222-2222-222222222222', 'Mark Ronson - Uptown Funk', 'Mark Ronson', 'YOUTUBE', 'OPf0YbXqDm0', 270, 0, 'CROSSFADE', 3),

    ('c3333333-3333-3333-3333-000000000001', 'c3333333-3333-3333-3333-333333333333', 'Luis Fonsi - Despacito', 'Luis Fonsi', 'YOUTUBE', 'kJQP7kiw5Fk', 281, 0, 'CROSSFADE', 0),
    ('c3333333-3333-3333-3333-000000000002', 'c3333333-3333-3333-3333-333333333333', 'Major Lazer - Lean On', 'Major Lazer', 'YOUTUBE', 'YqeW9_5kURI', 176, 12, 'CROSSFADE', 1),
    ('c3333333-3333-3333-3333-000000000003', 'c3333333-3333-3333-3333-333333333333', 'Queen - Bohemian Rhapsody', 'Queen', 'YOUTUBE', 'fJ9rUzIMcZQ', 359, 0, 'SEQUENTIAL', 2)
ON CONFLICT (id) DO NOTHING;

-- 9. Seed Visual Projection Templates
INSERT INTO visual_templates (id, template_name, event_type, banner_title, greeting_message, ticker_text, theme_preset, bg_type, primary_color, accent_color)
VALUES
    ('d4444444-4444-4444-4444-444444444441', 'Birthday Bash Glow', 'BIRTHDAY', '🎉 HAPPY BIRTHDAY! 🎉', 'Wishing you an unforgettable night of music & celebration!', 'Scan the QR code to request songs • Cake cutting coming up soon!', 'NOW_PLAYING', 'ANIMATED_PATTERN', '#ec4899', '#8b5cf6'),
    ('d4444444-4444-4444-4444-444444444442', 'Silver & Golden Anniversary', 'ANNIVERSARY', '🥂 Celebrating True Love 🥂', 'Here''s to endless love, laughter, and happily ever after', 'Send your special wishes & song requests using your phone!', 'WELCOME', 'GRADIENT', '#f59e0b', '#ec4899'),
    ('d4444444-4444-4444-4444-444444444443', 'Wedding Sangeet & Reception', 'WEDDING', '✨ Wedding Celebration ✨', 'Welcome family & friends! Tonight we dance till dawn!', 'Request your favorite tracks on the dance floor!', 'PARTY_VISUALS', 'ANIMATED_PATTERN', '#10b981', '#06b6d4'),
    ('d4444444-4444-4444-4444-444444444444', 'Bollywood Night Fever', 'BOLLYWOOD', '💃 BOLLYWOOD DANCE NIGHT 💃', 'Get ready for non-stop Desi beats & high voltage energy!', 'DJ Rahul on the decks • Submit your Bollywood requests!', 'NOW_PLAYING', 'ANIMATED_PATTERN', '#f97316', '#ec4899'),
    ('d4444444-4444-4444-4444-444444444445', 'Midnight Neon Club', 'PARTY', '⚡ VIRTUAL DJ LIVE ⚡', 'Electric atmosphere, precision mixing & crowd-powered queue', 'Live interactive jukebox active • Join the queue!', 'PARTY_VISUALS', 'ANIMATED_PATTERN', '#06b6d4', '#ec4899')
ON CONFLICT (id) DO NOTHING;
