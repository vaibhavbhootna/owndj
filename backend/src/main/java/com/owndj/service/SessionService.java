package com.owndj.service;

import com.owndj.dto.*;
import com.owndj.model.*;
import com.owndj.repository.GuestRepository;
import com.owndj.repository.SessionRepository;
import com.owndj.security.TokenService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class SessionService {

    private final SessionRepository sessionRepository;
    private final GuestRepository guestRepository;
    private final TokenService tokenService;
    private final NotificationService notificationService;

    @Value("${app.session.code-length:6}")
    private int codeLength;

    @Transactional
    public SessionResponse createSession(CreateSessionRequest request) {
        String roomCode;
        if (request.getCustomRoomCode() != null && !request.getCustomRoomCode().isBlank()) {
            String sanitized = request.getCustomRoomCode().trim().toUpperCase().replaceAll("[^A-Z0-9_-]", "");
            if (sanitized.length() < 3 || sanitized.length() > 16) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Custom room code must be between 3 and 16 characters (letters, numbers, hyphens, underscores)");
            }
            if (sessionRepository.existsByRoomCodeIgnoreCase(sanitized)) {
                throw new ResponseStatusException(HttpStatus.CONFLICT, "Room code '" + sanitized + "' is already in use. Please choose another code.");
            }
            roomCode = sanitized;
        } else {
            int attempts = 0;
            do {
                roomCode = tokenService.generateRoomCode(codeLength);
                attempts++;
                if (attempts > 10) {
                    throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Could not generate unique room code");
                }
            } while (sessionRepository.existsByRoomCodeIgnoreCase(roomCode));
        }

        String plainHostToken = tokenService.generateSecureToken(32);
        String hostTokenHash = tokenService.hashToken(plainHostToken);

        String passcode = request.getDjPasscode();
        if (passcode == null || passcode.isBlank()) {
            passcode = "1234";
        }

        Session session = Session.builder()
                .roomCode(roomCode)
                .name(request.getName().trim())
                .status(SessionStatus.CREATED)
                .hostSessionTokenHash(hostTokenHash)
                .hostSessionToken(plainHostToken)
                .djPasscode(passcode.trim())
                .createdAt(Instant.now())
                .build();
        session.setSettings(new SessionSettings());

        session = sessionRepository.save(session);
        log.info("Created session {} with room code {}", session.getId(), roomCode);

        return mapToResponse(session, plainHostToken, null);
    }

    @Transactional(readOnly = true)
    public List<SessionResponse> getAllSessions(boolean activeOnly) {
        List<Session> sessions;
        if (activeOnly) {
            sessions = sessionRepository.findByStatusInOrderByCreatedAtDesc(
                    List.of(SessionStatus.CREATED, SessionStatus.ACTIVE, SessionStatus.PAUSED)
            );
        } else {
            sessions = sessionRepository.findAllByOrderByCreatedAtDesc();
        }
        return sessions.stream()
                .map(s -> mapToResponse(s, null, null))
                .toList();
    }

    @Transactional
    public SessionResponse closeSession(String roomCode, String hostToken) {
        Session session = findSessionByRoomCode(roomCode);
        if (hostToken != null && !hostToken.isBlank()) {
            validateHostToken(session, hostToken);
        }
        session.setStatus(SessionStatus.ENDED);
        session.setEndedAt(Instant.now());
        session = sessionRepository.save(session);
        notificationService.broadcast(roomCode, "SESSION_STATUS_CHANGED", SessionStatus.ENDED);
        log.info("Session {} ({}) ended via closeSession", session.getRoomCode(), session.getId());
        return mapToResponse(session, hostToken, null);
    }

    @Transactional
    public void deleteSession(String roomCode, String hostToken) {
        Session session = findSessionByRoomCode(roomCode);
        if (hostToken != null && !hostToken.isBlank()) {
            validateHostToken(session, hostToken);
        }
        sessionRepository.delete(session);
        notificationService.broadcast(roomCode, "SESSION_DELETED", roomCode);
        log.info("Session {} ({}) deleted", session.getRoomCode(), session.getId());
    }

    @Transactional(readOnly = true)
    public SessionResponse getSessionByRoomCode(String roomCode, String hostToken) {
        Session session = findSessionByRoomCode(roomCode);
        boolean isHost = isHost(session, hostToken);
        return mapToResponse(session, isHost ? hostToken : null, null);
    }

    @Transactional
    public GuestResponse joinSession(String roomCode, JoinSessionRequest request) {
        Session session = findSessionByRoomCode(roomCode);
        if (session.getStatus() == SessionStatus.ENDED) {
            throw new ResponseStatusException(HttpStatus.GONE, "Session has ended");
        }

        String plainGuestToken = tokenService.generateSecureToken(32);
        String guestTokenHash = tokenService.hashToken(plainGuestToken);

        Guest guest = Guest.builder()
                .session(session)
                .nickname(request.getNickname().trim())
                .guestTokenHash(guestTokenHash)
                .createdAt(Instant.now())
                .lastSeenAt(Instant.now())
                .build();

        guest = guestRepository.save(guest);
        log.info("Guest '{}' ({}) joined session {}", guest.getNickname(), guest.getId(), roomCode);

        // Notify DJ / room about new guest count
        long guestCount = guestRepository.countBySessionId(session.getId());
        notificationService.broadcast(roomCode, "GUEST_JOINED", guestCount);

        return GuestResponse.builder()
                .id(guest.getId())
                .nickname(guest.getNickname())
                .guestToken(plainGuestToken)
                .sessionId(session.getId())
                .roomCode(session.getRoomCode())
                .build();
    }

    @Transactional
    public SessionResponse updateSettings(String roomCode, String hostToken, SessionSettings newSettings) {
        Session session = findSessionByRoomCode(roomCode);
        validateHostToken(session, hostToken);

        session.setSettings(newSettings);
        session = sessionRepository.save(session);

        notificationService.broadcast(roomCode, "SETTINGS_UPDATED", newSettings);
        return mapToResponse(session, hostToken, null);
    }

    @Transactional
    public SessionResponse updateSessionStatus(String roomCode, String hostToken, SessionStatus newStatus) {
        Session session = findSessionByRoomCode(roomCode);
        validateHostToken(session, hostToken);

        session.setStatus(newStatus);
        if (newStatus == SessionStatus.ACTIVE && session.getStartedAt() == null) {
            session.setStartedAt(Instant.now());
        } else if (newStatus == SessionStatus.ENDED) {
            session.setEndedAt(Instant.now());
        }

        session = sessionRepository.save(session);
        notificationService.broadcast(roomCode, "SESSION_STATUS_CHANGED", newStatus);
        return mapToResponse(session, hostToken, null);
    }

    public Session findSessionByRoomCode(String roomCode) {
        return sessionRepository.findByRoomCodeIgnoreCase(roomCode.trim())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Session not found for room code: " + roomCode));
    }

    public boolean isHost(Session session, String hostToken) {
        if (hostToken == null || hostToken.isBlank()) {
            return false;
        }
        boolean validOriginal = tokenService.verifyToken(hostToken, session.getHostSessionTokenHash());
        boolean validPlain = session.getHostSessionToken() != null && session.getHostSessionToken().equals(hostToken);
        boolean validPasscode = session.getDjPasscode() != null && !session.getDjPasscode().isBlank()
                && session.getDjPasscode().equalsIgnoreCase(hostToken.trim());
        return validOriginal || validPlain || validPasscode;
    }

    public void validateHostToken(Session session, String hostToken) {
        if (!isHost(session, hostToken)) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid host authorization token");
        }
    }

    @Transactional(readOnly = true)
    public SessionResponse djLogin(String roomCode, String passcode) {
        Session session = findSessionByRoomCode(roomCode);
        if (passcode == null || passcode.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "DJ passcode is required");
        }
        String trimmed = passcode.trim();
        boolean match = (session.getDjPasscode() != null && session.getDjPasscode().equalsIgnoreCase(trimmed))
                || tokenService.verifyToken(trimmed, session.getHostSessionTokenHash())
                || (session.getHostSessionToken() != null && session.getHostSessionToken().equals(trimmed));

        if (!match) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid DJ passcode. Please check with the event manager.");
        }

        String effectiveToken = session.getHostSessionToken() != null ? session.getHostSessionToken() : session.getDjPasscode();
        return mapToResponse(session, effectiveToken, null);
    }

    public Guest validateGuestToken(Session session, String guestToken) {
        if (guestToken == null || guestToken.isBlank()) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Missing guest token");
        }
        String tokenHash = tokenService.hashToken(guestToken);
        Guest guest = guestRepository.findBySessionIdAndGuestTokenHash(session.getId(), tokenHash)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid guest authorization token"));

        guest.setLastSeenAt(Instant.now());
        guestRepository.save(guest);
        return guest;
    }

    @Transactional
    public SessionResponse updateEventDetails(String roomCode, String hostToken, EventDetailsUpdateDto dto) {
        Session session = findSessionByRoomCode(roomCode);
        validateHostToken(session, hostToken);

        if (dto.getName() != null && !dto.getName().isBlank()) session.setName(dto.getName().trim());
        if (dto.getEventType() != null) session.setEventType(dto.getEventType());
        if (dto.getVenue() != null) session.setVenue(dto.getVenue());
        if (dto.getEventDate() != null) session.setEventDate(dto.getEventDate());
        if (dto.getStartTime() != null) session.setStartTime(dto.getStartTime());
        if (dto.getEndTime() != null) session.setEndTime(dto.getEndTime());
        if (dto.getDescription() != null) session.setDescription(dto.getDescription());
        if (dto.getThemeColor() != null) session.setThemeColor(dto.getThemeColor());
        if (dto.getBannerText() != null) session.setBannerText(dto.getBannerText());
        if (dto.getActiveVisualPreset() != null) session.setActiveVisualPreset(dto.getActiveVisualPreset());
        if (dto.getTickerText() != null) session.setTickerText(dto.getTickerText());
        if (dto.getCustomScreenImageUrl() != null) session.setCustomScreenImageUrl(dto.getCustomScreenImageUrl());
        if (dto.getCustomScreenTitle() != null) session.setCustomScreenTitle(dto.getCustomScreenTitle());
        if (dto.getCustomScreenSubtitle() != null) session.setCustomScreenSubtitle(dto.getCustomScreenSubtitle());
        if (dto.getCustomScreenTag() != null) session.setCustomScreenTag(dto.getCustomScreenTag());
        if (dto.getCustomScreenLayout() != null) session.setCustomScreenLayout(dto.getCustomScreenLayout());
        if (dto.getCustomScreenShowQr() != null) session.setCustomScreenShowQr(dto.getCustomScreenShowQr());
        if (dto.getCustomScreenShowNowPlaying() != null) session.setCustomScreenShowNowPlaying(dto.getCustomScreenShowNowPlaying());
        if (dto.getCustomScreenImageFit() != null) session.setCustomScreenImageFit(dto.getCustomScreenImageFit());
        if (dto.getCustomScreenImageScale() != null) session.setCustomScreenImageScale(dto.getCustomScreenImageScale());
        if (dto.getCustomScreenImageRotate() != null) session.setCustomScreenImageRotate(dto.getCustomScreenImageRotate());
        if (dto.getCustomScreenImagePosX() != null) session.setCustomScreenImagePosX(dto.getCustomScreenImagePosX());
        if (dto.getCustomScreenImagePosY() != null) session.setCustomScreenImagePosY(dto.getCustomScreenImagePosY());
        if (dto.getCustomScreenImageBrightness() != null) session.setCustomScreenImageBrightness(dto.getCustomScreenImageBrightness());
        if (dto.getCustomScreenImageContrast() != null) session.setCustomScreenImageContrast(dto.getCustomScreenImageContrast());
        if (dto.getCustomScreenImageBorder() != null) session.setCustomScreenImageBorder(dto.getCustomScreenImageBorder());
        if (dto.getDeckRepeat() != null) session.setDeckRepeat(dto.getDeckRepeat());
        if (dto.getDeckShuffle() != null) session.setDeckShuffle(dto.getDeckShuffle());
        if (dto.getGuestRequestsPaused() != null) session.setGuestRequestsPaused(dto.getGuestRequestsPaused());
        if (dto.getRequestCooldownSeconds() != null) session.setRequestCooldownSeconds(dto.getRequestCooldownSeconds());
        if (dto.getDjPasscode() != null && !dto.getDjPasscode().isBlank()) session.setDjPasscode(dto.getDjPasscode().trim());

        session = sessionRepository.save(session);
        SessionResponse response = mapToResponse(session, hostToken, null);
        notificationService.broadcast(roomCode, "EVENT_DETAILS_UPDATED", response);
        return response;
    }

    public SessionResponse mapToResponse(Session session, String hostToken, SongRequestDto currentTrack) {
        long guestCount = guestRepository.countBySessionId(session.getId());
        boolean isHost = hostToken != null && !hostToken.isBlank();
        return SessionResponse.builder()
                .id(session.getId())
                .roomCode(session.getRoomCode())
                .name(session.getName())
                .status(session.getStatus())
                .hostToken(hostToken)
                .djPasscode(isHost ? session.getDjPasscode() : null)
                .settings(session.getSettings())
                .guestCount(guestCount)
                .currentTrack(currentTrack)
                .createdAt(session.getCreatedAt())
                .startedAt(session.getStartedAt())
                .endedAt(session.getEndedAt())
                .eventType(session.getEventType())
                .venue(session.getVenue())
                .eventDate(session.getEventDate())
                .startTime(session.getStartTime())
                .endTime(session.getEndTime())
                .description(session.getDescription())
                .themeColor(session.getThemeColor())
                .bannerText(session.getBannerText())
                .activeVisualPreset(session.getActiveVisualPreset())
                .tickerText(session.getTickerText())
                .customScreenImageUrl(session.getCustomScreenImageUrl())
                .customScreenTitle(session.getCustomScreenTitle())
                .customScreenSubtitle(session.getCustomScreenSubtitle())
                .customScreenTag(session.getCustomScreenTag())
                .customScreenLayout(session.getCustomScreenLayout() != null ? session.getCustomScreenLayout() : "SPLIT")
                .customScreenShowQr(session.getCustomScreenShowQr() != null ? session.getCustomScreenShowQr() : true)
                .customScreenShowNowPlaying(session.getCustomScreenShowNowPlaying() != null ? session.getCustomScreenShowNowPlaying() : true)
                .customScreenImageFit(session.getCustomScreenImageFit() != null ? session.getCustomScreenImageFit() : "cover")
                .customScreenImageScale(session.getCustomScreenImageScale() != null ? session.getCustomScreenImageScale() : 100)
                .customScreenImageRotate(session.getCustomScreenImageRotate() != null ? session.getCustomScreenImageRotate() : 0)
                .customScreenImagePosX(session.getCustomScreenImagePosX() != null ? session.getCustomScreenImagePosX() : 50)
                .customScreenImagePosY(session.getCustomScreenImagePosY() != null ? session.getCustomScreenImagePosY() : 50)
                .customScreenImageBrightness(session.getCustomScreenImageBrightness() != null ? session.getCustomScreenImageBrightness() : 100)
                .customScreenImageContrast(session.getCustomScreenImageContrast() != null ? session.getCustomScreenImageContrast() : 100)
                .customScreenImageBorder(session.getCustomScreenImageBorder() != null ? session.getCustomScreenImageBorder() : "neon")
                .currentDjTrackIndex(session.getCurrentDjTrackIndex() != null ? session.getCurrentDjTrackIndex() : 0)
                .deckRepeat(session.getDeckRepeat() != null ? session.getDeckRepeat() : true)
                .deckShuffle(session.getDeckShuffle() != null ? session.getDeckShuffle() : false)
                .guestRequestsPaused(session.getGuestRequestsPaused() != null ? session.getGuestRequestsPaused() : false)
                .requestCooldownSeconds(session.getRequestCooldownSeconds() != null ? session.getRequestCooldownSeconds() : 30)
                .build();
    }
}
