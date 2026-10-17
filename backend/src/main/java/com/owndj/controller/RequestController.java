package com.owndj.controller;

import com.owndj.dto.CreateSongRequestDto;
import com.owndj.dto.QueueReorderDto;
import com.owndj.dto.SongRequestDto;
import com.owndj.service.QueueService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class RequestController {

    private final QueueService queueService;

    @PostMapping("/sessions/{roomCode}/requests")
    public ResponseEntity<SongRequestDto> submitRequest(
            @PathVariable String roomCode,
            @RequestHeader("X-Guest-Token") String guestToken,
            @Valid @RequestBody CreateSongRequestDto dto) {
        SongRequestDto response = queueService.submitRequest(roomCode, guestToken, dto);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/sessions/{roomCode}/queue")
    public ResponseEntity<List<SongRequestDto>> getQueue(
            @PathVariable String roomCode,
            @RequestHeader(value = "X-Guest-Id", required = false) UUID guestId) {
        List<SongRequestDto> queue = queueService.getQueue(roomCode, guestId);
        return ResponseEntity.ok(queue);
    }

    @PatchMapping("/requests/{requestId}/approve")
    public ResponseEntity<SongRequestDto> approveRequest(
            @PathVariable UUID requestId,
            @RequestHeader("X-Host-Token") String hostToken) {
        SongRequestDto response = queueService.approveRequest(requestId, hostToken);
        return ResponseEntity.ok(response);
    }

    @PatchMapping("/requests/{requestId}/reject")
    public ResponseEntity<SongRequestDto> rejectRequest(
            @PathVariable UUID requestId,
            @RequestHeader("X-Host-Token") String hostToken) {
        SongRequestDto response = queueService.rejectRequest(requestId, hostToken);
        return ResponseEntity.ok(response);
    }

    @DeleteMapping("/requests/{requestId}")
    public ResponseEntity<Map<String, String>> removeRequest(
            @PathVariable UUID requestId,
            @RequestHeader(value = "X-Host-Token", required = false) String hostToken,
            @RequestHeader(value = "X-Guest-Token", required = false) String guestToken) {
        queueService.removeRequest(requestId, hostToken, guestToken);
        return ResponseEntity.ok(Map.of("message", "Request removed"));
    }

    @PostMapping("/sessions/{roomCode}/queue/reorder")
    public ResponseEntity<List<SongRequestDto>> reorderQueue(
            @PathVariable String roomCode,
            @RequestHeader("X-Host-Token") String hostToken,
            @Valid @RequestBody QueueReorderDto dto) {
        List<SongRequestDto> updated = queueService.reorderQueue(roomCode, hostToken, dto.getRequestIds());
        return ResponseEntity.ok(updated);
    }

    @PostMapping("/requests/{requestId}/vote")
    public ResponseEntity<Map<String, Object>> voteRequest(
            @PathVariable UUID requestId,
            @RequestHeader("X-Guest-Token") String guestToken) {
        int score = queueService.voteRequest(requestId, guestToken);
        return ResponseEntity.ok(Map.of("requestId", requestId, "votes", score));
    }
}
