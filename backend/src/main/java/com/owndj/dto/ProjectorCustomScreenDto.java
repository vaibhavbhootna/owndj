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
    private String customScreenImageFit;
    private Integer customScreenImageScale;
    private Integer customScreenImageRotate;
    private Integer customScreenImagePosX;
    private Integer customScreenImagePosY;
    private Integer customScreenImageBrightness;
    private Integer customScreenImageContrast;
    private String customScreenImageBorder;
    private Boolean activateImmediately;
}
