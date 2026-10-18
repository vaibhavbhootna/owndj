package com.owndj.controller;

import com.owndj.dto.CreateMomentDto;
import com.owndj.dto.ResolveSongItemDto;
import com.owndj.dto.SongMomentDto;
import com.owndj.dto.SongSearchResult;
import com.owndj.security.RateLimiterService;
import com.owndj.service.MomentService;
import com.owndj.service.YouTubeService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class SongController {

    private final YouTubeService youTubeService;
    private final MomentService momentService;
    private final RateLimiterService rateLimiterService;

    @GetMapping("/songs/search")
    public ResponseEntity<List<SongSearchResult>> search(
            @RequestParam(value = "q", defaultValue = "") String query,
            HttpServletRequest request) {
        String clientIp = request.getRemoteAddr();
        if (!rateLimiterService.allowSearch(clientIp)) {
            throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS, "Search rate limit exceeded. Please wait a moment.");
        }

        List<SongSearchResult> results = youTubeService.search(query);
        return ResponseEntity.ok(results);
    }

    @PostMapping("/songs/resolve-batch")
    public ResponseEntity<List<ResolveSongItemDto>> resolveBatch(
            @RequestBody Map<String, Object> payload) {
        List<String> items = new ArrayList<>();
        Object itemsObj = payload.get("items");
        if (itemsObj instanceof List<?>) {
            for (Object obj : (List<?>) itemsObj) {
                if (obj != null) {
                    items.add(obj.toString());
                }
            }
        } else if (itemsObj instanceof String) {
            String text = (String) itemsObj;
            items.addAll(Arrays.asList(text.split("\\r?\\n")));
        }
        boolean autoSelectFirst = Boolean.TRUE.equals(payload.getOrDefault("autoSelectFirst", true));
        List<ResolveSongItemDto> resolved = youTubeService.resolveBatch(items, autoSelectFirst);
        return ResponseEntity.ok(resolved);
    }

    @GetMapping("/songs/resolve-single")
    public ResponseEntity<ResolveSongItemDto> resolveSingle(
            @RequestParam("input") String input,
            @RequestParam(value = "autoSelectFirst", defaultValue = "true") boolean autoSelectFirst) {
        ResolveSongItemDto resolved = youTubeService.resolveSong(input, autoSelectFirst);
        if (resolved == null) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(resolved);
    }

    @GetMapping("/songs/{videoId}/moments")
    public ResponseEntity<List<SongMomentDto>> getMoments(
            @PathVariable String videoId,
            @RequestHeader(value = "X-Guest-Id", required = false) UUID guestId) {
        List<SongMomentDto> moments = momentService.getMomentsForVideo(videoId, guestId);
        return ResponseEntity.ok(moments);
    }

    @PostMapping("/songs/{videoId}/moments")
    public ResponseEntity<SongMomentDto> createMoment(
            @PathVariable String videoId,
            @Valid @RequestBody CreateMomentDto dto) {
        SongMomentDto moment = momentService.createMoment(videoId, dto);
        return ResponseEntity.ok(moment);
    }

    @PostMapping("/moments/{momentId}/vote")
    public ResponseEntity<SongMomentDto> voteMoment(
            @PathVariable UUID momentId,
            @RequestHeader("X-Guest-Id") UUID guestId,
            @RequestBody Map<String, Integer> body) {
        int vote = body.getOrDefault("vote", 1);
        SongMomentDto moment = momentService.voteMoment(momentId, guestId, vote);
        return ResponseEntity.ok(moment);
    }
}
