package com.owndj.repository;

import com.owndj.model.EventDJTrack;
import com.owndj.model.Session;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface EventDJTrackRepository extends JpaRepository<EventDJTrack, UUID> {
    List<EventDJTrack> findBySessionOrderBySortOrderAsc(Session session);
    
    @Query("SELECT t FROM EventDJTrack t WHERE t.session = :session AND t.playbackStatus = 'UNPLAYED' ORDER BY t.sortOrder ASC")
    List<EventDJTrack> findUnplayedTracksBySession(@Param("session") Session session);

    Optional<EventDJTrack> findFirstBySessionAndPlaybackStatusOrderBySortOrderAsc(Session session, String playbackStatus);

    void deleteBySession(Session session);

    int countBySession(Session session);
}
