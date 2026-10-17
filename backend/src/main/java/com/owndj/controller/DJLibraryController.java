package com.owndj.controller;

import com.owndj.dto.DJPlaylistDto;
import com.owndj.dto.DJPlaylistTrackDto;
import com.owndj.service.DJLibraryService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/dj/playlists")
@RequiredArgsConstructor
public class DJLibraryController {

    private final DJLibraryService djLibraryService;

    @GetMapping
    public ResponseEntity<List<DJPlaylistDto>> listPlaylists(@RequestParam(required = false) String eventType) {
        return ResponseEntity.ok(djLibraryService.listPlaylists(eventType));
    }

    @GetMapping("/{playlistId}")
    public ResponseEntity<DJPlaylistDto> getPlaylist(@PathVariable String playlistId) {
        return ResponseEntity.ok(djLibraryService.getPlaylist(playlistId));
    }

    @PostMapping
    public ResponseEntity<DJPlaylistDto> createPlaylist(@RequestBody DJPlaylistDto dto) {
        return ResponseEntity.ok(djLibraryService.createPlaylist(dto));
    }

    @PostMapping("/save-deck")
    public ResponseEntity<DJPlaylistDto> saveDeckAsPlaylist(
            @RequestParam String roomCode,
            @RequestHeader("X-Host-Token") String hostToken,
            @RequestBody Map<String, String> payload) {
        String name = payload.get("name");
        String description = payload.get("description");
        String eventType = payload.get("eventType");
        return ResponseEntity.ok(djLibraryService.saveDeckAsPlaylist(roomCode, hostToken, name, description, eventType));
    }

    @PutMapping("/{playlistId}")
    public ResponseEntity<DJPlaylistDto> updatePlaylist(
            @PathVariable String playlistId,
            @RequestBody DJPlaylistDto dto) {
        return ResponseEntity.ok(djLibraryService.updatePlaylist(playlistId, dto));
    }

    @PostMapping("/{playlistId}/duplicate")
    public ResponseEntity<DJPlaylistDto> duplicatePlaylist(
            @PathVariable String playlistId,
            @RequestBody(required = false) Map<String, String> payload) {
        String newName = payload != null ? payload.get("name") : null;
        return ResponseEntity.ok(djLibraryService.duplicatePlaylist(playlistId, newName));
    }

    @DeleteMapping("/{playlistId}")
    public ResponseEntity<Void> deletePlaylist(@PathVariable String playlistId) {
        djLibraryService.deletePlaylist(playlistId);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{playlistId}/tracks")
    public ResponseEntity<DJPlaylistDto> addTrackToPlaylist(
            @PathVariable String playlistId,
            @RequestBody DJPlaylistTrackDto dto) {
        return ResponseEntity.ok(djLibraryService.addTrackToPlaylist(playlistId, dto));
    }

    @DeleteMapping("/{playlistId}/tracks/{trackId}")
    public ResponseEntity<DJPlaylistDto> removeTrackFromPlaylist(
            @PathVariable String playlistId,
            @PathVariable String trackId) {
        return ResponseEntity.ok(djLibraryService.removeTrackFromPlaylist(playlistId, trackId));
    }
}
