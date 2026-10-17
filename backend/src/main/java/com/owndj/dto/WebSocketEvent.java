package com.owndj.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class WebSocketEvent {
    private String type;
    private String roomCode;
    private Object payload;

    @Builder.Default
    private Instant timestamp = Instant.now();

    public static WebSocketEvent of(String type, String roomCode, Object payload) {
        return WebSocketEvent.builder()
                .type(type)
                .roomCode(roomCode)
                .payload(payload)
                .timestamp(Instant.now())
                .build();
    }
}
