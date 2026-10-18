package com.owndj.controller;

import com.owndj.dto.EventDJTrackDto;
import com.owndj.dto.PlaybackStateDto;
import com.owndj.service.DJDeckService;
import com.owndj.service.PlaybackCoordinationService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/sessions/{roomCode}/deck")
@RequiredArgsConstructor
public class DJDeckController {

    private final DJDeckService djDeckService;
    private final PlaybackCoordinationService playbackService;

    @GetMapping
    public ResponseEntity<List<EventDJTrackDto>> getDeck(@PathVariable String roomCode) {
        return ResponseEntity.ok(djDeckService.getDeck(roomCode));
    }

    @PostMapping
    public ResponseEntity<EventDJTrackDto> addTrack(
            @PathVariable String roomCode,
            @RequestHeader("X-Host-Token") String hostToken,
            @RequestBody EventDJTrackDto dto) {
        return ResponseEntity.ok(djDeckService.addTrackToDeck(roomCode, hostToken, dto));
    }

    @PatchMapping("/{trackId}")
    public ResponseEntity<EventDJTrackDto> updateTrack(
            @PathVariable String roomCode,
            @PathVariable String trackId,
            @RequestHeader("X-Host-Token") String hostToken,
            @RequestBody EventDJTrackDto dto) {
        return ResponseEntity.ok(djDeckService.updateTrack(trackId, hostToken, dto));
    }

    @DeleteMapping("/{trackId}")
    public ResponseEntity<Void> removeTrack(
            @PathVariable String roomCode,
            @PathVariable String trackId,
            @RequestHeader("X-Host-Token") String hostToken) {
        djDeckService.removeTrack(trackId, hostToken);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/reorder")
    public ResponseEntity<List<EventDJTrackDto>> reorderDeck(
            @PathVariable String roomCode,
            @RequestHeader("X-Host-Token") String hostToken,
            @RequestBody Map<String, List<String>> payload) {
        List<String> trackIds = payload.getOrDefault("trackIds", List.of());
        return ResponseEntity.ok(djDeckService.reorderDeck(roomCode, hostToken, trackIds));
    }

    @PostMapping("/duration-all")
    public ResponseEntity<List<EventDJTrackDto>> setAllTracksDuration(
            @PathVariable String roomCode,
            @RequestHeader("X-Host-Token") String hostToken,
            @RequestBody Map<String, Integer> body) {
        int duration = body.getOrDefault("durationSeconds", 60);
        return ResponseEntity.ok(djDeckService.setAllTracksDuration(roomCode, hostToken, duration));
    }

    @PostMapping("/load-playlist")
    public ResponseEntity<List<EventDJTrackDto>> loadPlaylist(
            @PathVariable String roomCode,
            @RequestHeader("X-Host-Token") String hostToken,
            @RequestBody Map<String, Object> payload) {
        String playlistId = (String) payload.get("playlistId");
        boolean replaceExisting = Boolean.TRUE.equals(payload.get("replaceExisting"));
        return ResponseEntity.ok(djDeckService.loadPlaylistIntoDeck(roomCode, hostToken, playlistId, replaceExisting));
    }

    @PostMapping("/shuffle")
    public ResponseEntity<List<EventDJTrackDto>> shuffleDeck(
            @PathVariable String roomCode,
            @RequestHeader("X-Host-Token") String hostToken) {
        return ResponseEntity.ok(djDeckService.shuffleDeck(roomCode, hostToken));
    }

    @DeleteMapping
    public ResponseEntity<Void> clearDeck(
            @PathVariable String roomCode,
            @RequestHeader("X-Host-Token") String hostToken) {
        djDeckService.clearDeck(roomCode, hostToken);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{trackId}/play-now")
    public ResponseEntity<PlaybackStateDto> playTrackNow(
            @PathVariable String roomCode,
            @PathVariable String trackId,
            @RequestHeader("X-Host-Token") String hostToken) {
        return ResponseEntity.ok(playbackService.playSpecificDjTrack(roomCode, hostToken, trackId));
    }

    @PostMapping("/play-library-track/{playlistTrackId}")
    public ResponseEntity<PlaybackStateDto> playLibraryTrack(
            @PathVariable String roomCode,
            @PathVariable String playlistTrackId,
            @RequestHeader("X-Host-Token") String hostToken) {
        return ResponseEntity.ok(playbackService.playSinglePlaylistTrack(roomCode, hostToken, playlistTrackId));
    }

    @PostMapping("/import-youtube-playlist")
    public ResponseEntity<List<EventDJTrackDto>> importYouTubePlaylist(
            @PathVariable String roomCode,
            @RequestHeader("X-Host-Token") String hostToken,
            @RequestBody Map<String, Object> payload) {
        String playlistUrlOrId = (String) payload.get("playlistUrl");
        boolean replaceExisting = Boolean.TRUE.equals(payload.get("replaceExisting"));
        return ResponseEntity.ok(djDeckService.importYouTubePlaylist(roomCode, hostToken, playlistUrlOrId, replaceExisting));
    }

    @PostMapping("/import-youtube-csv")
    public ResponseEntity<List<EventDJTrackDto>> importYouTubeCsv(
            @PathVariable String roomCode,
            @RequestHeader("X-Host-Token") String hostToken,
            @RequestBody Map<String, Object> payload) {
        String csvContent = (String) payload.get("csvContent");
        boolean replaceExisting = Boolean.TRUE.equals(payload.get("replaceExisting"));
        return ResponseEntity.ok(djDeckService.importYouTubeCsv(roomCode, hostToken, csvContent, replaceExisting));
    }

    @PostMapping("/import-resolved")
    public ResponseEntity<List<EventDJTrackDto>> importResolved(
            @PathVariable String roomCode,
            @RequestHeader("X-Host-Token") String hostToken,
            @RequestBody Map<String, Object> payload) {
        List<Map<String, Object>> tracks = (List<Map<String, Object>>) payload.get("tracks");
        boolean replaceExisting = Boolean.TRUE.equals(payload.get("replaceExisting"));
        return ResponseEntity.ok(djDeckService.importResolvedTracks(roomCode, hostToken, tracks, replaceExisting));
    }

    @GetMapping("/universal-search")
    public ResponseEntity<com.owndj.dto.UniversalSearchResponseDto> universalSearch(
            @PathVariable String roomCode,
            @RequestParam(value = "q", defaultValue = "") String query) {
        return ResponseEntity.ok(djDeckService.universalSearch(roomCode, query));
    }
}
