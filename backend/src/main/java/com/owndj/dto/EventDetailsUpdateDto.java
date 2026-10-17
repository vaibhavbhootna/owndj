package com.owndj.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class EventDetailsUpdateDto {
    private String name;
    private String eventType;
    private String venue;
    private String eventDate;
    private String startTime;
    private String endTime;
    private String description;
    private String themeColor;
    private String bannerText;
    private String activeVisualPreset;
    private String tickerText;
    private Boolean deckRepeat;
    private Boolean deckShuffle;
    private Boolean guestRequestsPaused;
    private Integer requestCooldownSeconds;
}
