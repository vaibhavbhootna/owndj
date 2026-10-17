package com.owndj.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PlaybackStateDto {
    private String status; // IDLE, LOADING, READY, PLAYING, PAUSED, TRANSITIONING, ENDED, ERROR
    private SongRequestDto currentTrack;
    private double currentPositionSeconds;
    private int volume;
    private boolean autoAdvance;
    private String transitionId;
    private String errorMessage;
    private String playlistSource; // GUEST_REQUEST, DJ_DECK
    private String djDeckTrackId;
    private String activeVisualPreset;
    private String tickerText;
}
