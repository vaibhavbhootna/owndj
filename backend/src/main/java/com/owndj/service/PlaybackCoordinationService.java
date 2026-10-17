package com.owndj.service;

import com.owndj.dto.PlaybackStateDto;
import com.owndj.dto.SongDto;
import com.owndj.dto.SongRequestDto;
import com.owndj.model.*;
import com.owndj.repository.EventDJTrackRepository;
import com.owndj.repository.EventPlaybackHistoryRepository;
import com.owndj.repository.SessionRepository;
import com.owndj.repository.SongRequestRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

@Slf4j
@Service
@RequiredArgsConstructor
public class PlaybackCoordinationService {

    private final SessionService sessionService;
    private final QueueService queueService;
    private final SessionRepository sessionRepository;
    private final SongRequestRepository songRequestRepository;
    private final EventDJTrackRepository eventDJTrackRepository;
    private final EventPlaybackHistoryRepository historyRepository;
    private final NotificationService notificationService;

    // Track active transition tokens per session to enforce transition idempotency
    private final Map<UUID, String> activeTransitions = new ConcurrentHashMap<>();

    @Transactional
    public PlaybackStateDto startOrAdvancePlayback(String roomCode, String hostToken) {
        Session session = sessionService.findSessionByRoomCode(roomCode);
        sessionService.validateHostToken(session, hostToken);

        // 1. Complete any currently playing track and record history
        recordCurrentTrackHistoryAndComplete(session, "COMPLETED");

        // 2. Playback Priority Rule 1: Check Guest Request Queue
        boolean guestRequestsPaused = Boolean.TRUE.equals(session.getGuestRequestsPaused());
        List<SongRequest> upcomingRequests = Collections.emptyList();

        if (!guestRequestsPaused) {
            upcomingRequests = songRequestRepository.findBySessionIdAndStatusInOrderByQueuePositionAscCreatedAtAsc(
                    session.getId(),
                    List.of(RequestStatus.APPROVED, RequestStatus.PENDING)
            );
        }

        if (!upcomingRequests.isEmpty()) {
            // Play Guest Request
            SongRequest nextReq = upcomingRequests.get(0);
            nextReq.setStatus(RequestStatus.PLAYING);
            nextReq.setStartedAt(Instant.now());
            nextReq = songRequestRepository.save(nextReq);

            String transitionId = UUID.randomUUID().toString();
            activeTransitions.put(session.getId(), transitionId);

            SongRequestDto trackDto = queueService.mapToDto(nextReq, null, false);
            PlaybackStateDto state = PlaybackStateDto.builder()
                    .status("PLAYING")
                    .currentTrack(trackDto)
                    .currentPositionSeconds(nextReq.getRequestedStartSeconds())
                    .volume(100)
                    .autoAdvance(session.getSettings().isAutoAdvance())
                    .transitionId(transitionId)
                    .playlistSource("GUEST_REQUEST")
                    .activeVisualPreset(session.getActiveVisualPreset())
                    .tickerText(session.getTickerText())
                    .build();

            log.info("Started Guest Request {} ('{}') in session {}", nextReq.getId(), nextReq.getSong().getTitle(), roomCode);

            notificationService.broadcast(roomCode, "CURRENT_TRACK_CHANGED", state);
            notificationService.broadcast(roomCode, "QUEUE_UPDATED", queueService.getQueue(roomCode, null));
            return state;
        }

        // 3. Playback Priority Rule 2: If no guest requests, play next track from DJ Deck
        List<EventDJTrack> deckTracks = eventDJTrackRepository.findBySessionOrderBySortOrderAsc(session);
        if (!deckTracks.isEmpty()) {
            int targetIndex = session.getCurrentDjTrackIndex() != null ? session.getCurrentDjTrackIndex() : 0;
            if (targetIndex >= deckTracks.size()) {
                if (Boolean.TRUE.equals(session.getDeckRepeat())) {
                    targetIndex = 0;
                    // Reset status of all deck tracks to UNPLAYED so repeat continues cleanly
                    for (EventDJTrack t : deckTracks) {
                        t.setPlaybackStatus("UNPLAYED");
                    }
                    eventDJTrackRepository.saveAll(deckTracks);
                } else {
                    targetIndex = -1; // End reached and no repeat
                }
            }

            if (targetIndex >= 0 && targetIndex < deckTracks.size()) {
                EventDJTrack djTrack = deckTracks.get(targetIndex);
                djTrack.setPlaybackStatus("PLAYING");
                eventDJTrackRepository.save(djTrack);

                // Advance DJ Deck index for next time (Priority Rule 4: never lose position)
                session.setCurrentDjTrackIndex(targetIndex + 1);
                sessionRepository.save(session);

                String transitionId = UUID.randomUUID().toString();
                activeTransitions.put(session.getId(), transitionId);

                // Convert to unified SongRequestDto so existing frontend players handle it uniformly
                SongRequestDto virtualDto = SongRequestDto.builder()
                        .id(djTrack.getId())
                        .song(SongDto.builder()
                                .title(djTrack.getTitle())
                                .channelTitle(djTrack.getArtist())
                                .youtubeVideoId(djTrack.getSourceIdentifier())
                                .thumbnailUrl("https://i.ytimg.com/vi/" + djTrack.getSourceIdentifier() + "/hqdefault.jpg")
                                .durationSeconds(djTrack.getDurationSeconds())
                                .build())
                        .guestNickname("DJ Deck")
                        .requestedStartSeconds(djTrack.getStartSeconds())
                        .requestedDurationSeconds(djTrack.getDurationSeconds() > 0 ? djTrack.getDurationSeconds() : 60)
                        .requestedEndSeconds(djTrack.getStartSeconds() + (djTrack.getDurationSeconds() > 0 ? djTrack.getDurationSeconds() : 60))
                        .status(RequestStatus.PLAYING)
                        .selectedSourceType(djTrack.getSourceType())
                        .selectedSourceId(djTrack.getSourceIdentifier())
                        .build();

                PlaybackStateDto state = PlaybackStateDto.builder()
                        .status("PLAYING")
                        .currentTrack(virtualDto)
                        .currentPositionSeconds(djTrack.getStartSeconds())
                        .volume(100)
                        .autoAdvance(session.getSettings().isAutoAdvance())
                        .transitionId(transitionId)
                        .playlistSource("DJ_DECK")
                        .djDeckTrackId(djTrack.getId().toString())
                        .activeVisualPreset(session.getActiveVisualPreset())
                        .tickerText(session.getTickerText())
                        .build();

                log.info("Started DJ Deck track #{} ('{}') in session {}", targetIndex, djTrack.getTitle(), roomCode);

                notificationService.broadcast(roomCode, "CURRENT_TRACK_CHANGED", state);
                notificationService.broadcast(roomCode, "DJ_DECK_UPDATED", eventDJTrackRepository.findBySessionOrderBySortOrderAsc(session));
                return state;
            }
        }

        // 4. Standby / Idle State (Both Guest Queue & DJ Deck empty)
        PlaybackStateDto idleState = PlaybackStateDto.builder()
                .status("IDLE")
                .currentTrack(null)
                .currentPositionSeconds(0)
                .volume(100)
                .autoAdvance(session.getSettings().isAutoAdvance())
                .activeVisualPreset("STANDBY")
                .tickerText(session.getTickerText())
                .build();

        notificationService.broadcast(roomCode, "CURRENT_TRACK_CHANGED", idleState);
        return idleState;
    }

