package com.owndj.service;

import com.owndj.dto.EventDJTrackDto;
import com.owndj.model.*;
import com.owndj.repository.*;
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
public class DJDeckService {

    private final EventDJTrackRepository eventDJTrackRepository;
    private final DJPlaylistRepository djPlaylistRepository;
    private final DJPlaylistTrackRepository djPlaylistTrackRepository;
    private final SessionRepository sessionRepository;
    private final SessionService sessionService;
    private final NotificationService notificationService;

    @Transactional(readOnly = true)
    public List<EventDJTrackDto> getDeck(String roomCode) {
        Session session = sessionService.findSessionByRoomCode(roomCode);
        return eventDJTrackRepository.findBySessionOrderBySortOrderAsc(session).stream()
                .map(this::mapToDto)
                .collect(Collectors.toList());
    }

    @Transactional
    public EventDJTrackDto addTrackToDeck(String roomCode, String hostToken, EventDJTrackDto dto) {
        Session session = sessionService.findSessionByRoomCode(roomCode);
        sessionService.validateHostToken(session, hostToken);

        int currentCount = eventDJTrackRepository.countBySession(session);

        EventDJTrack track = EventDJTrack.builder()
                .session(session)
                .title(dto.getTitle() != null ? dto.getTitle().trim() : "Unknown Title")
                .artist(dto.getArtist() != null ? dto.getArtist().trim() : "Unknown Artist")
                .album(dto.getAlbum())
                .sourceType(dto.getSourceType() != null ? dto.getSourceType() : "YOUTUBE")
                .sourceIdentifier(dto.getSourceIdentifier())
                .durationSeconds(dto.getDurationSeconds())
                .startSeconds(dto.getStartSeconds())
                .transitionType(dto.getTransitionType() != null ? dto.getTransitionType() : "CROSSFADE")
                .transitionDurationSeconds(dto.getTransitionDurationSeconds() > 0 ? dto.getTransitionDurationSeconds() : 5)
                .isFavorite(dto.isFavorite())
                .notes(dto.getNotes())
                .sortOrder(currentCount)
                .playbackStatus("UNPLAYED")
                .createdAt(Instant.now())
                .build();

        track = eventDJTrackRepository.save(track);
        log.info("Added track to DJ Deck in session {}: {} by {}", roomCode, track.getTitle(), track.getArtist());

        EventDJTrackDto result = mapToDto(track);
        broadcastDeckUpdate(roomCode);
        return result;
    }

