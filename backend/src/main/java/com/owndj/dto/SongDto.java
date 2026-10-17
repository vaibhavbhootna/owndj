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
public class SongDto {
    private UUID id;
    private String youtubeVideoId;
    private String title;
    private String channelTitle;
    private String thumbnailUrl;
    private int durationSeconds;
    private String embeddableStatus;
}
