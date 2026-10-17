package com.owndj.repository;

import com.owndj.model.SongMoment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface SongMomentRepository extends JpaRepository<SongMoment, UUID> {

    List<SongMoment> findBySongIdOrderByConfidenceDescCreatedAtDesc(UUID songId);

    List<SongMoment> findBySongYoutubeVideoIdOrderByConfidenceDescCreatedAtDesc(String youtubeVideoId);

    @Query("SELECT sm FROM SongMoment sm WHERE sm.song.youtubeVideoId = :videoId AND sm.startSeconds BETWEEN :start - 5 AND :start + 5")
    List<SongMoment> findNearbyMoments(@Param("videoId") String videoId, @Param("start") int start);
}
