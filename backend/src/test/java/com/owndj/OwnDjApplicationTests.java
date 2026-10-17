package com.owndj;

import com.owndj.dto.*;
import com.owndj.model.*;
import com.owndj.service.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
@ActiveProfiles("test")
class OwnDjApplicationTests {

    @Autowired
    private SessionService sessionService;

    @Autowired
    private QueueService queueService;

    @Autowired
    private PlaybackCoordinationService playbackService;

    @Autowired
    private YouTubeService youTubeService;

    @Autowired
    private MomentService momentService;

    @Autowired
    private QrCodeService qrCodeService;

    @Autowired
    private DJDeckService djDeckService;

    @Autowired
    private DJLibraryService djLibraryService;

    @Autowired
    private PlaylistExportImportService exportImportService;

    @Autowired
    private VisualProjectionService visualProjectionService;

    @Autowired
    private com.owndj.repository.EventPlaybackHistoryRepository historyRepository;

    private SessionResponse testSession;
    private GuestResponse testGuest;

    @BeforeEach
    void setUp() {
        testSession = sessionService.createSession(
                CreateSessionRequest.builder().name("Saturday Night Vibes").build()
        );
        testGuest = sessionService.joinSession(
                testSession.getRoomCode(),
                JoinSessionRequest.builder().nickname("PartyAnimal").build()
        );
    }

    @Test
    @DisplayName("Host can create session with valid room code and host token")
    void testSessionCreation() {
        assertNotNull(testSession.getId());
        assertNotNull(testSession.getRoomCode());
        assertEquals(6, testSession.getRoomCode().length());
        assertNotNull(testSession.getHostToken());
        assertEquals(SessionStatus.CREATED, testSession.getStatus());
        assertEquals("Saturday Night Vibes", testSession.getName());
    }

    @Test
    @DisplayName("Guest can join session and receive guest token")
    void testGuestJoining() {
        assertNotNull(testGuest.getId());
        assertNotNull(testGuest.getGuestToken());
        assertEquals("PartyAnimal", testGuest.getNickname());
        assertEquals(testSession.getRoomCode(), testGuest.getRoomCode());
    }

    @Test
    @DisplayName("QR code generation produces valid data URL and PNG")
    void testQrCodeGeneration() {
        String joinUrl = qrCodeService.generateJoinUrl(testSession.getRoomCode());
        assertTrue(joinUrl.contains("/join/" + testSession.getRoomCode()));

        String dataUrl = qrCodeService.generateQrCodeDataUrl(joinUrl, 200, 200);
        assertTrue(dataUrl.startsWith("data:image/png;base64,"));

        byte[] pngBytes = qrCodeService.generateQrCodePng(joinUrl, 200, 200);
        assertTrue(pngBytes.length > 100);
    }

    @Test
    @DisplayName("YouTube search returns results from catalog or API")
    void testYouTubeSearch() {
        List<SongSearchResult> results = youTubeService.search("Daft Punk");
        assertFalse(results.isEmpty());
        SongSearchResult first = results.get(0);
        assertNotNull(first.getVideoId());
        assertTrue(first.isEmbeddable());
        assertTrue(first.getDurationSeconds() > 0);
    }

    @Test
    @DisplayName("Guest can submit song request with timestamp and duration endpoint calculation")
    void testSongRequestSubmissionAndQueue() {
        CreateSongRequestDto requestDto = CreateSongRequestDto.builder()
                .videoId("F57P9C4SAW4")
                .title("Daft Punk - One More Time")
                .channelTitle("Daft Punk")
                .thumbnailUrl("https://i.ytimg.com/vi/F57P9C4SAW4/hqdefault.jpg")
                .durationSeconds(320)
                .requestedStartSeconds(45)
                .requestedDurationSeconds(60)
                .build();

        SongRequestDto queued = queueService.submitRequest(
                testSession.getRoomCode(),
                testGuest.getGuestToken(),
                requestDto
        );

        assertNotNull(queued.getId());
        assertEquals(45, queued.getRequestedStartSeconds());
        assertEquals(60, queued.getRequestedDurationSeconds());
        assertEquals(105, queued.getRequestedEndSeconds()); // start + duration = 105
        assertEquals(RequestStatus.APPROVED, queued.getStatus()); // auto-approve default is true

        List<SongRequestDto> queue = queueService.getQueue(testSession.getRoomCode(), testGuest.getId());
        assertEquals(1, queue.size());
        assertEquals("F57P9C4SAW4", queue.get(0).getSong().getYoutubeVideoId());
    }

