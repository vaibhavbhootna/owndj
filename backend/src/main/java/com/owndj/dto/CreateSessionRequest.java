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

    @Size(min = 3, max = 16, message = "Custom room code must be between 3 and 16 characters")
    private String customRoomCode;

    @Size(max = 32, message = "DJ passcode must be at most 32 characters")
    private String djPasscode;
}
