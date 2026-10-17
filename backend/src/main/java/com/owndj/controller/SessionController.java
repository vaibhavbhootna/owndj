package com.owndj.controller;

import com.owndj.dto.*;
import com.owndj.model.SessionSettings;
import com.owndj.model.SessionStatus;
import com.owndj.service.QrCodeService;
import com.owndj.service.SessionService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import com.owndj.repository.EventPlaybackHistoryRepository;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/sessions")
@RequiredArgsConstructor
public class SessionController {

    private final SessionService sessionService;
    private final QrCodeService qrCodeService;
    private final EventPlaybackHistoryRepository historyRepository;

    @PostMapping
    public ResponseEntity<SessionResponse> createSession(@Valid @RequestBody CreateSessionRequest request) {
        SessionResponse response = sessionService.createSession(request);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/{roomCode}")
    public ResponseEntity<SessionResponse> getSession(
            @PathVariable String roomCode,
            @RequestHeader(value = "X-Host-Token", required = false) String hostToken) {
        SessionResponse response = sessionService.getSessionByRoomCode(roomCode, hostToken);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/{roomCode}/join")
    public ResponseEntity<GuestResponse> joinSession(
            @PathVariable String roomCode,
            @Valid @RequestBody JoinSessionRequest request) {
        GuestResponse response = sessionService.joinSession(roomCode, request);
        return ResponseEntity.ok(response);
    }

    @PatchMapping("/{roomCode}/settings")
    public ResponseEntity<SessionResponse> updateSettings(
            @PathVariable String roomCode,
            @RequestHeader("X-Host-Token") String hostToken,
            @RequestBody SessionSettings settings) {
        SessionResponse response = sessionService.updateSettings(roomCode, hostToken, settings);
        return ResponseEntity.ok(response);
    }

    @PatchMapping("/{roomCode}/status")
    public ResponseEntity<SessionResponse> updateStatus(
            @PathVariable String roomCode,
            @RequestHeader("X-Host-Token") String hostToken,
            @RequestBody Map<String, String> statusBody) {
        SessionStatus newStatus = SessionStatus.valueOf(statusBody.get("status").toUpperCase());
        SessionResponse response = sessionService.updateSessionStatus(roomCode, hostToken, newStatus);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/{roomCode}/qrcode")
    public ResponseEntity<Map<String, String>> getQrCodeDataUrl(@PathVariable String roomCode) {
        String joinUrl = qrCodeService.generateJoinUrl(roomCode);
        String dataUrl = qrCodeService.generateQrCodeDataUrl(joinUrl, 300, 300);
        return ResponseEntity.ok(Map.of("roomCode", roomCode, "joinUrl", joinUrl, "qrCodeDataUrl", dataUrl));
    }

    @PatchMapping("/{roomCode}/event")
    public ResponseEntity<SessionResponse> updateEventDetails(
            @PathVariable String roomCode,
            @RequestHeader("X-Host-Token") String hostToken,
            @RequestBody EventDetailsUpdateDto dto) {
        return ResponseEntity.ok(sessionService.updateEventDetails(roomCode, hostToken, dto));
    }

    @GetMapping("/{roomCode}/history")
    public ResponseEntity<List<EventPlaybackHistoryDto>> getHistory(@PathVariable String roomCode) {
        var session = sessionService.findSessionByRoomCode(roomCode);
        var list = historyRepository.findBySessionOrderByStartedAtDesc(session).stream()
                .map(h -> EventPlaybackHistoryDto.builder()
                        .id(h.getId())
                        .roomCode(roomCode)
                        .trackTitle(h.getTrackTitle())
                        .artist(h.getArtist())
                        .sourceType(h.getSourceType())
                        .sourceIdentifier(h.getSourceIdentifier())
                        .playlistSource(h.getPlaylistSource())
                        .requesterNickname(h.getRequesterNickname())
                        .requestedStartSeconds(h.getRequestedStartSeconds())
                        .playedDurationSeconds(h.getPlayedDurationSeconds())
                        .outcome(h.getOutcome())
                        .startedAt(h.getStartedAt())
                        .endedAt(h.getEndedAt())
                        .build())
                .toList();
        return ResponseEntity.ok(list);
    }
}
