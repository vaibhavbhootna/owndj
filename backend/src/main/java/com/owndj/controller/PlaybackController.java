package com.owndj.controller;

import com.owndj.dto.PlaybackStateDto;
import com.owndj.service.PlaybackCoordinationService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/sessions/{roomCode}/playback")
@RequiredArgsConstructor
public class PlaybackController {

    private final PlaybackCoordinationService playbackService;

    @PostMapping("/start")
    public ResponseEntity<PlaybackStateDto> startPlayback(
            @PathVariable String roomCode,
            @RequestHeader("X-Host-Token") String hostToken) {
        PlaybackStateDto state = playbackService.startOrAdvancePlayback(roomCode, hostToken);
        return ResponseEntity.ok(state);
    }

    @PostMapping("/skip")
    public ResponseEntity<PlaybackStateDto> skipTrack(
            @PathVariable String roomCode,
            @RequestHeader("X-Host-Token") String hostToken) {
        PlaybackStateDto state = playbackService.skipTrack(roomCode, hostToken);
        return ResponseEntity.ok(state);
    }

    @PostMapping("/pause")
    public ResponseEntity<PlaybackStateDto> pausePlayback(
            @PathVariable String roomCode,
            @RequestHeader("X-Host-Token") String hostToken) {
        PlaybackStateDto state = playbackService.pausePlayback(roomCode, hostToken);
        return ResponseEntity.ok(state);
    }

    @PostMapping("/resume")
    public ResponseEntity<PlaybackStateDto> resumePlayback(
            @PathVariable String roomCode,
            @RequestHeader("X-Host-Token") String hostToken) {
        PlaybackStateDto state = playbackService.resumePlayback(roomCode, hostToken);
        return ResponseEntity.ok(state);
    }

    @PostMapping("/complete")
    public ResponseEntity<PlaybackStateDto> completeSegment(
            @PathVariable String roomCode,
            @RequestHeader("X-Host-Token") String hostToken,
            @RequestBody Map<String, Object> body) {
        UUID requestId = body.get("requestId") != null ? UUID.fromString(body.get("requestId").toString()) : null;
        String transitionId = body.get("transitionId") != null ? body.get("transitionId").toString() : null;
        PlaybackStateDto state = playbackService.completeSegment(roomCode, hostToken, requestId, transitionId);
        return ResponseEntity.ok(state);
    }

    @PostMapping("/error")
    public ResponseEntity<PlaybackStateDto> handlePlayerError(
            @PathVariable String roomCode,
            @RequestHeader("X-Host-Token") String hostToken,
            @RequestBody Map<String, Object> body) {
        UUID requestId = body.get("requestId") != null ? UUID.fromString(body.get("requestId").toString()) : null;
        int errorCode = body.get("errorCode") != null ? Integer.parseInt(body.get("errorCode").toString()) : 0;
        String errorMessage = body.get("errorMessage") != null ? body.get("errorMessage").toString() : "Playback error";
        PlaybackStateDto state = playbackService.handlePlayerError(roomCode, hostToken, requestId, errorCode, errorMessage);
        return ResponseEntity.ok(state);
    }
}
