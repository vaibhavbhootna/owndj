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
public class SongSearchResult {
    private String videoId;
    private String title;
    private String channelTitle;
    private String thumbnailUrl;
    private int durationSeconds;
    private boolean embeddable;
}
