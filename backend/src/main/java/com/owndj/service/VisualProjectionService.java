package com.owndj.service;

import com.owndj.dto.VisualTemplateDto;
import com.owndj.model.*;
import com.owndj.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.io.IOException;
import java.nio.file.*;
import java.time.Instant;
import java.util.*;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class VisualProjectionService {

    private final VisualTemplateRepository templateRepository;
    private final MediaAssetRepository mediaAssetRepository;
    private final SessionService sessionService;
    private final SessionRepository sessionRepository;
    private final NotificationService notificationService;

    @Value("${app.visuals.storage-path:uploads/visuals}")
    private String visualsStoragePath;

    @Transactional(readOnly = true)
    public List<VisualTemplateDto> listTemplates(String eventType) {
        List<VisualTemplate> list = (eventType != null && !eventType.isBlank())
                ? templateRepository.findByEventTypeOrderByCreatedAtAsc(eventType)
                : templateRepository.findByOrderByCreatedAtAsc();

        return list.stream().map(this::mapToDto).collect(Collectors.toList());
    }

    @Transactional
    public VisualTemplateDto createTemplate(VisualTemplateDto dto) {
        VisualTemplate template = VisualTemplate.builder()
                .templateName(dto.getTemplateName() != null ? dto.getTemplateName().trim() : "Custom Visual Template")
                .eventType(dto.getEventType() != null ? dto.getEventType() : "PARTY")
                .bannerTitle(dto.getBannerTitle() != null ? dto.getBannerTitle().trim() : "Welcome!")
                .greetingMessage(dto.getGreetingMessage())
                .tickerText(dto.getTickerText())
                .themePreset(dto.getThemePreset() != null ? dto.getThemePreset() : "NOW_PLAYING")
                .bgType(dto.getBgType() != null ? dto.getBgType() : "ANIMATED_PATTERN")
                .bgMediaUrl(dto.getBgMediaUrl())
                .bgOpacity(dto.getBgOpacity() > 0 ? dto.getBgOpacity() : 0.85)
                .showQrCode(dto.isShowQrCode())
                .showNowPlaying(dto.isShowNowPlaying())
                .showGuestAnnouncements(dto.isShowGuestAnnouncements())
                .showVisualizer(dto.isShowVisualizer())
                .primaryColor(dto.getPrimaryColor() != null ? dto.getPrimaryColor() : "#06b6d4")
                .accentColor(dto.getAccentColor() != null ? dto.getAccentColor() : "#ec4899")
                .fontFamily(dto.getFontFamily() != null ? dto.getFontFamily() : "sans-serif")
                .createdAt(Instant.now())
                .build();

        template = templateRepository.save(template);
        return mapToDto(template);
    }

    @Transactional
    public void switchPreset(String roomCode, String hostToken, String preset, String tickerText) {
        Session session = sessionService.findSessionByRoomCode(roomCode);
        sessionService.validateHostToken(session, hostToken);

        session.setActiveVisualPreset(preset);
        if (tickerText != null && !tickerText.isBlank()) {
            session.setTickerText(tickerText.trim());
        }
        sessionRepository.save(session);

        Map<String, Object> payload = new HashMap<>();
        payload.put("preset", preset);
        payload.put("tickerText", session.getTickerText());
        payload.put("bannerText", session.getBannerText());
        payload.put("eventType", session.getEventType());
        payload.put("themeColor", session.getThemeColor());

        notificationService.broadcast(roomCode, "VISUAL_PRESET_CHANGED", payload);
        log.info("Switched projector preset in session {} to {}", roomCode, preset);
    }

    @Transactional
    public void sendAnnouncement(String roomCode, String hostToken, String announcementText) {
        Session session = sessionService.findSessionByRoomCode(roomCode);
        sessionService.validateHostToken(session, hostToken);

        session.setTickerText(announcementText);
        sessionRepository.save(session);

        Map<String, String> payload = Map.of(
                "announcement", announcementText,
                "timestamp", Instant.now().toString()
        );
        notificationService.broadcast(roomCode, "PROJECTION_ANNOUNCEMENT", payload);
    }

    @Transactional
    public MediaAsset uploadVisualAsset(MultipartFile file, String hostToken) throws IOException {
        if (file.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "File is empty");
        }

        String originalFilename = file.getOriginalFilename() != null ? file.getOriginalFilename() : "asset";
        String contentType = file.getContentType() != null ? file.getContentType() : "application/octet-stream";

        String assetType = "IMAGE";
        if (contentType.startsWith("video/") || originalFilename.toLowerCase().endsWith(".mp4")) {
            assetType = "BACKGROUND_VIDEO";
        } else if (originalFilename.toLowerCase().endsWith(".png")) {
            assetType = "LOGO";
        }

        Path dir = Paths.get(visualsStoragePath).toAbsolutePath().normalize();
        if (!Files.exists(dir)) {
            Files.createDirectories(dir);
        }

        String storageKey = UUID.randomUUID() + "_" + originalFilename.replaceAll("[^a-zA-Z0-9.-]", "_");
        Path targetPath = dir.resolve(storageKey).normalize();

        if (!targetPath.startsWith(dir)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid file path traversal");
        }

        Files.copy(file.getInputStream(), targetPath, StandardCopyOption.REPLACE_EXISTING);

        MediaAsset asset = MediaAsset.builder()
                .storageKey(storageKey)
                .originalFilename(originalFilename)
                .mimeType(contentType)
                .fileSizeBytes(file.getSize())
                .assetType(assetType)
                .createdAt(Instant.now())
                .build();

        return mediaAssetRepository.save(asset);
    }

    @Transactional(readOnly = true)
    public Path getVisualAssetPath(String storageKey) {
        Path dir = Paths.get(visualsStoragePath).toAbsolutePath().normalize();
        Path file = dir.resolve(storageKey).normalize();
        if (!file.startsWith(dir) || !Files.exists(file)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Visual asset not found");
        }
        return file;
    }

    public VisualTemplateDto mapToDto(VisualTemplate t) {
        return VisualTemplateDto.builder()
                .id(t.getId())
                .templateName(t.getTemplateName())
                .eventType(t.getEventType())
                .bannerTitle(t.getBannerTitle())
                .greetingMessage(t.getGreetingMessage())
                .tickerText(t.getTickerText())
                .themePreset(t.getThemePreset())
                .bgType(t.getBgType())
                .bgMediaUrl(t.getBgMediaUrl())
                .bgOpacity(t.getBgOpacity() != null ? t.getBgOpacity() : 0.85)
                .showQrCode(t.getShowQrCode() != null ? t.getShowQrCode() : true)
                .showNowPlaying(t.getShowNowPlaying() != null ? t.getShowNowPlaying() : true)
                .showGuestAnnouncements(t.getShowGuestAnnouncements() != null ? t.getShowGuestAnnouncements() : true)
                .showVisualizer(t.getShowVisualizer() != null ? t.getShowVisualizer() : true)
                .primaryColor(t.getPrimaryColor())
                .accentColor(t.getAccentColor())
                .fontFamily(t.getFontFamily())
                .build();
    }
}
