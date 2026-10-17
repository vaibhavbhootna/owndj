package com.owndj.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CreateSongRequestDto {
    @NotBlank(message = "YouTube video ID is required")
    private String videoId;

    @NotBlank(message = "Song title is required")
    private String title;

    private String channelTitle;
    private String thumbnailUrl;

    @Min(value = 1, message = "Duration must be greater than 0")
    private int durationSeconds;

    @Min(value = 0, message = "Start seconds must be non-negative")
    private int requestedStartSeconds;

    @Min(value = 5, message = "Duration must be at least 5 seconds")
    private int requestedDurationSeconds;
}
