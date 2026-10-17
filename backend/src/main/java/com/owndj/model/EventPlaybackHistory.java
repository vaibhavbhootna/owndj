package com.owndj.model;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "event_playback_history")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class EventPlaybackHistory {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "session_id", nullable = false)
    @JsonIgnore
    private Session session;

    @Column(name = "track_title", nullable = false, length = 255)
    private String trackTitle;

    @Column(length = 255)
    private String artist;

    @Column(name = "source_type", nullable = false, length = 32)
    private String sourceType; // YOUTUBE, LOCAL_MP3

    @Column(name = "source_identifier", length = 255)
    private String sourceIdentifier;

    @Column(name = "playlist_source", nullable = false, length = 32)
    private String playlistSource; // DJ_DECK, GUEST_REQUEST

    @Column(name = "requester_nickname", length = 64)
    private String requesterNickname;

    @Column(name = "requested_start_seconds")
    @Builder.Default
    private Integer requestedStartSeconds = 0;

    @Column(name = "played_duration_seconds")
    @Builder.Default
    private Integer playedDurationSeconds = 0;

    @Column(nullable = false, length = 32)
    @Builder.Default
    private String outcome = "COMPLETED"; // COMPLETED, SKIPPED, FAILED

    @CreationTimestamp
    @Column(name = "started_at", nullable = false)
    private Instant startedAt;

    @Column(name = "ended_at")
    private Instant endedAt;
}
