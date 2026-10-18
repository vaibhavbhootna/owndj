package com.owndj.controller;

import com.owndj.dto.DJPlaylistDto;
import com.owndj.dto.EventDJTrackDto;
import com.owndj.service.PlaylistExportImportService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class PlaylistExportImportController {

    private final PlaylistExportImportService exportImportService;

    @GetMapping("/sessions/{roomCode}/export/deck")
    public ResponseEntity<String> exportDeck(
            @PathVariable String roomCode,
            @RequestParam(defaultValue = "JSON") String format) {
        String exported = exportImportService.exportDjDeck(roomCode, format);
        return formatExportResponse(exported, format, "owndj_deck_" + roomCode);
    }

    @GetMapping("/sessions/{roomCode}/export/requests")
    public ResponseEntity<String> exportRequests(
            @PathVariable String roomCode,
            @RequestParam(required = false) String statusFilter,
            @RequestParam(defaultValue = "JSON") String format) {
        String exported = exportImportService.exportGuestRequests(roomCode, statusFilter, format);
        return formatExportResponse(exported, format, "owndj_requests_" + roomCode);
    }

    @GetMapping("/sessions/{roomCode}/export/history")
    public ResponseEntity<String> exportHistory(
            @PathVariable String roomCode,
            @RequestParam(defaultValue = "JSON") String format) {
        String exported = exportImportService.exportEventHistory(roomCode, format);
        return formatExportResponse(exported, format, "owndj_history_" + roomCode);
    }

    @PostMapping("/dj/playlists/import")
    public ResponseEntity<DJPlaylistDto> importIntoLibrary(
            @RequestBody Map<String, String> payload) {
        String name = payload.get("name");
        String content = payload.get("content");
        String format = payload.getOrDefault("format", "JSON");
        return ResponseEntity.ok(exportImportService.importIntoDjLibrary(name, content, format));
    }

    @PostMapping("/dj/playlists/import-resolved")
    public ResponseEntity<DJPlaylistDto> importResolvedIntoLibrary(
            @RequestBody Map<String, Object> payload) {
        String name = (String) payload.get("name");
        List<Map<String, Object>> tracks = (List<Map<String, Object>>) payload.get("tracks");
        return ResponseEntity.ok(exportImportService.importResolvedIntoLibrary(name, tracks));
    }

    @PostMapping("/sessions/{roomCode}/import/deck")
    public ResponseEntity<List<EventDJTrackDto>> importIntoDeck(
            @PathVariable String roomCode,
            @RequestHeader("X-Host-Token") String hostToken,
            @RequestBody Map<String, Object> payload) {
        String content = (String) payload.get("content");
        String format = (String) payload.getOrDefault("format", "JSON");
        boolean replaceExisting = Boolean.TRUE.equals(payload.get("replaceExisting"));
        return ResponseEntity.ok(exportImportService.importIntoEventDeck(roomCode, hostToken, content, format, replaceExisting));
    }

    private ResponseEntity<String> formatExportResponse(String data, String format, String filenameBase) {
        HttpHeaders headers = new HttpHeaders();
        switch (format.toUpperCase()) {
            case "CSV":
                headers.setContentType(MediaType.parseMediaType("text/csv"));
                headers.setContentDispositionFormData("attachment", filenameBase + ".csv");
                break;
            case "M3U", "M3U8":
                headers.setContentType(MediaType.parseMediaType("audio/x-mpegurl"));
                headers.setContentDispositionFormData("attachment", filenameBase + ".m3u8");
                break;
            case "TEXT", "PRINT":
                headers.setContentType(MediaType.TEXT_PLAIN);
                headers.setContentDispositionFormData("inline", filenameBase + ".txt");
                break;
            default:
                headers.setContentType(MediaType.APPLICATION_JSON);
                headers.setContentDispositionFormData("attachment", filenameBase + ".json");
                break;
        }
        return ResponseEntity.ok().headers(headers).body(data);
    }
}
