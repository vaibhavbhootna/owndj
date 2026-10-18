package com.owndj.service;

import com.owndj.dto.EventDJTrackDto;
import com.owndj.dto.LibraryTrackMatchDto;
import com.owndj.dto.ResolveSongItemDto;
import com.owndj.dto.SongDto;
import com.owndj.dto.SongSearchResult;
import com.owndj.dto.UniversalSearchResponseDto;
import com.owndj.model.*;
import com.owndj.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.io.BufferedReader;
import java.io.StringReader;
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
    private final SongRepository songRepository;
    private final SessionRepository sessionRepository;
    private final SessionService sessionService;
    private final YouTubeService youTubeService;
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
        if (dto.getDurationSeconds() > 0) track.setDurationSeconds(dto.getDurationSeconds());
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
    public List<EventDJTrackDto> setAllTracksDuration(String roomCode, String hostToken, int durationSeconds) {
        Session session = sessionService.findSessionByRoomCode(roomCode);
        sessionService.validateHostToken(session, hostToken);

        List<EventDJTrack> tracks = eventDJTrackRepository.findBySessionOrderBySortOrderAsc(session);
        for (EventDJTrack t : tracks) {
            t.setDurationSeconds(durationSeconds);
        }
        tracks = eventDJTrackRepository.saveAll(tracks);
        broadcastDeckUpdate(roomCode);
        log.info("Set duration to {}s for all {} tracks in deck for session {}", durationSeconds, tracks.size(), roomCode);
        return tracks.stream().map(this::mapToDto).collect(Collectors.toList());
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

    @Transactional
    public List<EventDJTrackDto> importYouTubePlaylist(String roomCode, String hostToken, String playlistUrlOrId, boolean replaceExisting) {
        Session session = sessionService.findSessionByRoomCode(roomCode);
        sessionService.validateHostToken(session, hostToken);

        List<SongSearchResult> tracks = youTubeService.fetchPlaylistTracks(playlistUrlOrId);
        if (tracks.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "No tracks found in YouTube playlist");
        }

        if (replaceExisting) {
            eventDJTrackRepository.deleteBySession(session);
        }

        int startSort = replaceExisting ? 0 : eventDJTrackRepository.countBySession(session);
        List<EventDJTrack> deckTracks = new ArrayList<>();

        for (int i = 0; i < tracks.size(); i++) {
            SongSearchResult s = tracks.get(i);
            deckTracks.add(EventDJTrack.builder()
                    .session(session)
                    .title(s.getTitle())
                    .artist(s.getChannelTitle())
                    .album("YouTube Playlist")
                    .sourceType("YOUTUBE")
                    .sourceIdentifier(s.getVideoId())
                    .durationSeconds(s.getDurationSeconds() > 0 ? s.getDurationSeconds() : 210)
                    .startSeconds(0)
                    .transitionType("CROSSFADE")
                    .transitionDurationSeconds(5)
                    .playbackStatus("UNPLAYED")
                    .sortOrder(startSort + i)
                    .createdAt(Instant.now())
                    .build());
        }

        eventDJTrackRepository.saveAll(deckTracks);
        log.info("Imported {} YouTube playlist tracks into session {} deck", deckTracks.size(), roomCode);
        broadcastDeckUpdate(roomCode);

        return eventDJTrackRepository.findBySessionOrderBySortOrderAsc(session).stream()
                .map(this::mapToDto)
                .collect(Collectors.toList());
    }

    @Transactional
    public List<EventDJTrackDto> importYouTubeCsv(String roomCode, String hostToken, String csvContent, boolean replaceExisting) {
        Session session = sessionService.findSessionByRoomCode(roomCode);
        sessionService.validateHostToken(session, hostToken);

        if (csvContent == null || csvContent.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "CSV content is empty");
        }

        List<EventDJTrack> newTracks = new ArrayList<>();
        int startSort = replaceExisting ? 0 : eventDJTrackRepository.countBySession(session);

        try (BufferedReader reader = new BufferedReader(new StringReader(csvContent))) {
            String line;
            boolean isHeader = true;
            while ((line = reader.readLine()) != null) {
                line = line.trim();
                if (line.isEmpty() || line.startsWith("#")) continue;

                // Check header
                if (isHeader && (line.toLowerCase().contains("title") || line.toLowerCase().contains("url") || line.toLowerCase().contains("http"))) {
                    if (line.toLowerCase().startsWith("http") || line.matches("^[a-zA-Z0-9_-]{11}$")) {
                        isHeader = false;
                    } else {
                        isHeader = false;
                        continue;
                    }
                }
                isHeader = false;

                String[] parts = line.split(",(?=(?:[^\"]*\"[^\"]*\")*[^\"]*$)", -1);
                String videoId = null;
                String title = null;
                String artist = "YouTube Artist";
                int duration = 210;
                int startSec = 0;

                for (int pIdx = 0; pIdx < parts.length; pIdx++) {
                    String clean = parts[pIdx].replaceAll("^\"|\"$", "").trim();
                    String extracted = youTubeService.extractVideoId(clean);
                    if (extracted != null) {
                        videoId = extracted;
                        if (pIdx > 0) {
                            title = parts[0].replaceAll("^\"|\"$", "").trim();
                            if (pIdx > 1) {
                                artist = parts[1].replaceAll("^\"|\"$", "").trim();
                            }
                        } else if (parts.length > 1) {
                            title = parts[1].replaceAll("^\"|\"$", "").trim();
                        }
                        break;
                    }
                }

                if (videoId == null) {
                    ResolveSongItemDto resolved = youTubeService.resolveSong(line, true);
                    if (resolved != null && resolved.getSelectedMatch() != null) {
                        videoId = resolved.getSelectedMatch().getVideoId();
                        title = resolved.getSelectedMatch().getTitle();
                        artist = resolved.getSelectedMatch().getChannelTitle();
                        duration = resolved.getSelectedMatch().getDurationSeconds();
                    }
                }

                if (videoId == null) continue;

                if (title == null || title.isBlank() || title.equalsIgnoreCase(videoId)) {
                    SongSearchResult details = youTubeService.fetchVideoDetails(videoId);
                    if (details != null) {
                        title = details.getTitle();
                        artist = details.getChannelTitle();
                        duration = details.getDurationSeconds();
                    } else {
                        title = "YouTube Track (" + videoId + ")";
                    }
                }

                newTracks.add(EventDJTrack.builder()
                        .session(session)
                        .title(title)
                        .artist(artist)
                        .album("CSV Import")
                        .sourceType("YOUTUBE")
                        .sourceIdentifier(videoId)
                        .durationSeconds(duration)
                        .startSeconds(startSec)
                        .transitionType("CROSSFADE")
                        .transitionDurationSeconds(5)
                        .playbackStatus("UNPLAYED")
                        .sortOrder(startSort + newTracks.size())
                        .createdAt(Instant.now())
                        .build());
            }
        } catch (Exception e) {
            log.error("Error parsing YouTube CSV: {}", e.getMessage());
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Failed to parse YouTube CSV: " + e.getMessage());
        }

        if (newTracks.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "No valid YouTube URLs or video IDs found in CSV");
        }

        if (replaceExisting) {
            eventDJTrackRepository.deleteBySession(session);
        }

        eventDJTrackRepository.saveAll(newTracks);
        log.info("Imported {} YouTube tracks from CSV into session {} deck", newTracks.size(), roomCode);
        broadcastDeckUpdate(roomCode);

        return eventDJTrackRepository.findBySessionOrderBySortOrderAsc(session).stream()
                .map(this::mapToDto)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public UniversalSearchResponseDto universalSearch(String roomCode, String query) {
        if (query == null || query.isBlank()) {
            return UniversalSearchResponseDto.builder().query("").totalMatches(0).build();
        }
        String q = query.trim();

        // 1. Current Session Event DJ Deck matches
        List<EventDJTrackDto> deckMatches = Collections.emptyList();
        if (roomCode != null && !roomCode.isBlank()) {
            try {
                Session session = sessionService.findSessionByRoomCode(roomCode);
                deckMatches = eventDJTrackRepository.searchDeckTracks(session, q).stream()
                        .map(this::mapToDto)
                        .collect(Collectors.toList());
            } catch (Exception e) {
                log.debug("Session not found or error searching deck: {}", e.getMessage());
            }
        }

        // 2. Saved DJ Library Sets matches
        List<LibraryTrackMatchDto> libraryMatches = djPlaylistTrackRepository.searchLibraryTracks(q).stream()
                .map(t -> LibraryTrackMatchDto.builder()
                        .trackId(t.getId())
                        .playlistId(t.getPlaylist().getId())
                        .playlistName(t.getPlaylist().getName())
                        .title(t.getTitle())
                        .artist(t.getArtist())
                        .album(t.getAlbum())
                        .sourceType(t.getSourceType())
                        .sourceIdentifier(t.getSourceIdentifier())
                        .durationSeconds(t.getDurationSeconds())
                        .startSeconds(t.getStartSeconds())
                        .notes(t.getNotes())
                        .build())
                .collect(Collectors.toList());

        // 3. Local Music Library matches
        List<SongDto> localMatches = songRepository.findByTitleContainingIgnoreCaseOrChannelTitleContainingIgnoreCase(q, q).stream()
                .map(s -> SongDto.builder()
                        .id(s.getId())
                        .title(s.getTitle())
                        .channelTitle(s.getChannelTitle())
                        .durationSeconds(s.getDurationSeconds())
                        .youtubeVideoId(s.getYoutubeVideoId())
                        .thumbnailUrl(s.getThumbnailUrl())
                        .embeddableStatus(s.getEmbeddableStatus())
                        .build())
                .collect(Collectors.toList());

        // 4. YouTube matches
        List<SongSearchResult> youtubeMatches = youTubeService.search(q);

        int total = deckMatches.size() + libraryMatches.size() + localMatches.size() + youtubeMatches.size();

        return UniversalSearchResponseDto.builder()
                .query(q)
                .eventDeckMatches(deckMatches)
                .librarySetMatches(libraryMatches)
                .localMusicMatches(localMatches)
                .youTubeMatches(youtubeMatches)
                .totalMatches(total)
                .build();
    }

    @Transactional
    public List<EventDJTrackDto> importResolvedTracks(
            String roomCode,
            String hostToken,
            List<Map<String, Object>> tracks,
            boolean replaceExisting) {
        Session session = sessionService.findSessionByRoomCode(roomCode);
        sessionService.validateHostToken(session, hostToken);

        if (tracks == null || tracks.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "No tracks provided to import");
        }

        if (replaceExisting) {
            eventDJTrackRepository.deleteBySession(session);
        }

        int startSort = replaceExisting ? 0 : eventDJTrackRepository.countBySession(session);
        List<EventDJTrack> deckTracks = new ArrayList<>();

        for (int i = 0; i < tracks.size(); i++) {
            Map<String, Object> t = tracks.get(i);
            String title = (String) t.getOrDefault("title", "Unknown Track");
            String artist = (String) t.getOrDefault("artist", (String) t.getOrDefault("channelTitle", "YouTube Artist"));
            String videoId = (String) t.getOrDefault("videoId", (String) t.getOrDefault("sourceIdentifier", ""));
            int durationSeconds = t.get("durationSeconds") instanceof Number ? ((Number) t.get("durationSeconds")).intValue() : 210;
            int startSeconds = t.get("startSeconds") instanceof Number ? ((Number) t.get("startSeconds")).intValue() : 0;
            String notes = (String) t.getOrDefault("notes", "");

            deckTracks.add(EventDJTrack.builder()
                    .session(session)
                    .title(title)
                    .artist(artist)
                    .album("Smart Song Resolver")
                    .sourceType("YOUTUBE")
                    .sourceIdentifier(videoId)
                    .durationSeconds(durationSeconds > 0 ? durationSeconds : 210)
                    .startSeconds(startSeconds)
                    .transitionType("CROSSFADE")
                    .transitionDurationSeconds(5)
                    .playbackStatus("UNPLAYED")
                    .sortOrder(startSort + i)
                    .notes(notes)
                    .createdAt(Instant.now())
                    .build());
        }

        eventDJTrackRepository.saveAll(deckTracks);
        log.info("Imported {} resolved tracks into session {} DJ Deck", deckTracks.size(), roomCode);
        broadcastDeckUpdate(roomCode);

        return eventDJTrackRepository.findBySessionOrderBySortOrderAsc(session).stream()
                .map(this::mapToDto)
                .collect(Collectors.toList());
    }
}
