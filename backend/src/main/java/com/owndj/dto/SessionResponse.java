package com.owndj.dto;

import com.owndj.model.SessionSettings;
import com.owndj.model.SessionStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SessionResponse {
    private UUID id;
    private String roomCode;
    private String name;
    private SessionStatus status;
    private String hostToken; // only present on session creation
    private SessionSettings settings;
    private long guestCount;
    private SongRequestDto currentTrack;
    private Instant createdAt;
    private Instant startedAt;
    private Instant endedAt;

    // Event & Projection Settings
    private String eventType;
    private String venue;
    private String eventDate;
    private String startTime;
    private String endTime;
    private String description;
    private String themeColor;
    private String bannerText;
    private String activeVisualPreset;
    private String tickerText;
    private String customScreenImageUrl;
    private String customScreenTitle;
    private String customScreenSubtitle;
    private String customScreenTag;
    private String customScreenLayout;
    private boolean customScreenShowQr;
    private boolean customScreenShowNowPlaying;

    // DJ Deck state
    private int currentDjTrackIndex;
    private boolean deckRepeat;
    private boolean deckShuffle;
    private boolean guestRequestsPaused;
    private int requestCooldownSeconds;
}