    @Transactional
    public PlaybackStateDto playSpecificDjTrack(String roomCode, String hostToken, String trackId) {
        Session session = sessionService.findSessionByRoomCode(roomCode);
        sessionService.validateHostToken(session, hostToken);

        EventDJTrack targetTrack = eventDJTrackRepository.findById(UUID.fromString(trackId))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "DJ Track not found"));

        recordCurrentTrackHistoryAndComplete(session, "SKIPPED");

        targetTrack.setPlaybackStatus("PLAYING");
        eventDJTrackRepository.save(targetTrack);

        // Update deck index to point to the track right after this one
        session.setCurrentDjTrackIndex(targetTrack.getSortOrder() + 1);
        sessionRepository.save(session);

        String transitionId = UUID.randomUUID().toString();
        activeTransitions.put(session.getId(), transitionId);

        SongRequestDto virtualDto = SongRequestDto.builder()
                .id(targetTrack.getId())
                .song(SongDto.builder()
                        .title(targetTrack.getTitle())
                        .channelTitle(targetTrack.getArtist())
                        .youtubeVideoId(targetTrack.getSourceIdentifier())
                        .thumbnailUrl("https://i.ytimg.com/vi/" + targetTrack.getSourceIdentifier() + "/hqdefault.jpg")
                        .durationSeconds(targetTrack.getDurationSeconds())
                        .build())
                .guestNickname("DJ Deck")
                .requestedStartSeconds(targetTrack.getStartSeconds())
                .requestedDurationSeconds(targetTrack.getDurationSeconds() > 0 ? targetTrack.getDurationSeconds() : 60)
                .requestedEndSeconds(targetTrack.getStartSeconds() + (targetTrack.getDurationSeconds() > 0 ? targetTrack.getDurationSeconds() : 60))
                .status(RequestStatus.PLAYING)
                .selectedSourceType(targetTrack.getSourceType())
                .selectedSourceId(targetTrack.getSourceIdentifier())
                .build();

        PlaybackStateDto state = PlaybackStateDto.builder()
                .status("PLAYING")
                .currentTrack(virtualDto)
                .currentPositionSeconds(targetTrack.getStartSeconds())
                .volume(100)
                .autoAdvance(session.getSettings().isAutoAdvance())
                .transitionId(transitionId)
                .playlistSource("DJ_DECK")
                .djDeckTrackId(targetTrack.getId().toString())
                .activeVisualPreset(session.getActiveVisualPreset())
                .tickerText(session.getTickerText())
                .build();

        notificationService.broadcast(roomCode, "CURRENT_TRACK_CHANGED", state);
        notificationService.broadcast(roomCode, "DJ_DECK_UPDATED", eventDJTrackRepository.findBySessionOrderBySortOrderAsc(session));
        return state;
    }

    @Transactional
    public PlaybackStateDto completeSegment(String roomCode, String hostToken, UUID requestId, String transitionId) {
        Session session = sessionService.findSessionByRoomCode(roomCode);
        sessionService.validateHostToken(session, hostToken);

        if (!session.getSettings().isAutoAdvance()) {
            log.info("Auto advance disabled for session {}, marking segment completed without advancing", roomCode);
            return pausePlayback(roomCode, hostToken);
        }

        notificationService.broadcast(roomCode, "SONG_SEGMENT_COMPLETED", requestId);
        return startOrAdvancePlayback(roomCode, hostToken);
    }

    @Transactional
    public PlaybackStateDto handlePlayerError(String roomCode, String hostToken, UUID requestId, int errorCode, String errorMessage) {
        Session session = sessionService.findSessionByRoomCode(roomCode);
        sessionService.validateHostToken(session, hostToken);

        log.warn("Player error reported for session {} on request {}: code={}, message={}",
                roomCode, requestId, errorCode, errorMessage);

        recordCurrentTrackHistoryAndComplete(session, "FAILED");

        notificationService.broadcast(roomCode, "PLAYBACK_ERROR", Map.of(
                "requestId", requestId != null ? requestId.toString() : "",
                "errorCode", errorCode,
                "errorMessage", errorMessage != null ? errorMessage : "Playback error"
        ));

        return startOrAdvancePlayback(roomCode, hostToken);
    }

    @Transactional
    public PlaybackStateDto pausePlayback(String roomCode, String hostToken) {
        Session session = sessionService.findSessionByRoomCode(roomCode);
        sessionService.validateHostToken(session, hostToken);

        PlaybackStateDto state = PlaybackStateDto.builder()
                .status("PAUSED")
                .autoAdvance(session.getSettings().isAutoAdvance())
                .activeVisualPreset(session.getActiveVisualPreset())
                .tickerText(session.getTickerText())
                .build();

        notificationService.broadcast(roomCode, "PLAYBACK_STATUS_CHANGED", state);
        return state;
    }

    @Transactional
    public PlaybackStateDto resumePlayback(String roomCode, String hostToken) {
        Session session = sessionService.findSessionByRoomCode(roomCode);
        sessionService.validateHostToken(session, hostToken);

        Optional<SongRequest> currentReq = songRequestRepository.findFirstBySessionIdAndStatus(session.getId(), RequestStatus.PLAYING);
        if (currentReq.isEmpty()) {
            return startOrAdvancePlayback(roomCode, hostToken);
        }

        SongRequestDto currentDto = queueService.mapToDto(currentReq.get(), null, false);
        PlaybackStateDto state = PlaybackStateDto.builder()
                .status("PLAYING")
                .currentTrack(currentDto)
                .autoAdvance(session.getSettings().isAutoAdvance())
                .activeVisualPreset(session.getActiveVisualPreset())
                .tickerText(session.getTickerText())
                .build();

        notificationService.broadcast(roomCode, "PLAYBACK_STATUS_CHANGED", state);
        return state;
    }

    @Transactional
    public PlaybackStateDto skipTrack(String roomCode, String hostToken) {
        Session session = sessionService.findSessionByRoomCode(roomCode);
        sessionService.validateHostToken(session, hostToken);

        recordCurrentTrackHistoryAndComplete(session, "SKIPPED");
        return startOrAdvancePlayback(roomCode, hostToken);
    }

    private void recordCurrentTrackHistoryAndComplete(Session session, String outcome) {
        // Check active guest request
        Optional<SongRequest> currentReq = songRequestRepository.findFirstBySessionIdAndStatus(session.getId(), RequestStatus.PLAYING);
        if (currentReq.isPresent()) {
            SongRequest req = currentReq.get();
            req.setStatus("FAILED".equals(outcome) ? RequestStatus.FAILED : RequestStatus.PLAYED);
            req.setCompletedAt(Instant.now());
            songRequestRepository.save(req);

            int playedDur = (int) (Instant.now().getEpochSecond() - (req.getStartedAt() != null ? req.getStartedAt().getEpochSecond() : req.getCreatedAt().getEpochSecond()));
            historyRepository.save(EventPlaybackHistory.builder()
                    .session(session)
                    .trackTitle(req.getSong().getTitle())
                    .artist(req.getSong().getChannelTitle())
                    .sourceType(req.getSelectedSourceType() != null ? req.getSelectedSourceType() : "YOUTUBE")
                    .sourceIdentifier(req.getSong().getYoutubeVideoId())
                    .playlistSource("GUEST_REQUEST")
                    .requesterNickname(req.getGuest().getNickname())
                    .requestedStartSeconds(req.getRequestedStartSeconds())
                    .playedDurationSeconds(Math.max(0, Math.min(playedDur, req.getRequestedDurationSeconds())))
                    .outcome(outcome)
                    .startedAt(req.getStartedAt() != null ? req.getStartedAt() : req.getCreatedAt())
                    .endedAt(Instant.now())
                    .build());
            return;
        }

        // Check active DJ deck track
        Optional<EventDJTrack> currentDj = eventDJTrackRepository.findFirstBySessionAndPlaybackStatusOrderBySortOrderAsc(session, "PLAYING");
        if (currentDj.isPresent()) {
            EventDJTrack dt = currentDj.get();
            dt.setPlaybackStatus("PLAYED");
            eventDJTrackRepository.save(dt);

            historyRepository.save(EventPlaybackHistory.builder()
                    .session(session)
                    .trackTitle(dt.getTitle())
                    .artist(dt.getArtist())
                    .sourceType(dt.getSourceType())
                    .sourceIdentifier(dt.getSourceIdentifier())
                    .playlistSource("DJ_DECK")
                    .requestedStartSeconds(dt.getStartSeconds())
                    .playedDurationSeconds(dt.getDurationSeconds())
                    .outcome(outcome)
                    .startedAt(Instant.now())
                    .endedAt(Instant.now())
                    .build());
        }
    }
}
