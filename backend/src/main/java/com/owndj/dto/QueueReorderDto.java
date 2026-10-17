package com.owndj.dto;

import jakarta.validation.constraints.NotEmpty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class QueueReorderDto {
    @NotEmpty(message = "Request IDs cannot be empty")
    private List<UUID> requestIds;
}