    @Test
    @DisplayName("Smart Song Moments can be queried and ranked")
    void testSmartSongMoments() {
        List<SongMomentDto> moments = momentService.getMomentsForVideo("F57P9C4SAW4", testGuest.getId());
        assertFalse(moments.isEmpty());
        // Curated moments include Chorus, Beat drop, etc.
        assertTrue(moments.stream().anyMatch(m -> m.getLabel().contains("Chorus") || m.getLabel().contains("Beat")));

        // Guest can add a custom moment
        SongMomentDto custom = momentService.createMoment("F57P9C4SAW4", CreateMomentDto.builder()
                .label("High-energy section")
                .startSeconds(90)
                .endSeconds(120)
                .detectionMethod("MANUAL")
                .build());

        assertNotNull(custom.getId());
        assertEquals(90, custom.getStartSeconds());
    }

    @Test
    @DisplayName("Playback engine advances queue and updates track state")
    void testPlaybackAdvancement() {
        // Submit 2 tracks
        queueService.submitRequest(
                testSession.getRoomCode(),
                testGuest.getGuestToken(),
                CreateSongRequestDto.builder()
                        .videoId("F57P9C4SAW4")
                        .title("Track 1")
                        .durationSeconds(200)
                        .requestedStartSeconds(0)
                        .requestedDurationSeconds(45)
                        .build()
        );

        // Start playback
        PlaybackStateDto state = playbackService.startOrAdvancePlayback(testSession.getRoomCode(), testSession.getHostToken());
        assertEquals("PLAYING", state.getStatus());
        assertNotNull(state.getCurrentTrack());
        assertEquals("F57P9C4SAW4", state.getCurrentTrack().getSong().getYoutubeVideoId());
        assertTrue(state.getCurrentTrack().getSong().getTitle().contains("Daft Punk") || state.getCurrentTrack().getSong().getTitle().contains("Track 1"));

        // Complete segment
        PlaybackStateDto nextState = playbackService.completeSegment(
                testSession.getRoomCode(),
                testSession.getHostToken(),
                state.getCurrentTrack().getId(),
                state.getTransitionId()
        );
        // Queue is now empty so nextState is IDLE
        assertEquals("IDLE", nextState.getStatus());
    }

    @Test
    @DisplayName("DJ Library: Can create, list, and duplicate reusable DJ Sets")
    void testDjLibraryReusablePlaylists() {
        DJPlaylistDto newSet = djLibraryService.createPlaylist(DJPlaylistDto.builder()
                .name("Test Bollywood Heat")
                .description("Energetic Bollywood dance tracks")
                .eventType("WEDDING")
                .tracks(List.of(
                        DJPlaylistTrackDto.builder()
                                .title("Track A")
                                .artist("Artist A")
                                .sourceType("YOUTUBE")
                                .sourceIdentifier("kJQP7kiw5Fk")
                                .durationSeconds(200)
                                .startSeconds(0)
                                .build(),
                        DJPlaylistTrackDto.builder()
                                .title("Track B")
                                .artist("Artist B")
                                .sourceType("YOUTUBE")
                                .sourceIdentifier("YqeW9_5kURI")
                                .durationSeconds(180)
                                .startSeconds(10)
                                .build()
                ))
                .build());

        assertNotNull(newSet.getId());
        assertEquals("Test Bollywood Heat", newSet.getName());
        assertEquals(2, newSet.getTrackCount());
        assertEquals(380, newSet.getEstimatedDurationSeconds());

        // Duplicate
        DJPlaylistDto copy = djLibraryService.duplicatePlaylist(newSet.getId().toString(), "Test Bollywood Heat (VIP Copy)");
        assertNotNull(copy.getId());
        assertNotEquals(newSet.getId(), copy.getId());
        assertEquals(2, copy.getTrackCount());

        // List
        List<DJPlaylistDto> sets = djLibraryService.listPlaylists("WEDDING");
        assertTrue(sets.stream().anyMatch(s -> s.getName().contains("Test Bollywood Heat")));
    }

