package com.owndj.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CreateSessionRequest {
    @NotBlank(message = "Session name cannot be blank")
    @Size(min = 2, max = 64, message = "Session name must be between 2 and 64 characters")
    private String name;
}
