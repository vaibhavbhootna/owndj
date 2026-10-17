package com.owndj.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DJPlaylistDto {
    private UUID id;
    private String name;
    private String description;
    private String tags;
    private String genre;
    private String mood;
    private String eventType;
    private int estimatedDurationSeconds;
    private int trackCount;
    private Instant createdAt;
    private Instant updatedAt;
    @Builder.Default
    private List<DJPlaylistTrackDto> tracks = new ArrayList<>();
}
