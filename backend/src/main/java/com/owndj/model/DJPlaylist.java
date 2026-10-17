package com.owndj.model;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "dj_playlists")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DJPlaylist {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false, length = 128)
    private String name;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(length = 255)
    private String tags;

    @Column(length = 64)
    private String genre;

    @Column(length = 64)
    private String mood;

    @Column(name = "event_type", length = 64)
    private String eventType;

    @Column(name = "estimated_duration_seconds", nullable = false)
    @Builder.Default
    private Integer estimatedDurationSeconds = 0;

    @Column(name = "track_count", nullable = false)
    @Builder.Default
    private Integer trackCount = 0;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @OneToMany(mappedBy = "playlist", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("sortOrder ASC")
    @Builder.Default
    private List<DJPlaylistTrack> tracks = new ArrayList<>();
}
