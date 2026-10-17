-- V2__local_music_library.sql
-- Migration for Local Music Library, LocalAudioAsset, YouTubeSource and Unified Song Model

-- 1. Extend songs table with normalized metadata fields
ALTER TABLE songs ADD COLUMN IF NOT EXISTS artist VARCHAR(255);
ALTER TABLE songs ADD COLUMN IF NOT EXISTS normalized_title VARCHAR(255);
ALTER TABLE songs ADD COLUMN IF NOT EXISTS normalized_artist VARCHAR(255);
ALTER TABLE songs ADD COLUMN IF NOT EXISTS album VARCHAR(255);
ALTER TABLE songs ADD COLUMN IF NOT EXISTS metadata_source VARCHAR(32) DEFAULT 'YOUTUBE';
ALTER TABLE songs ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE songs ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;

-- Update existing songs to have normalized titles
UPDATE songs SET
    normalized_title = LOWER(REGEXP_REPLACE(title, '[^a-zA-Z0-9 ]', '', 'g')),
    normalized_artist = LOWER(REGEXP_REPLACE(COALESCE(channel_title, ''), '[^a-zA-Z0-9 ]', '', 'g')),
    artist = channel_title
WHERE normalized_title IS NULL;

CREATE INDEX IF NOT EXISTS idx_songs_normalized_title ON songs(normalized_title);
CREATE INDEX IF NOT EXISTS idx_songs_normalized_artist ON songs(normalized_artist);
CREATE INDEX IF NOT EXISTS idx_songs_metadata_source ON songs(metadata_source);

-- 2. Local Audio Assets table (storing storage keys, checksums, format info, no binary in DB)
CREATE TABLE IF NOT EXISTS local_audio_assets (
    id UUID PRIMARY KEY,
    song_id UUID NOT NULL REFERENCES songs(id) ON DELETE CASCADE,
    storage_key VARCHAR(512) NOT NULL UNIQUE,
    original_filename VARCHAR(255) NOT NULL,
    file_size_bytes BIGINT NOT NULL DEFAULT 0,
    mime_type VARCHAR(64) NOT NULL DEFAULT 'audio/mpeg',
    duration_seconds INTEGER NOT NULL DEFAULT 0,
    audio_fingerprint VARCHAR(255),
    checksum VARCHAR(64) NOT NULL,
    availability_status VARCHAR(32) NOT NULL DEFAULT 'AVAILABLE',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_local_assets_song_id ON local_audio_assets(song_id);
CREATE INDEX IF NOT EXISTS idx_local_assets_checksum ON local_audio_assets(checksum);
CREATE INDEX IF NOT EXISTS idx_local_assets_status ON local_audio_assets(availability_status);

-- 3. YouTube Sources table (linked to the logical song)
CREATE TABLE IF NOT EXISTS youtube_sources (
    id UUID PRIMARY KEY,
    song_id UUID NOT NULL REFERENCES songs(id) ON DELETE CASCADE,
    youtube_video_id VARCHAR(64) NOT NULL UNIQUE,
    title VARCHAR(255) NOT NULL,
    channel_title VARCHAR(255),
    thumbnail_url VARCHAR(512),
    duration_seconds INTEGER NOT NULL DEFAULT 0,
    availability_status VARCHAR(32) NOT NULL DEFAULT 'AVAILABLE',
    verified_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_youtube_sources_song_id ON youtube_sources(song_id);
CREATE INDEX IF NOT EXISTS idx_youtube_sources_video_id ON youtube_sources(youtube_video_id);

-- Backfill youtube_sources from existing songs
INSERT INTO youtube_sources (id, song_id, youtube_video_id, title, channel_title, thumbnail_url, duration_seconds, availability_status, verified_at)
SELECT
    gen_random_uuid(),
    s.id,
    s.youtube_video_id,
    s.title,
    s.channel_title,
    s.thumbnail_url,
    s.duration_seconds,
    'AVAILABLE',
    s.metadata_updated_at
FROM songs s
WHERE s.youtube_video_id IS NOT NULL
ON CONFLICT (youtube_video_id) DO NOTHING;

-- 4. Extend song_requests with source selection fields
ALTER TABLE song_requests ADD COLUMN IF NOT EXISTS requested_source_preference VARCHAR(32) DEFAULT 'AUTO';
ALTER TABLE song_requests ADD COLUMN IF NOT EXISTS selected_source_type VARCHAR(32) DEFAULT 'YOUTUBE';
ALTER TABLE song_requests ADD COLUMN IF NOT EXISTS selected_source_id VARCHAR(128);
ALTER TABLE song_requests ADD COLUMN IF NOT EXISTS local_asset_id UUID REFERENCES local_audio_assets(id) ON DELETE SET NULL;
ALTER TABLE song_requests ADD COLUMN IF NOT EXISTS youtube_source_id UUID REFERENCES youtube_sources(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_song_requests_source_type ON song_requests(selected_source_type);