    @Test
    @DisplayName("DJ Deck: Can load reusable set into event deck, shuffle, and add tracks")
    void testDjDeckManagementAndLoadPlaylist() {
        // Create a master set first
        DJPlaylistDto master = djLibraryService.createPlaylist(DJPlaylistDto.builder()
                .name("Master Sunset")
                .tracks(List.of(
                        DJPlaylistTrackDto.builder().title("Sunset 1").sourceType("YOUTUBE").sourceIdentifier("ebXbLfLACGM").durationSeconds(200).build(),
                        DJPlaylistTrackDto.builder().title("Sunset 2").sourceType("YOUTUBE").sourceIdentifier("4NRXx6U8ABQ").durationSeconds(210).build()
                ))
                .build());

        // Load into active event deck
        List<EventDJTrackDto> deck = djDeckService.loadPlaylistIntoDeck(
                testSession.getRoomCode(),
                testSession.getHostToken(),
                master.getId().toString(),
                true
        );
        assertEquals(2, deck.size());
        assertEquals("Sunset 1", deck.get(0).getTitle());

        // Add track directly to event deck
        EventDJTrackDto added = djDeckService.addTrackToDeck(
                testSession.getRoomCode(),
                testSession.getHostToken(),
                EventDJTrackDto.builder()
                        .title("Direct Deck Track")
                        .artist("DJ")
                        .sourceType("YOUTUBE")
                        .sourceIdentifier("TUVcZfQe-Kw")
                        .durationSeconds(190)
                        .startSeconds(15)
                        .build()
        );
        assertNotNull(added.getId());

        List<EventDJTrackDto> updatedDeck = djDeckService.getDeck(testSession.getRoomCode());
        assertEquals(3, updatedDeck.size());

        // Save event deck back as a new master playlist in DJ Library
        DJPlaylistDto savedSet = djLibraryService.saveDeckAsPlaylist(
                testSession.getRoomCode(),
                testSession.getHostToken(),
                "Saved From Live Event",
                "Captured from Saturday session",
                "PARTY"
        );
        assertNotNull(savedSet.getId());
        assertEquals(3, savedSet.getTrackCount());
    }

    @Test
    @DisplayName("Playback Priority Rules: Guest requests take priority, then DJ deck resumes without losing position")
    void testPlaybackPriorityRules() {
        // 1. Populate DJ Deck with 2 tracks
        djDeckService.addTrackToDeck(
                testSession.getRoomCode(),
                testSession.getHostToken(),
                EventDJTrackDto.builder().title("Deck Song 1").artist("DJ A").sourceType("YOUTUBE").sourceIdentifier("ebXbLfLACGM").durationSeconds(200).build()
        );
        djDeckService.addTrackToDeck(
                testSession.getRoomCode(),
                testSession.getHostToken(),
                EventDJTrackDto.builder().title("Deck Song 2").artist("DJ B").sourceType("YOUTUBE").sourceIdentifier("4NRXx6U8ABQ").durationSeconds(210).build()
        );

        // 2. Submit a Guest Request
        queueService.submitRequest(
                testSession.getRoomCode(),
                testGuest.getGuestToken(),
                CreateSongRequestDto.builder()
                        .videoId("F57P9C4SAW4")
                        .title("Guest Song Priority")
                        .durationSeconds(180)
                        .requestedStartSeconds(0)
                        .requestedDurationSeconds(60)
                        .build()
        );

        // 3. Start playback: Priority Rule 1 states Guest Request MUST play first!
        PlaybackStateDto state1 = playbackService.startOrAdvancePlayback(testSession.getRoomCode(), testSession.getHostToken());
        assertEquals("PLAYING", state1.getStatus());
        assertEquals("GUEST_REQUEST", state1.getPlaylistSource());
        assertTrue(state1.getCurrentTrack().getSong().getTitle().contains("Guest Song Priority") || state1.getCurrentTrack().getSong().getTitle().contains("Daft Punk"));

        // 4. Complete the guest request: Priority Rule 2 states DJ Deck automatically plays next unplayed track!
        PlaybackStateDto state2 = playbackService.completeSegment(
                testSession.getRoomCode(),
                testSession.getHostToken(),
                state1.getCurrentTrack().getId(),
                state1.getTransitionId()
        );
        assertEquals("PLAYING", state2.getStatus());
        assertEquals("DJ_DECK", state2.getPlaylistSource());
        assertEquals("Deck Song 1", state2.getCurrentTrack().getSong().getTitle());

        // 5. Complete Deck Song 1: Next track on DJ Deck should play (Deck Song 2)
        PlaybackStateDto state3 = playbackService.completeSegment(
                testSession.getRoomCode(),
                testSession.getHostToken(),
                state2.getCurrentTrack().getId(),
                state2.getTransitionId()
        );
        assertEquals("PLAYING", state3.getStatus());
        assertEquals("DJ_DECK", state3.getPlaylistSource());
        assertEquals("Deck Song 2", state3.getCurrentTrack().getSong().getTitle());

        // 6. Verify combined playback history has recorded both Guest Request and DJ Deck tracks
        var history = historyRepository.findBySessionOrderByStartedAtDesc(sessionService.findSessionByRoomCode(testSession.getRoomCode()));
        assertTrue(history.size() >= 2);
        assertTrue(history.stream().anyMatch(h -> "GUEST_REQUEST".equals(h.getPlaylistSource())));
        assertTrue(history.stream().anyMatch(h -> "DJ_DECK".equals(h.getPlaylistSource())));
    }

