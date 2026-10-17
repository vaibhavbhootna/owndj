package com.owndj.model;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "song_moments")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SongMoment {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "song_id", nullable = false)
    private Song song;

    @Column(nullable = false, length = 64)
    private String label; // Intro, Verse, Pre-chorus, Chorus, Main hook, Beat drop, Bridge, Outro, High-energy section

    @Column(name = "start_seconds", nullable = false)
    private int startSeconds;

    @Column(name = "end_seconds")
    private Integer endSeconds;

    @Column(nullable = false, precision = 5, scale = 2)
    @Builder.Default
    private BigDecimal confidence = BigDecimal.valueOf(1.0);

    @Column(name = "detection_method", nullable = false, length = 32)
    @Builder.Default
    private String detectionMethod = "MANUAL"; // MANUAL, CROWD, AUDIO_ANALYSIS

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;
}
