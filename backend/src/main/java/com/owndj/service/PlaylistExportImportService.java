package com.owndj.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.owndj.dto.DJPlaylistDto;
import com.owndj.dto.DJPlaylistTrackDto;
import com.owndj.dto.EventDJTrackDto;
import com.owndj.model.*;
import com.owndj.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.io.*;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.*;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class PlaylistExportImportService {

    private final EventDJTrackRepository eventDJTrackRepository;
    private final SongRequestRepository songRequestRepository;
    private final EventPlaybackHistoryRepository historyRepository;
    private final DJPlaylistRepository djPlaylistRepository;
    private final DJPlaylistTrackRepository djPlaylistTrackRepository;
    private final SessionService sessionService;
    private final ObjectMapper objectMapper;

    // ==========================================
    // EXPORT
    // ==========================================

    @Transactional(readOnly = true)
    public String exportDjDeck(String roomCode, String format) {
        Session session = sessionService.findSessionByRoomCode(roomCode);
        List<EventDJTrack> tracks = eventDJTrackRepository.findBySessionOrderBySortOrderAsc(session);

        return switch (format.toUpperCase()) {
            case "CSV" -> generateCsv(tracks.stream().map(t -> new ExportableTrack(
                    t.getTitle(), t.getArtist(), t.getAlbum(), t.getSourceType(), t.getSourceIdentifier(),
                    t.getDurationSeconds(), t.getStartSeconds(), t.getPlaybackStatus(), t.getNotes()
            )).collect(Collectors.toList()));
            case "M3U", "M3U8" -> generateM3u(tracks.stream().map(t -> new ExportableTrack(
                    t.getTitle(), t.getArtist(), t.getAlbum(), t.getSourceType(), t.getSourceIdentifier(),
                    t.getDurationSeconds(), t.getStartSeconds(), t.getPlaybackStatus(), t.getNotes()
            )).collect(Collectors.toList()), session.getName() + " - DJ Deck");
            case "TEXT", "PRINT" -> generatePrintableSetList(tracks.stream().map(t -> new ExportableTrack(
                    t.getTitle(), t.getArtist(), t.getAlbum(), t.getSourceType(), t.getSourceIdentifier(),
                    t.getDurationSeconds(), t.getStartSeconds(), t.getPlaybackStatus(), t.getNotes()
            )).collect(Collectors.toList()), session.getName() + " - DJ Deck");
            default -> generateJson(tracks);
        };
    }

    @Transactional(readOnly = true)
    public String exportGuestRequests(String roomCode, String statusFilter, String format) {
        Session session = sessionService.findSessionByRoomCode(roomCode);
        List<SongRequest> requests = songRequestRepository.findBySessionIdOrderByQueuePositionAscCreatedAtAsc(session.getId());

        if (statusFilter != null && !statusFilter.isBlank() && !"ALL".equalsIgnoreCase(statusFilter)) {
            try {
                RequestStatus reqStatus = RequestStatus.valueOf(statusFilter.toUpperCase());
                requests = requests.stream().filter(r -> r.getStatus() == reqStatus).collect(Collectors.toList());
            } catch (Exception ignored) {}
        }

        List<ExportableTrack> exportable = requests.stream().map(r -> new ExportableTrack(
                r.getSong().getTitle(),
                r.getSong().getChannelTitle(),
                "",
                r.getSelectedSourceType() != null ? r.getSelectedSourceType() : "YOUTUBE",
                r.getSong().getYoutubeVideoId(),
                r.getRequestedDurationSeconds(),
                r.getRequestedStartSeconds(),
                r.getStatus().name(),
                "Requested by: " + r.getGuest().getNickname()
        )).collect(Collectors.toList());

        return switch (format.toUpperCase()) {
            case "CSV" -> generateCsv(exportable);
            case "M3U", "M3U8" -> generateM3u(exportable, session.getName() + " - Guest Requests");
            case "TEXT", "PRINT" -> generatePrintableSetList(exportable, session.getName() + " - Guest Requests");
            default -> generateJson(exportable);
        };
    }

    @Transactional(readOnly = true)
    public String exportEventHistory(String roomCode, String format) {
        Session session = sessionService.findSessionByRoomCode(roomCode);
        List<EventPlaybackHistory> history = historyRepository.findBySessionOrderByStartedAtDesc(session);

        List<ExportableTrack> exportable = history.stream().map(h -> new ExportableTrack(
                h.getTrackTitle(),
                h.getArtist(),
                "",
                h.getSourceType(),
                h.getSourceIdentifier(),
                h.getPlayedDurationSeconds(),
                h.getRequestedStartSeconds(),
                h.getOutcome(),
                h.getPlaylistSource() + (h.getRequesterNickname() != null ? " (" + h.getRequesterNickname() + ")" : "")
        )).collect(Collectors.toList());

        return switch (format.toUpperCase()) {
            case "CSV" -> generateCsv(exportable);
            case "M3U", "M3U8" -> generateM3u(exportable, session.getName() + " - Playback History");
            case "TEXT", "PRINT" -> generatePrintableSetList(exportable, session.getName() + " - Playback History");
            default -> generateJson(exportable);
        };
    }

    // ==========================================
    // IMPORT
    // ==========================================

    @Transactional
    public DJPlaylistDto importIntoDjLibrary(String name, String content, String format) {
        List<ExportableTrack> tracks = parseImportContent(content, format);
        if (tracks.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "No valid tracks found in imported data");
        }

        int totalDur = tracks.stream().mapToInt(ExportableTrack::durationSeconds).sum();

        DJPlaylist playlist = DJPlaylist.builder()
                .name(name != null && !name.isBlank() ? name.trim() : "Imported Set - " + Instant.now())
                .trackCount(tracks.size())
                .estimatedDurationSeconds(totalDur)
                .createdAt(Instant.now())
                .updatedAt(Instant.now())
                .build();

        playlist = djPlaylistRepository.save(playlist);

        List<DJPlaylistTrack> playlistTracks = new ArrayList<>();
        for (int i = 0; i < tracks.size(); i++) {
            ExportableTrack t = tracks.get(i);
            playlistTracks.add(DJPlaylistTrack.builder()
                    .playlist(playlist)
                    .title(t.title())
                    .artist(t.artist())
                    .album(t.album())
                    .sourceType(t.sourceType() != null ? t.sourceType() : "YOUTUBE")
                    .sourceIdentifier(t.sourceIdentifier() != null ? t.sourceIdentifier() : "")
                    .durationSeconds(t.durationSeconds())
                    .startSeconds(t.startSeconds())
                    .sortOrder(i)
                    .notes(t.notes())
                    .build());
        }

        djPlaylistTrackRepository.saveAll(playlistTracks);
        log.info("Imported {} tracks into new DJ Library set '{}'", tracks.size(), playlist.getName());

        return DJPlaylistDto.builder()
                .id(playlist.getId())
                .name(playlist.getName())
                .trackCount(playlistTracks.size())
                .estimatedDurationSeconds(totalDur)
                .build();
    }

    @Transactional
    public List<EventDJTrackDto> importIntoEventDeck(String roomCode, String hostToken, String content, String format, boolean replaceExisting) {
        Session session = sessionService.findSessionByRoomCode(roomCode);
        sessionService.validateHostToken(session, hostToken);

        List<ExportableTrack> tracks = parseImportContent(content, format);
        if (tracks.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "No valid tracks found in imported data");
        }

        if (replaceExisting) {
            eventDJTrackRepository.deleteBySession(session);
        }

        int startSort = replaceExisting ? 0 : eventDJTrackRepository.countBySession(session);
        List<EventDJTrack> deckTracks = new ArrayList<>();

        for (int i = 0; i < tracks.size(); i++) {
            ExportableTrack t = tracks.get(i);
            deckTracks.add(EventDJTrack.builder()
                    .session(session)
                    .title(t.title())
                    .artist(t.artist())
                    .album(t.album())
                    .sourceType(t.sourceType() != null ? t.sourceType() : "YOUTUBE")
                    .sourceIdentifier(t.sourceIdentifier() != null ? t.sourceIdentifier() : "")
                    .durationSeconds(t.durationSeconds())
                    .startSeconds(t.startSeconds())
                    .playbackStatus("UNPLAYED")
                    .sortOrder(startSort + i)
                    .notes(t.notes())
                    .createdAt(Instant.now())
                    .build());
        }

        eventDJTrackRepository.saveAll(deckTracks);
        log.info("Imported {} tracks into event {} DJ Deck", deckTracks.size(), roomCode);

        return eventDJTrackRepository.findBySessionOrderBySortOrderAsc(session).stream()
                .map(t -> EventDJTrackDto.builder()
                        .id(t.getId())
                        .title(t.getTitle())
                        .artist(t.getArtist())
                        .durationSeconds(t.getDurationSeconds())
                        .playbackStatus(t.getPlaybackStatus())
                        .sortOrder(t.getSortOrder())
                        .build())
                .collect(Collectors.toList());
    }

    // ==========================================
    // FORMAT GENERATORS & PARSERS
    // ==========================================

    private String generateJson(Object object) {
        try {
            return objectMapper.writerWithDefaultPrettyPrinter().writeValueAsString(object);
        } catch (Exception e) {
            return "[]";
        }
    }

    private String generateCsv(List<ExportableTrack> tracks) {
        StringBuilder sb = new StringBuilder();
        sb.append("Title,Artist,Album,SourceType,SourceIdentifier,DurationSeconds,StartSeconds,Status,Notes\n");
        for (ExportableTrack t : tracks) {
            sb.append(escapeCsv(t.title())).append(",")
                    .append(escapeCsv(t.artist())).append(",")
                    .append(escapeCsv(t.album())).append(",")
                    .append(escapeCsv(t.sourceType())).append(",")
                    .append(escapeCsv(t.sourceIdentifier())).append(",")
                    .append(t.durationSeconds()).append(",")
                    .append(t.startSeconds()).append(",")
                    .append(escapeCsv(t.status())).append(",")
                    .append(escapeCsv(t.notes())).append("\n");
        }
        return sb.toString();
    }

    private String generateM3u(List<ExportableTrack> tracks, String title) {
        StringBuilder sb = new StringBuilder();
        sb.append("#EXTM3U\n");
        sb.append("#PLAYLIST:").append(title).append("\n");
        for (ExportableTrack t : tracks) {
            sb.append("#EXTINF:").append(t.durationSeconds()).append(",")
                    .append(t.artist() != null && !t.artist().isBlank() ? t.artist() + " - " : "")
                    .append(t.title()).append("\n");
            // Reference URL or identifier
            if ("YOUTUBE".equalsIgnoreCase(t.sourceType())) {
                sb.append("https://www.youtube.com/watch?v=").append(t.sourceIdentifier()).append("\n");
            } else {
                sb.append("local://").append(t.sourceIdentifier()).append("\n");
            }
        }
        return sb.toString();
    }

    private String generatePrintableSetList(List<ExportableTrack> tracks, String title) {
        StringBuilder sb = new StringBuilder();
        sb.append("============================================================\n");
        sb.append("   OWN DJ - EVENT SET LIST: ").append(title).append("\n");
        sb.append("============================================================\n\n");

        int totalSecs = 0;
        for (int i = 0; i < tracks.size(); i++) {
            ExportableTrack t = tracks.get(i);
            totalSecs += t.durationSeconds();
            int mins = t.durationSeconds() / 60;
            int secs = t.durationSeconds() % 60;
            sb.append(String.format("%2d. %-35s | %-20s | %02d:%02d | [%s]\n",
                    (i + 1),
                    truncate(t.title(), 35),
                    truncate(t.artist() != null ? t.artist() : "", 20),
                    mins, secs,
                    t.sourceType()
            ));
        }

        int totalMins = totalSecs / 60;
        sb.append("\n------------------------------------------------------------\n");
        sb.append(String.format("Total Tracks: %d | Total Runtime: %d mins (%d secs)\n", tracks.size(), totalMins, totalSecs));
        sb.append("============================================================\n");
        return sb.toString();
    }

    private List<ExportableTrack> parseImportContent(String content, String format) {
        List<ExportableTrack> tracks = new ArrayList<>();
        if (content == null || content.isBlank()) return tracks;

        if ("CSV".equalsIgnoreCase(format)) {
            try (BufferedReader reader = new BufferedReader(new StringReader(content))) {
                String line;
                boolean isHeader = true;
                while ((line = reader.readLine()) != null) {
                    if (isHeader) { isHeader = false; continue; }
                    String[] parts = line.split(",(?=(?:[^\"]*\"[^\"]*\")*[^\"]*$)", -1);
                    if (parts.length >= 2) {
                        String tTitle = unescapeCsv(parts[0]);
                        String tArtist = parts.length > 1 ? unescapeCsv(parts[1]) : "";
                        String tAlbum = parts.length > 2 ? unescapeCsv(parts[2]) : "";
                        String tSource = parts.length > 3 ? unescapeCsv(parts[3]) : "YOUTUBE";
                        String tId = parts.length > 4 ? unescapeCsv(parts[4]) : "";
                        int dur = parts.length > 5 ? parseInt(parts[5], 180) : 180;
                        int start = parts.length > 6 ? parseInt(parts[6], 0) : 0;
                        String notes = parts.length > 8 ? unescapeCsv(parts[8]) : "";
                        tracks.add(new ExportableTrack(tTitle, tArtist, tAlbum, tSource, tId, dur, start, "UNPLAYED", notes));
                    }
                }
            } catch (Exception e) {
                log.warn("Error parsing CSV import: {}", e.getMessage());
            }
        } else if ("M3U".equalsIgnoreCase(format) || "M3U8".equalsIgnoreCase(format) || content.startsWith("#EXTM3U")) {
            try (BufferedReader reader = new BufferedReader(new StringReader(content))) {
                String line;
                String currentTitle = null;
                int currentDuration = 180;
                while ((line = reader.readLine()) != null) {
                    line = line.trim();
                    if (line.startsWith("#EXTINF:")) {
                        String info = line.substring(8);
                        int comma = info.indexOf(',');
                        if (comma > 0) {
                            currentDuration = parseInt(info.substring(0, comma), 180);
                            currentTitle = info.substring(comma + 1).trim();
                        }
                    } else if (!line.startsWith("#") && !line.isBlank()) {
                        String sourceId = line;
                        String sourceType = "YOUTUBE";
                        if (line.contains("youtube.com/watch?v=")) {
                            sourceId = line.substring(line.indexOf("v=") + 2);
                            int amp = sourceId.indexOf('&');
                            if (amp > 0) sourceId = sourceId.substring(0, amp);
                        } else if (line.startsWith("local://")) {
                            sourceType = "LOCAL_MP3";
                            sourceId = line.substring(8);
                        }

                        String artist = "Various Artists";
                        String title = currentTitle != null ? currentTitle : "Imported Track";
                        if (title.contains(" - ")) {
                            String[] split = title.split(" - ", 2);
                            artist = split[0].trim();
                            title = split[1].trim();
                        }

                        tracks.add(new ExportableTrack(title, artist, "", sourceType, sourceId, currentDuration, 0, "UNPLAYED", ""));
                        currentTitle = null;
                        currentDuration = 180;
                    }
                }
            } catch (Exception e) {
                log.warn("Error parsing M3U import: {}", e.getMessage());
            }
        } else {
            // Assume JSON
            try {
                List<Map<String, Object>> jsonList = objectMapper.readValue(content, new TypeReference<>() {});
                for (Map<String, Object> map : jsonList) {
                    String title = (String) map.getOrDefault("title", map.getOrDefault("trackTitle", "Untitled"));
                    String artist = (String) map.getOrDefault("artist", "Unknown");
                    String album = (String) map.getOrDefault("album", "");
                    String sourceType = (String) map.getOrDefault("sourceType", "YOUTUBE");
                    String sourceId = (String) map.getOrDefault("sourceIdentifier", map.getOrDefault("videoId", ""));
                    int dur = map.get("durationSeconds") instanceof Number ? ((Number) map.get("durationSeconds")).intValue() : 180;
                    int start = map.get("startSeconds") instanceof Number ? ((Number) map.get("startSeconds")).intValue() : 0;
                    String notes = (String) map.getOrDefault("notes", "");
                    tracks.add(new ExportableTrack(title, artist, album, sourceType, sourceId, dur, start, "UNPLAYED", notes));
                }
            } catch (Exception e) {
                log.warn("Error parsing JSON import: {}", e.getMessage());
            }
        }

        return tracks;
    }

    private String escapeCsv(String str) {
        if (str == null) return "\"\"";
        return "\"" + str.replace("\"", "\"\"") + "\"";
    }

    private String unescapeCsv(String str) {
        if (str == null) return "";
        String trimmed = str.trim();
        if (trimmed.startsWith("\"") && trimmed.endsWith("\"") && trimmed.length() >= 2) {
            trimmed = trimmed.substring(1, trimmed.length() - 1).replace("\"\"", "\"");
        }
        return trimmed;
    }

    private int parseInt(String val, int def) {
        try {
            return Integer.parseInt(val.trim());
        } catch (Exception e) {
            return def;
        }
    }

    private String truncate(String s, int len) {
        if (s == null) return "";
        if (s.length() <= len) return s;
        return s.substring(0, len - 3) + "...";
    }

    public record ExportableTrack(
            String title,
            String artist,
            String album,
            String sourceType,
            String sourceIdentifier,
            int durationSeconds,
            int startSeconds,
            String status,
            String notes
    ) {}
}
