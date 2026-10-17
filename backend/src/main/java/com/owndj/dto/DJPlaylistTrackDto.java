package com.owndj.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DJPlaylistTrackDto {
    private UUID id;
    private UUID playlistId;
    private String title;
    private String artist;
    private String album;
    private String sourceType; // YOUTUBE, LOCAL_MP3
    private String sourceIdentifier;
    private int durationSeconds;
    private int startSeconds;
    private String transitionType; // CROSSFADE, SEQUENTIAL, CUT
    private int transitionDurationSeconds;
    private boolean isFavorite;
    private String notes;
    private int sortOrder;
}
