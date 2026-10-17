package com.owndj.service;

import com.owndj.dto.WebSocketEvent;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

@Slf4j
@Service
@RequiredArgsConstructor
public class NotificationService {

    private final SimpMessagingTemplate messagingTemplate;

    public void broadcast(String roomCode, String eventType, Object payload) {
        String destination = "/topic/session/" + roomCode.toUpperCase();
        WebSocketEvent event = WebSocketEvent.of(eventType, roomCode, payload);
        log.debug("Broadcasting {} to destination {}", eventType, destination);
        messagingTemplate.convertAndSend(destination, event);
    }
}
