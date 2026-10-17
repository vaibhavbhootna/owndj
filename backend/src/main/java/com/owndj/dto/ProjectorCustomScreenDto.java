package com.owndj.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ProjectorCustomScreenDto {
    private String customScreenImageUrl;
    private String customScreenTitle;
    private String customScreenSubtitle;
    private String customScreenTag;
    private String customScreenLayout; // SPLIT, BACKGROUND, CENTER
    private Boolean customScreenShowQr;
    private Boolean customScreenShowNowPlaying;
    private Boolean activateImmediately;
}
