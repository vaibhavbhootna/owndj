package com.owndj.model;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "song_requests")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SongRequest {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "session_id", nullable = false)
    private Session session;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "guest_id", nullable = false)
    private Guest guest;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "song_id", nullable = false)
    private Song song;

    @Column(name = "requested_start_seconds", nullable = false)
    @Builder.Default
    private int requestedStartSeconds = 0;

    @Column(name = "requested_duration_seconds", nullable = false)
    @Builder.Default
    private int requestedDurationSeconds = 60;

    @Column(name = "requested_end_seconds", nullable = false)
    @Builder.Default
    private int requestedEndSeconds = 60;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 32)
    @Builder.Default
    private RequestStatus status = RequestStatus.PENDING;

    @Column(name = "queue_position", nullable = false)
    @Builder.Default
    private int queuePosition = 0;

    @Column(name = "requested_source_preference", length = 32)
    @Builder.Default
    private String requestedSourcePreference = "AUTO";

    @Column(name = "selected_source_type", length = 32)
    @Builder.Default
    private String selectedSourceType = "YOUTUBE";

    @Column(name = "selected_source_id", length = 128)
    private String selectedSourceId;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "approved_at")
    private Instant approvedAt;

    @Column(name = "started_at")
    private Instant startedAt;

    @Column(name = "completed_at")
    private Instant completedAt;
}
