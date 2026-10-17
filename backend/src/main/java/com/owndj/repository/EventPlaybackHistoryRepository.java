package com.owndj.repository;

import com.owndj.model.EventPlaybackHistory;
import com.owndj.model.Session;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface EventPlaybackHistoryRepository extends JpaRepository<EventPlaybackHistory, UUID> {
    List<EventPlaybackHistory> findBySessionOrderByStartedAtDesc(Session session);
}
