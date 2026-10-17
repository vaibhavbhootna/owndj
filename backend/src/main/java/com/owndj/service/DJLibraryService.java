package com.owndj.service;

import com.owndj.dto.DJPlaylistDto;
import com.owndj.dto.DJPlaylistTrackDto;
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
public class DJLibraryService {

    private final DJPlaylistRepository djPlaylistRepository;
    private final DJPlaylistTrackRepository djPlaylistTrackRepository;
    private final EventDJTrackRepository eventDJTrackRepository;
    private final SessionService sessionService;

    @Transactional(readOnly = true)
    public List<DJPlaylistDto> listPlaylists(String eventType) {
        List<DJPlaylist> list = (eventType != null && !eventType.isBlank())
                ? djPlaylistRepository.findByEventTypeOrderByUpdatedAtDesc(eventType)
                : djPlaylistRepository.findByOrderByUpdatedAtDesc();

        return list.stream().map(this::mapToDtoSummary).collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public DJPlaylistDto getPlaylist(String playlistId) {
        DJPlaylist playlist = djPlaylistRepository.findById(UUID.fromString(playlistId))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "DJ Playlist not found"));
        return mapToDtoFull(playlist);
    }

    @Transactional
    public DJPlaylistDto createPlaylist(DJPlaylistDto dto) {
        DJPlaylist playlist = DJPlaylist.builder()
                .name(dto.getName() != null ? dto.getName().trim() : "Untitled DJ Set")
                .description(dto.getDescription())
                .tags(dto.getTags())
                .genre(dto.getGenre())
                .mood(dto.getMood())
                .eventType(dto.getEventType() != null ? dto.getEventType() : "PARTY")
                .estimatedDurationSeconds(0)
                .trackCount(0)
                .createdAt(Instant.now())
                .updatedAt(Instant.now())
                .build();

        playlist = djPlaylistRepository.save(playlist);

        if (dto.getTracks() != null && !dto.getTracks().isEmpty()) {
            int totalDuration = 0;
            List<DJPlaylistTrack> tracks = new ArrayList<>();
            for (int i = 0; i < dto.getTracks().size(); i++) {
                DJPlaylistTrackDto td = dto.getTracks().get(i);
                totalDuration += td.getDurationSeconds();
                tracks.add(DJPlaylistTrack.builder()
                        .playlist(playlist)
                        .title(td.getTitle())
                        .artist(td.getArtist())
                        .album(td.getAlbum())
                        .sourceType(td.getSourceType() != null ? td.getSourceType() : "YOUTUBE")
                        .sourceIdentifier(td.getSourceIdentifier())
                        .durationSeconds(td.getDurationSeconds())
                        .startSeconds(td.getStartSeconds())
                        .transitionType(td.getTransitionType() != null ? td.getTransitionType() : "CROSSFADE")
                        .transitionDurationSeconds(td.getTransitionDurationSeconds() > 0 ? td.getTransitionDurationSeconds() : 5)
                        .isFavorite(td.isFavorite())
                        .notes(td.getNotes())
                        .sortOrder(i)
                        .build());
            }
            djPlaylistTrackRepository.saveAll(tracks);
            playlist.setTrackCount(tracks.size());
            playlist.setEstimatedDurationSeconds(totalDuration);
            playlist = djPlaylistRepository.save(playlist);
        }

        log.info("Created reusable DJ Set '{}' with {} tracks", playlist.getName(), playlist.getTrackCount());
        return mapToDtoFull(playlist);
    }

    @Transactional
    public DJPlaylistDto saveDeckAsPlaylist(String roomCode, String hostToken, String name, String description, String eventType) {
        Session session = sessionService.findSessionByRoomCode(roomCode);
        sessionService.validateHostToken(session, hostToken);

        List<EventDJTrack> deckTracks = eventDJTrackRepository.findBySessionOrderBySortOrderAsc(session);
        if (deckTracks.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Cannot save an empty deck as a playlist");
        }

        int totalDuration = deckTracks.stream().mapToInt(EventDJTrack::getDurationSeconds).sum();

        DJPlaylist playlist = DJPlaylist.builder()
                .name(name != null && !name.isBlank() ? name.trim() : session.getName() + " Set")
                .description(description)
                .eventType(eventType != null ? eventType : session.getEventType())
                .trackCount(deckTracks.size())
                .estimatedDurationSeconds(totalDuration)
                .createdAt(Instant.now())
                .updatedAt(Instant.now())
                .build();

        playlist = djPlaylistRepository.save(playlist);

        List<DJPlaylistTrack> tracks = new ArrayList<>();
        for (int i = 0; i < deckTracks.size(); i++) {
            EventDJTrack dt = deckTracks.get(i);
            tracks.add(DJPlaylistTrack.builder()
                    .playlist(playlist)
                    .title(dt.getTitle())
                    .artist(dt.getArtist())
                    .album(dt.getAlbum())
                    .sourceType(dt.getSourceType())
                    .sourceIdentifier(dt.getSourceIdentifier())
                    .durationSeconds(dt.getDurationSeconds())
                    .startSeconds(dt.getStartSeconds())
                    .transitionType(dt.getTransitionType())
                    .transitionDurationSeconds(dt.getTransitionDurationSeconds())
                    .isFavorite(dt.getIsFavorite())
                    .notes(dt.getNotes())
                    .sortOrder(i)
                    .build());
        }

        djPlaylistTrackRepository.saveAll(tracks);
        log.info("Saved event {} deck as reusable DJ Set '{}' ({})", roomCode, playlist.getName(), playlist.getId());
        return mapToDtoFull(playlist);
    }

    @Transactional
    public DJPlaylistDto updatePlaylist(String playlistId, DJPlaylistDto dto) {
        DJPlaylist playlist = djPlaylistRepository.findById(UUID.fromString(playlistId))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "DJ Playlist not found"));

        if (dto.getName() != null && !dto.getName().isBlank()) playlist.setName(dto.getName().trim());
        if (dto.getDescription() != null) playlist.setDescription(dto.getDescription());
        if (dto.getTags() != null) playlist.setTags(dto.getTags());
        if (dto.getGenre() != null) playlist.setGenre(dto.getGenre());
        if (dto.getMood() != null) playlist.setMood(dto.getMood());
        if (dto.getEventType() != null) playlist.setEventType(dto.getEventType());
        playlist.setUpdatedAt(Instant.now());

        playlist = djPlaylistRepository.save(playlist);
        return mapToDtoFull(playlist);
    }

    @Transactional
    public DJPlaylistDto duplicatePlaylist(String playlistId, String newName) {
        DJPlaylist original = djPlaylistRepository.findById(UUID.fromString(playlistId))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "DJ Playlist not found"));

        List<DJPlaylistTrack> originalTracks = djPlaylistTrackRepository.findByPlaylistOrderBySortOrderAsc(original);

        DJPlaylist duplicate = DJPlaylist.builder()
                .name(newName != null && !newName.isBlank() ? newName.trim() : original.getName() + " (Copy)")
                .description(original.getDescription())
                .tags(original.getTags())
                .genre(original.getGenre())
                .mood(original.getMood())
                .eventType(original.getEventType())
                .trackCount(original.getTrackCount())
                .estimatedDurationSeconds(original.getEstimatedDurationSeconds())
                .createdAt(Instant.now())
                .updatedAt(Instant.now())
                .build();

        duplicate = djPlaylistRepository.save(duplicate);

        List<DJPlaylistTrack> clonedTracks = new ArrayList<>();
        for (int i = 0; i < originalTracks.size(); i++) {
            DJPlaylistTrack t = originalTracks.get(i);
            clonedTracks.add(DJPlaylistTrack.builder()
                    .playlist(duplicate)
                    .title(t.getTitle())
                    .artist(t.getArtist())
                    .album(t.getAlbum())
                    .sourceType(t.getSourceType())
                    .sourceIdentifier(t.getSourceIdentifier())
                    .durationSeconds(t.getDurationSeconds())
                    .startSeconds(t.getStartSeconds())
                    .transitionType(t.getTransitionType())
                    .transitionDurationSeconds(t.getTransitionDurationSeconds())
                    .isFavorite(t.getIsFavorite())
                    .notes(t.getNotes())
                    .sortOrder(i)
                    .build());
        }
        djPlaylistTrackRepository.saveAll(clonedTracks);
        return mapToDtoFull(duplicate);
    }

    @Transactional
    public void deletePlaylist(String playlistId) {
        UUID id = UUID.fromString(playlistId);
        if (!djPlaylistRepository.existsById(id)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "DJ Playlist not found");
        }
        djPlaylistRepository.deleteById(id);
    }

    @Transactional
    public DJPlaylistDto addTrackToPlaylist(String playlistId, DJPlaylistTrackDto td) {
        DJPlaylist playlist = djPlaylistRepository.findById(UUID.fromString(playlistId))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "DJ Playlist not found"));

        List<DJPlaylistTrack> tracks = djPlaylistTrackRepository.findByPlaylistOrderBySortOrderAsc(playlist);

        DJPlaylistTrack track = DJPlaylistTrack.builder()
                .playlist(playlist)
                .title(td.getTitle())
                .artist(td.getArtist())
                .album(td.getAlbum())
                .sourceType(td.getSourceType() != null ? td.getSourceType() : "YOUTUBE")
                .sourceIdentifier(td.getSourceIdentifier())
                .durationSeconds(td.getDurationSeconds())
                .startSeconds(td.getStartSeconds())
                .transitionType(td.getTransitionType() != null ? td.getTransitionType() : "CROSSFADE")
                .transitionDurationSeconds(td.getTransitionDurationSeconds() > 0 ? td.getTransitionDurationSeconds() : 5)
                .isFavorite(td.isFavorite())
                .notes(td.getNotes())
                .sortOrder(tracks.size())
                .build();

        djPlaylistTrackRepository.save(track);

        playlist.setTrackCount(tracks.size() + 1);
        playlist.setEstimatedDurationSeconds(playlist.getEstimatedDurationSeconds() + td.getDurationSeconds());
        playlist.setUpdatedAt(Instant.now());
        djPlaylistRepository.save(playlist);

        return mapToDtoFull(playlist);
    }

    @Transactional
    public DJPlaylistDto removeTrackFromPlaylist(String playlistId, String trackId) {
        DJPlaylist playlist = djPlaylistRepository.findById(UUID.fromString(playlistId))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "DJ Playlist not found"));

        DJPlaylistTrack track = djPlaylistTrackRepository.findById(UUID.fromString(trackId))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Track not found"));

        djPlaylistTrackRepository.delete(track);

        List<DJPlaylistTrack> remaining = djPlaylistTrackRepository.findByPlaylistOrderBySortOrderAsc(playlist);
        int totalDur = 0;
        for (int i = 0; i < remaining.size(); i++) {
            remaining.get(i).setSortOrder(i);
            totalDur += remaining.get(i).getDurationSeconds();
        }
        djPlaylistTrackRepository.saveAll(remaining);

        playlist.setTrackCount(remaining.size());
        playlist.setEstimatedDurationSeconds(totalDur);
        playlist.setUpdatedAt(Instant.now());
        djPlaylistRepository.save(playlist);

        return mapToDtoFull(playlist);
    }

    public DJPlaylistDto mapToDtoSummary(DJPlaylist p) {
        return DJPlaylistDto.builder()
                .id(p.getId())
                .name(p.getName())
                .description(p.getDescription())
                .tags(p.getTags())
                .genre(p.getGenre())
                .mood(p.getMood())
                .eventType(p.getEventType())
                .estimatedDurationSeconds(p.getEstimatedDurationSeconds())
                .trackCount(p.getTrackCount())
                .createdAt(p.getCreatedAt())
                .updatedAt(p.getUpdatedAt())
                .tracks(Collections.emptyList())
                .build();
    }

    public DJPlaylistDto mapToDtoFull(DJPlaylist p) {
        List<DJPlaylistTrack> tracks = djPlaylistTrackRepository.findByPlaylistOrderBySortOrderAsc(p);
        List<DJPlaylistTrackDto> trackDtos = tracks.stream()
                .map(t -> DJPlaylistTrackDto.builder()
                        .id(t.getId())
                        .playlistId(p.getId())
                        .title(t.getTitle())
                        .artist(t.getArtist())
                        .album(t.getAlbum())
                        .sourceType(t.getSourceType())
                        .sourceIdentifier(t.getSourceIdentifier())
                        .durationSeconds(t.getDurationSeconds())
                        .startSeconds(t.getStartSeconds())
                        .transitionType(t.getTransitionType())
                        .transitionDurationSeconds(t.getTransitionDurationSeconds())
                        .isFavorite(t.getIsFavorite())
                        .notes(t.getNotes())
                        .sortOrder(t.getSortOrder())
                        .build())
                .collect(Collectors.toList());

        return DJPlaylistDto.builder()
                .id(p.getId())
                .name(p.getName())
                .description(p.getDescription())
                .tags(p.getTags())
                .genre(p.getGenre())
                .mood(p.getMood())
                .eventType(p.getEventType())
                .estimatedDurationSeconds(p.getEstimatedDurationSeconds())
                .trackCount(trackDtos.size())
                .createdAt(p.getCreatedAt())
                .updatedAt(p.getUpdatedAt())
                .tracks(trackDtos)
                .build();
    }
}
