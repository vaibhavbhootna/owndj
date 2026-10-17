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
        int attempts = 0;
        do {
            roomCode = tokenService.generateRoomCode(codeLength);
            attempts++;
            if (attempts > 10) {
                throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Could not generate unique room code");
            }
        } while (sessionRepository.existsByRoomCodeIgnoreCase(roomCode));

        String plainHostToken = tokenService.generateSecureToken(32);
        String hostTokenHash = tokenService.hashToken(plainHostToken);

        Session session = Session.builder()
                .roomCode(roomCode)
                .name(request.getName().trim())
                .status(SessionStatus.CREATED)
                .hostSessionTokenHash(hostTokenHash)
                .createdAt(Instant.now())
                .build();
        session.setSettings(new SessionSettings());

        session = sessionRepository.save(session);
        log.info("Created session {} with room code {}", session.getId(), roomCode);

        return mapToResponse(session, plainHostToken, null);
    }

    @Transactional(readOnly = true)
    public SessionResponse getSessionByRoomCode(String roomCode, String hostToken) {
        Session session = findSessionByRoomCode(roomCode);
        boolean isHost = hostToken != null && tokenService.verifyToken(hostToken, session.getHostSessionTokenHash());
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

    public void validateHostToken(Session session, String hostToken) {
        if (hostToken == null || !tokenService.verifyToken(hostToken, session.getHostSessionTokenHash())) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid host authorization token");
        }
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
        if (dto.getDeckRepeat() != null) session.setDeckRepeat(dto.getDeckRepeat());
        if (dto.getDeckShuffle() != null) session.setDeckShuffle(dto.getDeckShuffle());
        if (dto.getGuestRequestsPaused() != null) session.setGuestRequestsPaused(dto.getGuestRequestsPaused());
        if (dto.getRequestCooldownSeconds() != null) session.setRequestCooldownSeconds(dto.getRequestCooldownSeconds());

        session = sessionRepository.save(session);
        SessionResponse response = mapToResponse(session, hostToken, null);
        notificationService.broadcast(roomCode, "EVENT_DETAILS_UPDATED", response);
        return response;
    }

    public SessionResponse mapToResponse(Session session, String hostToken, SongRequestDto currentTrack) {
        long guestCount = guestRepository.countBySessionId(session.getId());
        return SessionResponse.builder()
                .id(session.getId())
                .roomCode(session.getRoomCode())
                .name(session.getName())
                .status(session.getStatus())
                .hostToken(hostToken)
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
                .currentDjTrackIndex(session.getCurrentDjTrackIndex() != null ? session.getCurrentDjTrackIndex() : 0)
                .deckRepeat(session.getDeckRepeat() != null ? session.getDeckRepeat() : true)
                .deckShuffle(session.getDeckShuffle() != null ? session.getDeckShuffle() : false)
                .guestRequestsPaused(session.getGuestRequestsPaused() != null ? session.getGuestRequestsPaused() : false)
                .requestCooldownSeconds(session.getRequestCooldownSeconds() != null ? session.getRequestCooldownSeconds() : 30)
                .build();
    }
}
