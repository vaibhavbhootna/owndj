package com.owndj.service;

import com.owndj.dto.CreateSongRequestDto;
import com.owndj.dto.SongDto;
import com.owndj.dto.SongRequestDto;
import com.owndj.model.*;
import com.owndj.repository.*;
import com.owndj.security.RateLimiterService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.util.*;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class QueueService {

    private final SessionService sessionService;
    private final SongRequestRepository songRequestRepository;
    private final SongRepository songRepository;
    private final GuestRepository guestRepository;
    private final SongRequestVoteRepository voteRepository;
    private final RateLimiterService rateLimiterService;
    private final NotificationService notificationService;
    private final YouTubeService youTubeService;

    @Transactional
    public SongRequestDto submitRequest(String roomCode, String guestToken, CreateSongRequestDto dto) {
        Session session = sessionService.findSessionByRoomCode(roomCode);
        if (session.getStatus() == SessionStatus.ENDED) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Session has ended");
        }

        Guest guest = sessionService.validateGuestToken(session, guestToken);

        // Rate limit request submission per guest
        if (!rateLimiterService.allowRequest(guest.getId().toString())) {
            throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS, "Request limit exceeded. Please wait a moment.");
        }

        SessionSettings settings = session.getSettings();

        // Enforce max pending requests per guest
        long pendingCount = songRequestRepository.countBySessionIdAndGuestIdAndStatus(session.getId(), guest.getId(), RequestStatus.PENDING)
                + songRequestRepository.countBySessionIdAndGuestIdAndStatus(session.getId(), guest.getId(), RequestStatus.APPROVED);
        if (pendingCount >= settings.getMaxPendingRequestsPerGuest()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "You have reached the maximum pending requests limit (" + settings.getMaxPendingRequestsPerGuest() + "). Wait for your song to play!");
        }

        // Duplicate check
        boolean isDuplicate = songRequestRepository.existsActiveSongInSession(session.getId(), dto.getVideoId());
        if (isDuplicate && !settings.isAllowRepeatedSongs()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "This song is already in the queue or currently playing!");
        }

        // Find or create song record
        Song song = songRepository.findByYoutubeVideoId(dto.getVideoId())
                .orElseGet(() -> {
                    var details = youTubeService.fetchVideoDetails(dto.getVideoId());
                    int duration = details != null && details.getDurationSeconds() > 0 ? details.getDurationSeconds() : dto.getDurationSeconds();
                    String title = details != null ? details.getTitle() : dto.getTitle();
                    String channel = details != null ? details.getChannelTitle() : dto.getChannelTitle();
                    String thumb = details != null ? details.getThumbnailUrl() : dto.getThumbnailUrl();

                    Song newSong = Song.builder()
                            .youtubeVideoId(dto.getVideoId())
                            .title(title)
                            .channelTitle(channel)
                            .thumbnailUrl(thumb)
                            .durationSeconds(duration)
                            .embeddableStatus("EMBEDDABLE")
                            .metadataUpdatedAt(Instant.now())
                            .build();
                    return songRepository.save(newSong);
                });

        // Compute requested start & duration
        int startSeconds = Math.max(0, dto.getRequestedStartSeconds());
        if (!settings.isAllowCustomTimestamps() && startSeconds > 0) {
            startSeconds = 0;
        }

        int durationSeconds = dto.getRequestedDurationSeconds();
        if (settings.isDjDeterminesDuration()) {
            durationSeconds = settings.getDefaultSongDurationSeconds() > 0 ? settings.getDefaultSongDurationSeconds() : song.getDurationSeconds();
        } else if (durationSeconds <= 0 || (!settings.isAllowFullSongs() && durationSeconds > 120)) {
            durationSeconds = settings.getDefaultSongDurationSeconds() > 0 ? settings.getDefaultSongDurationSeconds() : 60;
        }

        // Endpoint clamping: start + duration cannot exceed song duration (if duration known)
        int endSeconds = startSeconds + durationSeconds;
        if (song.getDurationSeconds() > 0 && endSeconds > song.getDurationSeconds()) {
            endSeconds = song.getDurationSeconds();
            durationSeconds = Math.max(5, endSeconds - startSeconds);
        }

        RequestStatus initialStatus = settings.isAutoApproveRequests() ? RequestStatus.APPROVED : RequestStatus.PENDING;
        int nextQueuePosition = songRequestRepository.getMaxQueuePosition(session.getId()) + 1;

        SongRequest request = SongRequest.builder()
                .session(session)
                .guest(guest)
                .song(song)
                .requestedStartSeconds(startSeconds)
                .requestedDurationSeconds(durationSeconds)
                .requestedEndSeconds(endSeconds)
                .status(initialStatus)
                .queuePosition(nextQueuePosition)
                .createdAt(Instant.now())
                .approvedAt(initialStatus == RequestStatus.APPROVED ? Instant.now() : null)
                .build();

        request = songRequestRepository.save(request);
        log.info("Song request created: {} by guest {} in session {}", request.getId(), guest.getNickname(), roomCode);

        SongRequestDto dtoResponse = mapToDto(request, guest.getId(), isDuplicate);

        notificationService.broadcast(roomCode, "REQUEST_SUBMITTED", dtoResponse);
        notificationService.broadcast(roomCode, "QUEUE_UPDATED", getQueue(roomCode, guest.getId()));

        return dtoResponse;
    }

    @Transactional(readOnly = true)
    public List<SongRequestDto> getQueue(String roomCode, UUID currentGuestId) {
        Session session = sessionService.findSessionByRoomCode(roomCode);
        List<SongRequest> requests = songRequestRepository.findBySessionIdAndStatusInOrderByQueuePositionAscCreatedAtAsc(
                session.getId(),
                List.of(RequestStatus.PENDING, RequestStatus.APPROVED, RequestStatus.PLAYING)
        );

        return requests.stream()
                .map(r -> mapToDto(r, currentGuestId, false))
                .collect(Collectors.toList());
    }

    @Transactional
    public SongRequestDto approveRequest(UUID requestId, String hostToken) {
        SongRequest request = findRequestById(requestId);
        sessionService.validateHostToken(request.getSession(), hostToken);

        request.setStatus(RequestStatus.APPROVED);
        request.setApprovedAt(Instant.now());
        request = songRequestRepository.save(request);

        String roomCode = request.getSession().getRoomCode();
        SongRequestDto dto = mapToDto(request, null, false);
        notificationService.broadcast(roomCode, "REQUEST_APPROVED", dto);
        notificationService.broadcast(roomCode, "QUEUE_UPDATED", getQueue(roomCode, null));
        return dto;
    }

    @Transactional
    public SongRequestDto rejectRequest(UUID requestId, String hostToken) {
        SongRequest request = findRequestById(requestId);
        sessionService.validateHostToken(request.getSession(), hostToken);

        request.setStatus(RequestStatus.REJECTED);
        request = songRequestRepository.save(request);

        String roomCode = request.getSession().getRoomCode();
        SongRequestDto dto = mapToDto(request, null, false);
        notificationService.broadcast(roomCode, "REQUEST_REJECTED", dto);
        notificationService.broadcast(roomCode, "QUEUE_UPDATED", getQueue(roomCode, null));
        return dto;
    }

    @Transactional
    public void removeRequest(UUID requestId, String hostToken, String guestToken) {
        SongRequest request = findRequestById(requestId);
        Session session = request.getSession();

        boolean isHost = hostToken != null && sessionService.findSessionByRoomCode(session.getRoomCode()) != null;
        if (hostToken != null) {
            sessionService.validateHostToken(session, hostToken);
        } else if (guestToken != null) {
            Guest guest = sessionService.validateGuestToken(session, guestToken);
            if (!request.getGuest().getId().equals(guest.getId())) {
                throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Cannot cancel another guest's request");
            }
            if (request.getStatus() != RequestStatus.PENDING && request.getStatus() != RequestStatus.APPROVED) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Cannot cancel a request that is already playing or completed");
            }
        } else {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Authorization required");
        }

        songRequestRepository.delete(request);
        log.info("Request {} removed from queue in session {}", requestId, session.getRoomCode());

        String roomCode = session.getRoomCode();
        notificationService.broadcast(roomCode, "REQUEST_REMOVED", requestId);
        notificationService.broadcast(roomCode, "QUEUE_UPDATED", getQueue(roomCode, null));
    }

    @Transactional
    public List<SongRequestDto> reorderQueue(String roomCode, String hostToken, List<UUID> orderedRequestIds) {
        Session session = sessionService.findSessionByRoomCode(roomCode);
        sessionService.validateHostToken(session, hostToken);

        List<SongRequest> existing = songRequestRepository.findAllById(orderedRequestIds);
        Map<UUID, SongRequest> requestMap = existing.stream().collect(Collectors.toMap(SongRequest::getId, r -> r));

        for (int i = 0; i < orderedRequestIds.size(); i++) {
            UUID id = orderedRequestIds.get(i);
            SongRequest r = requestMap.get(id);
            if (r != null && r.getSession().getId().equals(session.getId())) {
                r.setQueuePosition(i + 1);
                songRequestRepository.save(r);
            }
        }

        List<SongRequestDto> updatedQueue = getQueue(roomCode, null);
        notificationService.broadcast(roomCode, "QUEUE_UPDATED", updatedQueue);
        return updatedQueue;
    }

    @Transactional
    public int voteRequest(UUID requestId, String guestToken) {
        SongRequest request = findRequestById(requestId);
        Session session = request.getSession();
        Guest guest = sessionService.validateGuestToken(session, guestToken);

        if (!session.getSettings().isAllowGuestVoting()) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Guest voting is disabled for this session");
        }

        Optional<SongRequestVote> existingVote = voteRepository.findBySongRequestIdAndGuestId(requestId, guest.getId());
        if (existingVote.isPresent()) {
            voteRepository.delete(existingVote.get());
        } else {
            SongRequestVote newVote = SongRequestVote.builder()
                    .songRequest(request)
                    .guest(guest)
                    .vote(1)
                    .createdAt(Instant.now())
                    .build();
            voteRepository.save(newVote);
        }

        int score = voteRepository.getVoteCountForRequest(requestId);
        notificationService.broadcast(session.getRoomCode(), "QUEUE_UPDATED", getQueue(session.getRoomCode(), null));
        return score;
    }

    public SongRequest findRequestById(UUID requestId) {
        return songRequestRepository.findById(requestId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Song request not found"));
    }

    public SongRequestDto mapToDto(SongRequest r, UUID currentGuestId, boolean isDuplicate) {
        int votes = voteRepository.getVoteCountForRequest(r.getId());
        boolean hasVoted = false;
        if (currentGuestId != null) {
            hasVoted = voteRepository.findBySongRequestIdAndGuestId(r.getId(), currentGuestId).isPresent();
        }

        SongDto songDto = SongDto.builder()
                .id(r.getSong().getId())
                .youtubeVideoId(r.getSong().getYoutubeVideoId())
                .title(r.getSong().getTitle())
                .channelTitle(r.getSong().getChannelTitle())
                .thumbnailUrl(r.getSong().getThumbnailUrl())
                .durationSeconds(r.getSong().getDurationSeconds())
                .embeddableStatus(r.getSong().getEmbeddableStatus())
                .build();

        return SongRequestDto.builder()
                .id(r.getId())
                .song(songDto)
                .guestNickname(r.getGuest().getNickname())
                .guestId(r.getGuest().getId())
                .requestedStartSeconds(r.getRequestedStartSeconds())
                .requestedDurationSeconds(r.getRequestedDurationSeconds())
                .requestedEndSeconds(r.getRequestedEndSeconds())
                .status(r.getStatus())
                .queuePosition(r.getQueuePosition())
                .votes(votes)
                .userVoted(hasVoted)
                .isDuplicate(isDuplicate)
                .createdAt(r.getCreatedAt())
                .approvedAt(r.getApprovedAt())
                .startedAt(r.getStartedAt())
                .completedAt(r.getCompletedAt())
                .selectedSourceType(r.getSelectedSourceType() != null ? r.getSelectedSourceType() : "YOUTUBE")
                .selectedSourceId(r.getSelectedSourceId() != null ? r.getSelectedSourceId() : r.getSong().getYoutubeVideoId())
                .build();
    }
}
