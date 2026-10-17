package com.owndj.dto;

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
public class EventPlaybackHistoryDto {
    private UUID id;
    private String roomCode;
    private String trackTitle;
    private String artist;
    private String sourceType;
    private String sourceIdentifier;
    private String playlistSource; // DJ_DECK, GUEST_REQUEST
    private String requesterNickname;
    private int requestedStartSeconds;
    private int playedDurationSeconds;
    private String outcome; // COMPLETED, SKIPPED, FAILED
    private Instant startedAt;
    private Instant endedAt;
}
