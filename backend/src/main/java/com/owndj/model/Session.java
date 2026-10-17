package com.owndj.model;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "sessions")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Session {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "room_code", unique = true, nullable = false, length = 16)
    private String roomCode;

    @Column(nullable = false, length = 128)
    private String name;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 32)
    @Builder.Default
    private SessionStatus status = SessionStatus.CREATED;

    @Column(name = "host_session_token_hash", nullable = false, length = 128)
    private String hostSessionTokenHash;

    @Column(name = "settings_json", nullable = false, columnDefinition = "TEXT")
    private String settingsJson;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "started_at")
    private Instant startedAt;

    @Column(name = "ended_at")
    private Instant endedAt;

    // Event Setup & Display Settings
    @Column(name = "event_type", length = 64)
    @Builder.Default
    private String eventType = "PARTY";

    @Column(name = "venue", length = 255)
    private String venue;

    @Column(name = "event_date", length = 64)
    private String eventDate;

    @Column(name = "start_time", length = 32)
    private String startTime;

    @Column(name = "end_time", length = 32)
    private String endTime;

    @Column(name = "description", columnDefinition = "TEXT")
    private String description;

    @Column(name = "theme_color", length = 32)
    @Builder.Default
    private String themeColor = "#06b6d4";

    @Column(name = "banner_text", length = 255)
    @Builder.Default
    private String bannerText = "Welcome to the Party!";

    @Column(name = "active_visual_preset", length = 32)
    @Builder.Default
    private String activeVisualPreset = "NOW_PLAYING";

    @Column(name = "ticker_text", length = 512)
    @Builder.Default
    private String tickerText = "Scan the QR code to request songs!";

    // DJ Deck State & Playback Rules
    @Column(name = "current_dj_track_index")
    @Builder.Default
    private Integer currentDjTrackIndex = 0;

    @Column(name = "deck_repeat")
    @Builder.Default
    private Boolean deckRepeat = true;

    @Column(name = "deck_shuffle")
    @Builder.Default
    private Boolean deckShuffle = false;

    @Column(name = "guest_requests_paused")
    @Builder.Default
    private Boolean guestRequestsPaused = false;

    @Column(name = "request_cooldown_seconds")
    @Builder.Default
    private Integer requestCooldownSeconds = 30;

    private static final ObjectMapper OBJECT_MAPPER = new ObjectMapper();

    @Transient
    public SessionSettings getSettings() {
        if (settingsJson == null || settingsJson.isBlank()) {
            return new SessionSettings();
        }
        try {
            return OBJECT_MAPPER.readValue(settingsJson, SessionSettings.class);
        } catch (Exception e) {
            return new SessionSettings();
        }
    }

    public void setSettings(SessionSettings settings) {
        try {
            this.settingsJson = OBJECT_MAPPER.writeValueAsString(settings);
        } catch (JsonProcessingException e) {
            this.settingsJson = "{}";
        }
    }
}
