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
public class LibraryTrackMatchDto {
    private UUID trackId;
    private UUID playlistId;
    private String playlistName;
    private String title;
    private String artist;
    private String album;
    private String sourceType;
    private String sourceIdentifier;
    private int durationSeconds;
    private int startSeconds;
    private String notes;
}
