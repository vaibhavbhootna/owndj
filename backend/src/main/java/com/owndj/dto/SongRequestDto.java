package com.owndj.dto;

import com.owndj.model.RequestStatus;
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
public class SongRequestDto {
    private UUID id;
    private SongDto song;
    private String guestNickname;
    private UUID guestId;
    private int requestedStartSeconds;
    private int requestedDurationSeconds;
    private int requestedEndSeconds;
    private RequestStatus status;
    private int queuePosition;
    private int votes;
    private boolean userVoted;
    private boolean isDuplicate;
    private Instant createdAt;
    private Instant approvedAt;
    private Instant startedAt;
    private Instant completedAt;
    private String selectedSourceType;
    private String selectedSourceId;
}
