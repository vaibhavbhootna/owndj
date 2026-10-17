package com.owndj.repository;

import com.owndj.model.RequestStatus;
import com.owndj.model.SongRequest;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface SongRequestRepository extends JpaRepository<SongRequest, UUID> {

    List<SongRequest> findBySessionIdOrderByQueuePositionAscCreatedAtAsc(UUID sessionId);

    List<SongRequest> findBySessionIdAndStatusOrderByQueuePositionAscCreatedAtAsc(UUID sessionId, RequestStatus status);

    List<SongRequest> findBySessionIdAndStatusInOrderByQueuePositionAscCreatedAtAsc(UUID sessionId, List<RequestStatus> statuses);

    Optional<SongRequest> findFirstBySessionIdAndStatus(UUID sessionId, RequestStatus status);

    long countBySessionIdAndGuestIdAndStatus(UUID sessionId, UUID guestId, RequestStatus status);

    @Query("SELECT COUNT(sr) > 0 FROM SongRequest sr WHERE sr.session.id = :sessionId AND sr.song.youtubeVideoId = :videoId AND sr.status IN ('PENDING', 'APPROVED', 'PLAYING')")
    boolean existsActiveSongInSession(@Param("sessionId") UUID sessionId, @Param("videoId") String videoId);

    @Query("SELECT COALESCE(MAX(sr.queuePosition), 0) FROM SongRequest sr WHERE sr.session.id = :sessionId AND sr.status IN ('PENDING', 'APPROVED')")
    int getMaxQueuePosition(@Param("sessionId") UUID sessionId);
}
