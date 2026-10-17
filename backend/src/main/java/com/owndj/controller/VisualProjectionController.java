package com.owndj.controller;

import com.owndj.dto.VisualTemplateDto;
import com.owndj.model.MediaAsset;
import com.owndj.service.VisualProjectionService;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Path;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class VisualProjectionController {

    private final VisualProjectionService visualProjectionService;

    @GetMapping("/projector/templates")
    public ResponseEntity<List<VisualTemplateDto>> listTemplates(
            @RequestParam(required = false) String eventType) {
        return ResponseEntity.ok(visualProjectionService.listTemplates(eventType));
    }

    @PostMapping("/projector/templates")
    public ResponseEntity<VisualTemplateDto> createTemplate(
            @RequestBody VisualTemplateDto dto) {
        return ResponseEntity.ok(visualProjectionService.createTemplate(dto));
    }

    @PutMapping("/projector/templates/{id}")
    public ResponseEntity<VisualTemplateDto> updateTemplate(
            @PathVariable java.util.UUID id,
            @RequestBody VisualTemplateDto dto) {
        return ResponseEntity.ok(visualProjectionService.updateTemplate(id, dto));
    }

    @DeleteMapping("/projector/templates/{id}")
    public ResponseEntity<Map<String, String>> deleteTemplate(@PathVariable java.util.UUID id) {
        visualProjectionService.deleteTemplate(id);
        return ResponseEntity.ok(Map.of("message", "Template deleted"));
    }

    @PostMapping("/sessions/{roomCode}/projector/activate-template/{templateId}")
    public ResponseEntity<Void> activateTemplate(
            @PathVariable String roomCode,
            @PathVariable java.util.UUID templateId,
            @RequestHeader("X-Host-Token") String hostToken) {
        visualProjectionService.activateTemplate(roomCode, hostToken, templateId);
        return ResponseEntity.ok().build();
    }

    @PutMapping("/sessions/{roomCode}/projector/custom-screen")
    public ResponseEntity<Void> updateCustomScreen(
            @PathVariable String roomCode,
            @RequestHeader("X-Host-Token") String hostToken,
            @RequestBody com.owndj.dto.ProjectorCustomScreenDto dto) {
        visualProjectionService.updateCustomScreen(roomCode, hostToken, dto);
        return ResponseEntity.ok().build();
    }

    @PostMapping("/sessions/{roomCode}/projector/preset")
    public ResponseEntity<Void> switchPreset(
            @PathVariable String roomCode,
            @RequestHeader("X-Host-Token") String hostToken,
            @RequestBody Map<String, String> payload) {
        String preset = payload.get("preset");
        String tickerText = payload.get("tickerText");
        visualProjectionService.switchPreset(roomCode, hostToken, preset, tickerText);
        return ResponseEntity.ok().build();
    }

    @PostMapping("/sessions/{roomCode}/projector/announcement")
    public ResponseEntity<Void> sendAnnouncement(
            @PathVariable String roomCode,
            @RequestHeader("X-Host-Token") String hostToken,
            @RequestBody Map<String, String> payload) {
        String announcement = payload.get("announcement");
        visualProjectionService.sendAnnouncement(roomCode, hostToken, announcement);
        return ResponseEntity.ok().build();
    }

    @PostMapping("/media/visuals")
    public ResponseEntity<MediaAsset> uploadVisual(
            @RequestParam("file") MultipartFile file,
            @RequestHeader("X-Host-Token") String hostToken) throws IOException {
        return ResponseEntity.ok(visualProjectionService.uploadVisualAsset(file, hostToken));
    }

    @GetMapping("/media/visuals/{storageKey}")
    public ResponseEntity<Resource> getVisualAsset(@PathVariable String storageKey) throws IOException {
        Path path = visualProjectionService.getVisualAssetPath(storageKey);
        Resource resource = new UrlResource(path.toUri());

        String mimeType = "application/octet-stream";
        String filename = path.getFileName().toString().toLowerCase();
        if (filename.endsWith(".mp4")) {
            mimeType = "video/mp4";
        } else if (filename.endsWith(".png")) {
            mimeType = "image/png";
        } else if (filename.endsWith(".jpg") || filename.endsWith(".jpeg")) {
            mimeType = "image/jpeg";
        }

        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(mimeType))
                .body(resource);
    }
}
