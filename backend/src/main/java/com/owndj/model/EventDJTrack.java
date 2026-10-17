package com.owndj.model;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "event_dj_tracks")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class EventDJTrack {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "session_id", nullable = false)
    @JsonIgnore
    private Session session;

    @Column(nullable = false, length = 255)
    private String title;

    @Column(length = 255)
    private String artist;

    @Column(length = 255)
    private String album;

    @Column(name = "source_type", nullable = false, length = 32)
    @Builder.Default
    private String sourceType = "YOUTUBE"; // YOUTUBE, LOCAL_MP3

    @Column(name = "source_identifier", nullable = false, length = 255)
    private String sourceIdentifier;

    @Column(name = "duration_seconds", nullable = false)
    @Builder.Default
    private Integer durationSeconds = 0;

    @Column(name = "start_seconds", nullable = false)
    @Builder.Default
    private Integer startSeconds = 0;

    @Column(name = "transition_type", nullable = false, length = 32)
    @Builder.Default
    private String transitionType = "CROSSFADE"; // CROSSFADE, SEQUENTIAL, CUT

    @Column(name = "transition_duration_seconds", nullable = false)
    @Builder.Default
    private Integer transitionDurationSeconds = 5;

    @Column(name = "is_favorite", nullable = false)
    @Builder.Default
    private Boolean isFavorite = false;

    @Column(columnDefinition = "TEXT")
    private String notes;

    @Column(name = "sort_order", nullable = false)
    @Builder.Default
    private Integer sortOrder = 0;

    @Column(name = "playback_status", nullable = false, length = 32)
    @Builder.Default
    private String playbackStatus = "UNPLAYED"; // UNPLAYED, PLAYING, PLAYED, SKIPPED

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;
}
