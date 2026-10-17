package com.owndj.service;

import com.owndj.dto.CreateMomentDto;
import com.owndj.dto.SongMomentDto;
import com.owndj.model.*;
import com.owndj.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.*;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class MomentService {

    private final SongMomentRepository momentRepository;
    private final SongMomentFeedbackRepository feedbackRepository;
    private final SongRepository songRepository;
    private final GuestRepository guestRepository;
    private final NotificationService notificationService;

    // Default popular moments seed for instant smart recommendations
    private static final Map<String, List<CreateMomentDto>> CURATED_MOMENTS = Map.of(
            "F57P9C4SAW4", List.of(
                    new CreateMomentDto("Chorus", 34, 66, "CROWD"),
                    new CreateMomentDto("Beat drop", 49, 80, "CROWD"),
                    new CreateMomentDto("Main hook", 132, 164, "CROWD")
            ),
            "4NRXx6U8ABQ", List.of(
                    new CreateMomentDto("Intro & Hook", 14, 45, "CROWD"),
                    new CreateMomentDto("Chorus", 51, 82, "CROWD"),
                    new CreateMomentDto("Beat drop", 98, 130, "CROWD")
            ),
            "TUVcZfQe-Kw", List.of(
                    new CreateMomentDto("Pre-chorus", 30, 46, "CROWD"),
                    new CreateMomentDto("Chorus", 46, 78, "CROWD"),
                    new CreateMomentDto("Dance Break", 125, 155, "CROWD")
            ),
            "_ovdm2yX4MA", List.of(
                    new CreateMomentDto("Vocal Hook", 45, 75, "CROWD"),
                    new CreateMomentDto("Melodic Build", 75, 105, "CROWD"),
                    new CreateMomentDto("Beat drop", 106, 140, "CROWD")
            ),
            "ebXbLfLACGM", List.of(
                    new CreateMomentDto("Chorus", 30, 60, "CROWD"),
                    new CreateMomentDto("Beat drop", 61, 92, "CROWD")
            ),
            "dQw4w9WgXcQ", List.of(
                    new CreateMomentDto("Chorus", 42, 74, "CROWD"),
                    new CreateMomentDto("Bridge & Solos", 126, 158, "CROWD")
            )
    );

    @Transactional
    public List<SongMomentDto> getMomentsForVideo(String videoId, UUID currentGuestId) {
        ensureSeededMoments(videoId);

        List<SongMoment> moments = momentRepository.findBySongYoutubeVideoIdOrderByConfidenceDescCreatedAtDesc(videoId);

        return moments.stream()
                .map(m -> mapToDto(m, currentGuestId))
                .sorted(Comparator.comparingInt(SongMomentDto::getScore).reversed())
                .collect(Collectors.toList());
    }

    @Transactional
    public SongMomentDto createMoment(String videoId, CreateMomentDto dto) {
        Song song = songRepository.findByYoutubeVideoId(videoId)
                .orElseGet(() -> songRepository.save(Song.builder()
                        .youtubeVideoId(videoId)
                        .title("Track (" + videoId + ")")
                        .durationSeconds(240)
                        .metadataUpdatedAt(Instant.now())
                        .build()));

        // Check if a moment at very similar timestamp already exists
        List<SongMoment> nearby = momentRepository.findNearbyMoments(videoId, dto.getStartSeconds());
        if (!nearby.isEmpty()) {
            SongMoment existing = nearby.get(0);
            log.info("Moment already near timestamp {} for video {}: returning existing {}", dto.getStartSeconds(), videoId, existing.getId());
            return mapToDto(existing, null);
        }

        SongMoment moment = SongMoment.builder()
                .song(song)
                .label(dto.getLabel().trim())
                .startSeconds(dto.getStartSeconds())
                .endSeconds(dto.getEndSeconds())
                .confidence(BigDecimal.valueOf(1.0))
                .detectionMethod(dto.getDetectionMethod() != null ? dto.getDetectionMethod() : "MANUAL")
                .createdAt(Instant.now())
                .build();

        moment = momentRepository.save(moment);
        log.info("Created new song moment {} for video {}: label='{}', start={}",
                moment.getId(), videoId, moment.getLabel(), moment.getStartSeconds());

        return mapToDto(moment, null);
    }

    @Transactional
    public SongMomentDto voteMoment(UUID momentId, UUID guestId, int voteValue) {
        SongMoment moment = momentRepository.findById(momentId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Moment not found"));

        Guest guest = guestRepository.findById(guestId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Guest not found"));

        Optional<SongMomentFeedback> existing = feedbackRepository.findBySongMomentIdAndGuestId(momentId, guestId);
        if (existing.isPresent()) {
            SongMomentFeedback feedback = existing.get();
            if (feedback.getVote() == voteValue) {
                feedbackRepository.delete(feedback);
            } else {
                feedback.setVote(voteValue);
                feedbackRepository.save(feedback);
            }
        } else {
            SongMomentFeedback feedback = SongMomentFeedback.builder()
                    .songMoment(moment)
                    .guest(guest)
                    .vote(voteValue > 0 ? 1 : -1)
                    .createdAt(Instant.now())
                    .build();
            feedbackRepository.save(feedback);
        }

        return mapToDto(moment, guestId);
    }

    private void ensureSeededMoments(String videoId) {
        if (!CURATED_MOMENTS.containsKey(videoId)) {
            return;
        }

        List<SongMoment> existing = momentRepository.findBySongYoutubeVideoIdOrderByConfidenceDescCreatedAtDesc(videoId);
        if (existing.isEmpty()) {
            Song song = songRepository.findByYoutubeVideoId(videoId).orElse(null);
            if (song == null) {
                song = songRepository.save(Song.builder()
                        .youtubeVideoId(videoId)
                        .title("Track (" + videoId + ")")
                        .durationSeconds(240)
                        .metadataUpdatedAt(Instant.now())
                        .build());
            }

            for (CreateMomentDto seed : CURATED_MOMENTS.get(videoId)) {
                SongMoment moment = SongMoment.builder()
                        .song(song)
                        .label(seed.getLabel())
                        .startSeconds(seed.getStartSeconds())
                        .endSeconds(seed.getEndSeconds())
                        .confidence(BigDecimal.valueOf(1.2))
                        .detectionMethod(seed.getDetectionMethod())
                        .createdAt(Instant.now())
                        .build();
                momentRepository.save(moment);
            }
        }
    }

    private SongMomentDto mapToDto(SongMoment m, UUID currentGuestId) {
        int feedbackScore = feedbackRepository.getScoreForMoment(m.getId());
        boolean hasVoted = false;
        if (currentGuestId != null) {
            hasVoted = feedbackRepository.findBySongMomentIdAndGuestId(m.getId(), currentGuestId).isPresent();
        }

        // Section 6 Stage 3 Transparent Ranking Formula:
        // base score = feedbackScore * 1.5 + confidence * 10
        int calculatedScore = (int) (feedbackScore * 1.5 + m.getConfidence().doubleValue() * 10);

        return SongMomentDto.builder()
                .id(m.getId())
                .videoId(m.getSong().getYoutubeVideoId())
                .label(m.getLabel())
                .startSeconds(m.getStartSeconds())
                .endSeconds(m.getEndSeconds())
                .confidence(m.getConfidence())
                .detectionMethod(m.getDetectionMethod())
                .score(calculatedScore)
                .upvotes(Math.max(0, feedbackScore))
                .userVoted(hasVoted)
                .createdAt(m.getCreatedAt())
                .build();
    }
}
