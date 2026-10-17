package com.owndj.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Collections;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UniversalSearchResponseDto {
    private String query;
    @Builder.Default
    private List<EventDJTrackDto> eventDeckMatches = Collections.emptyList();
    @Builder.Default
    private List<LibraryTrackMatchDto> librarySetMatches = Collections.emptyList();
    @Builder.Default
    private List<SongDto> localMusicMatches = Collections.emptyList();
    @Builder.Default
    private List<SongSearchResult> youTubeMatches = Collections.emptyList();
    private int totalMatches;
}
