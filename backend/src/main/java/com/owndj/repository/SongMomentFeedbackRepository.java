package com.owndj.repository;

import com.owndj.model.SongMomentFeedback;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface SongMomentFeedbackRepository extends JpaRepository<SongMomentFeedback, UUID> {
    Optional<SongMomentFeedback> findBySongMomentIdAndGuestId(UUID songMomentId, UUID guestId);

    @Query("SELECT COALESCE(SUM(f.vote), 0) FROM SongMomentFeedback f WHERE f.songMoment.id = :momentId")
    int getScoreForMoment(@Param("momentId") UUID momentId);
}
