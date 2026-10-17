package com.owndj.repository;

import com.owndj.model.Session;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface SessionRepository extends JpaRepository<Session, UUID> {
    Optional<Session> findByRoomCodeIgnoreCase(String roomCode);
    boolean existsByRoomCodeIgnoreCase(String roomCode);
}
