package com.owndj.model;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonIgnoreProperties(ignoreUnknown = true)
public class SessionSettings {
    @Builder.Default
    private int defaultSongDurationSeconds = 60; // 30, 45, 60, or 0 (full)

    @Builder.Default
    private int defaultTransitionDurationSeconds = 3; // 0, 3, 5, 8, 10

    @Builder.Default
    private boolean autoApproveRequests = true;

    @Builder.Default
    private int maxPendingRequestsPerGuest = 3;

    @Builder.Default
    private boolean allowGuestVoting = true;

    @Builder.Default
    private boolean allowCustomTimestamps = true;

    @Builder.Default
    private boolean allowFullSongs = false;

    @Builder.Default
    private boolean allowRepeatedSongs = false;

    @Builder.Default
    private boolean djDeterminesDuration = false;

    @Builder.Default
    private boolean autoAdvance = true;

    @Builder.Default
    private int requestTransitionDelaySeconds = 15; // 0 (immediate), 10, 15, 20, 30
}
