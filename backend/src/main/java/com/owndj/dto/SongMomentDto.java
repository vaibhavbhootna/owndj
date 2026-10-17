package com.owndj.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SongMomentDto {
    private UUID id;
    private String videoId;
    private String label;
    private int startSeconds;
    private Integer endSeconds;
    private BigDecimal confidence;
    private String detectionMethod;
    private int score;
    private int upvotes;
    private boolean userVoted;
    private Instant createdAt;
}
