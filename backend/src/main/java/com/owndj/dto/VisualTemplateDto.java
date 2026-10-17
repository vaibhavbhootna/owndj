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
public class VisualTemplateDto {
    private UUID id;
    private String templateName;
    private String eventType;
    private String bannerTitle;
    private String greetingMessage;
    private String tickerText;
    private String themePreset;
    private String bgType;
    private String bgMediaUrl;
    private double bgOpacity;
    private boolean showQrCode;
    private boolean showNowPlaying;
    private boolean showGuestAnnouncements;
    private boolean showVisualizer;
    private String primaryColor;
    private String accentColor;
    private String fontFamily;
}
