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
public class CreateMomentDto {
    @NotBlank(message = "Label is required")
    private String label; // Intro, Verse, Pre-chorus, Chorus, Main hook, Beat drop, Bridge, Outro, High-energy section

    @Min(value = 0, message = "Start seconds must be non-negative")
    private int startSeconds;

    private Integer endSeconds;

    private String detectionMethod; // MANUAL, CROWD, AUDIO_ANALYSIS
}
