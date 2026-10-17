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
public class JoinSessionRequest {
    @NotBlank(message = "Nickname cannot be blank")
    @Size(min = 2, max = 32, message = "Nickname must be between 2 and 32 characters")
    private String nickname;
}