    @Transactional
    public EventDJTrackDto updateTrack(String trackId, String hostToken, EventDJTrackDto dto) {
        EventDJTrack track = eventDJTrackRepository.findById(UUID.fromString(trackId))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "DJ Track not found"));
        sessionService.validateHostToken(track.getSession(), hostToken);

        if (dto.getTitle() != null) track.setTitle(dto.getTitle().trim());
        if (dto.getArtist() != null) track.setArtist(dto.getArtist().trim());
        if (dto.getAlbum() != null) track.setAlbum(dto.getAlbum());
        if (dto.getStartSeconds() >= 0) track.setStartSeconds(dto.getStartSeconds());
        if (dto.getTransitionType() != null) track.setTransitionType(dto.getTransitionType());
        if (dto.getTransitionDurationSeconds() > 0) track.setTransitionDurationSeconds(dto.getTransitionDurationSeconds());
        track.setIsFavorite(dto.isFavorite());
        if (dto.getNotes() != null) track.setNotes(dto.getNotes());
        if (dto.getPlaybackStatus() != null) track.setPlaybackStatus(dto.getPlaybackStatus());

        track = eventDJTrackRepository.save(track);
        broadcastDeckUpdate(track.getSession().getRoomCode());
        return mapToDto(track);
    }

    @Transactional
    public void removeTrack(String trackId, String hostToken) {
        EventDJTrack track = eventDJTrackRepository.findById(UUID.fromString(trackId))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "DJ Track not found"));
        Session session = track.getSession();
        sessionService.validateHostToken(session, hostToken);

        eventDJTrackRepository.delete(track);

        // Re-index sort order
        List<EventDJTrack> remaining = eventDJTrackRepository.findBySessionOrderBySortOrderAsc(session);
        for (int i = 0; i < remaining.size(); i++) {
            remaining.get(i).setSortOrder(i);
        }
        eventDJTrackRepository.saveAll(remaining);

        broadcastDeckUpdate(session.getRoomCode());
    }

    @Transactional
    public List<EventDJTrackDto> reorderDeck(String roomCode, String hostToken, List<String> trackIds) {
        Session session = sessionService.findSessionByRoomCode(roomCode);
        sessionService.validateHostToken(session, hostToken);

        List<EventDJTrack> tracks = eventDJTrackRepository.findBySessionOrderBySortOrderAsc(session);
        Map<String, EventDJTrack> trackMap = tracks.stream()
                .collect(Collectors.toMap(t -> t.getId().toString(), t -> t));

        List<EventDJTrack> reordered = new ArrayList<>();
        for (int i = 0; i < trackIds.size(); i++) {
            EventDJTrack t = trackMap.get(trackIds.get(i));
            if (t != null) {
                t.setSortOrder(i);
                reordered.add(t);
            }
        }
        eventDJTrackRepository.saveAll(reordered);
        broadcastDeckUpdate(roomCode);
        return reordered.stream().map(this::mapToDto).collect(Collectors.toList());
    }

    @Transactional
    public List<EventDJTrackDto> loadPlaylistIntoDeck(String roomCode, String hostToken, String playlistId, boolean replaceExisting) {
        Session session = sessionService.findSessionByRoomCode(roomCode);
        sessionService.validateHostToken(session, hostToken);

        DJPlaylist playlist = djPlaylistRepository.findById(UUID.fromString(playlistId))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Playlist not found in DJ Library"));

        if (replaceExisting) {
            eventDJTrackRepository.deleteBySession(session);
            session.setCurrentDjTrackIndex(0);
            sessionRepository.save(session);
        }

        int startSortOrder = replaceExisting ? 0 : eventDJTrackRepository.countBySession(session);
        List<DJPlaylistTrack> playlistTracks = djPlaylistTrackRepository.findByPlaylistOrderBySortOrderAsc(playlist);

        List<EventDJTrack> eventTracks = new ArrayList<>();
        for (int i = 0; i < playlistTracks.size(); i++) {
            DJPlaylistTrack pt = playlistTracks.get(i);
            eventTracks.add(EventDJTrack.builder()
                    .session(session)
                    .title(pt.getTitle())
                    .artist(pt.getArtist())
                    .album(pt.getAlbum())
                    .sourceType(pt.getSourceType())
                    .sourceIdentifier(pt.getSourceIdentifier())
                    .durationSeconds(pt.getDurationSeconds())
                    .startSeconds(pt.getStartSeconds())
                    .transitionType(pt.getTransitionType())
                    .transitionDurationSeconds(pt.getTransitionDurationSeconds())
                    .isFavorite(pt.getIsFavorite())
                    .notes(pt.getNotes())
                    .sortOrder(startSortOrder + i)
                    .playbackStatus("UNPLAYED")
                    .createdAt(Instant.now())
                    .build());
        }

        eventDJTrackRepository.saveAll(eventTracks);
        log.info("Loaded {} tracks from DJ Playlist '{}' into event {}", eventTracks.size(), playlist.getName(), roomCode);

        broadcastDeckUpdate(roomCode);
        return getDeck(roomCode);
    }

    @Transactional
    public List<EventDJTrackDto> shuffleDeck(String roomCode, String hostToken) {
        Session session = sessionService.findSessionByRoomCode(roomCode);
        sessionService.validateHostToken(session, hostToken);

        List<EventDJTrack> tracks = eventDJTrackRepository.findBySessionOrderBySortOrderAsc(session);
        List<EventDJTrack> unplayed = tracks.stream()
                .filter(t -> "UNPLAYED".equalsIgnoreCase(t.getPlaybackStatus()))
                .collect(Collectors.toList());

        Collections.shuffle(unplayed);

        // Put unplayed tracks in shuffled order
        int baseOrder = tracks.size() - unplayed.size();
        for (int i = 0; i < unplayed.size(); i++) {
            unplayed.get(i).setSortOrder(baseOrder + i);
        }
        eventDJTrackRepository.saveAll(unplayed);

        broadcastDeckUpdate(roomCode);
        return getDeck(roomCode);
    }

    @Transactional
    public void clearDeck(String roomCode, String hostToken) {
        Session session = sessionService.findSessionByRoomCode(roomCode);
        sessionService.validateHostToken(session, hostToken);

        eventDJTrackRepository.deleteBySession(session);
        session.setCurrentDjTrackIndex(0);
        sessionRepository.save(session);

        broadcastDeckUpdate(roomCode);
    }

    public void broadcastDeckUpdate(String roomCode) {
        notificationService.broadcast(roomCode, "DJ_DECK_UPDATED", getDeck(roomCode));
    }

    public EventDJTrackDto mapToDto(EventDJTrack track) {
        return EventDJTrackDto.builder()
                .id(track.getId())
                .roomCode(track.getSession().getRoomCode())
                .title(track.getTitle())
                .artist(track.getArtist())
                .album(track.getAlbum())
                .sourceType(track.getSourceType())
                .sourceIdentifier(track.getSourceIdentifier())
                .durationSeconds(track.getDurationSeconds())
                .startSeconds(track.getStartSeconds())
                .transitionType(track.getTransitionType())
                .transitionDurationSeconds(track.getTransitionDurationSeconds())
                .isFavorite(track.getIsFavorite())
                .notes(track.getNotes())
                .sortOrder(track.getSortOrder())
                .playbackStatus(track.getPlaybackStatus())
                .createdAt(track.getCreatedAt())
                .build();
    }
}
