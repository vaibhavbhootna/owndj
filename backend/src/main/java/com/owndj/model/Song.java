package com.owndj.model;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "songs")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Song {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "youtube_video_id", unique = true, nullable = false, length = 64)
    private String youtubeVideoId;

    @Column(nullable = false, length = 255)
    private String title;

    @Column(name = "channel_title", length = 255)
    private String channelTitle;

    @Column(name = "thumbnail_url", length = 512)
    private String thumbnailUrl;

    @Column(name = "duration_seconds", nullable = false)
    @Builder.Default
    private int durationSeconds = 0;

    @Column(name = "embeddable_status", nullable = false, length = 32)
    @Builder.Default
    private String embeddableStatus = "EMBEDDABLE";

    @UpdateTimestamp
    @Column(name = "metadata_updated_at", nullable = false)
    private Instant metadataUpdatedAt;
}