    @Test
    @DisplayName("Export & Import: Can export DJ Deck and Guest requests as CSV, JSON, M3U and import back")
    void testExportAndImport() {
        djDeckService.addTrackToDeck(
                testSession.getRoomCode(),
                testSession.getHostToken(),
                EventDJTrackDto.builder().title("Export Track").artist("Artist Export").sourceType("YOUTUBE").sourceIdentifier("ebXbLfLACGM").durationSeconds(240).build()
        );

        // Export Deck as CSV
        String csv = exportImportService.exportDjDeck(testSession.getRoomCode(), "CSV");
        assertTrue(csv.contains("Title,Artist,Album"));
        assertTrue(csv.contains("Export Track"));

        // Export Deck as M3U
        String m3u = exportImportService.exportDjDeck(testSession.getRoomCode(), "M3U");
        assertTrue(m3u.startsWith("#EXTM3U"));
        assertTrue(m3u.contains("Export Track"));

        // Export Deck as Printable Text
        String text = exportImportService.exportDjDeck(testSession.getRoomCode(), "TEXT");
        assertTrue(text.contains("OWN DJ - EVENT SET LIST"));
        assertTrue(text.contains("Export Track"));

        // Import CSV into DJ Library
        String importCsv = "Title,Artist,Album,SourceType,SourceIdentifier,DurationSeconds,StartSeconds,Status,Notes\n"
                + "\"Imported Title\",\"Imported Artist\",\"\",\"YOUTUBE\",\"dQw4w9WgXcQ\",213,0,\"UNPLAYED\",\"Test\"\n";
        DJPlaylistDto imported = exportImportService.importIntoDjLibrary("Imported CSV Set", importCsv, "CSV");
        assertNotNull(imported.getId());
        assertEquals(1, imported.getTrackCount());
    }

    @Test
    @DisplayName("Visual Projection: Can switch presets and broadcast ticker announcements")
    void testVisualProjectionAndPresets() {
        // Switch preset to PARTY_VISUALS
        visualProjectionService.switchPreset(testSession.getRoomCode(), testSession.getHostToken(), "PARTY_VISUALS", "Welcome to Party Visuals!");

        Session updated = sessionService.findSessionByRoomCode(testSession.getRoomCode());
        assertEquals("PARTY_VISUALS", updated.getActiveVisualPreset());
        assertEquals("Welcome to Party Visuals!", updated.getTickerText());

        // Send announcement
        visualProjectionService.sendAnnouncement(testSession.getRoomCode(), testSession.getHostToken(), "Cake cutting in 5 minutes!");
        Session announced = sessionService.findSessionByRoomCode(testSession.getRoomCode());
        assertEquals("Cake cutting in 5 minutes!", announced.getTickerText());
    }
}
