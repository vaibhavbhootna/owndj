package com.owndj.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class GuestResponse {
    private UUID id;
    private String nickname;
    private String guestToken; // sent to guest upon joining
    private UUID sessionId;
    private String roomCode;
}
