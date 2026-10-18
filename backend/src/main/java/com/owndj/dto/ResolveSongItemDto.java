package com.owndj.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ResolveSongItemDto {
    private String id;
    private String originalInput;
    private String parsedQuery;
    private String inputType; // SEARCH_URL, DIRECT_VIDEO, QUERY
    private String status;    // AUTO_RESOLVED, NEEDS_SELECTION, NO_MATCH
    private String confidence;// HIGH, MEDIUM, LOW
    private SongSearchResult selectedMatch;
    private List<SongSearchResult> candidates;
    private String notes;
}
