package com.owndj.repository;

import com.owndj.model.Guest;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface GuestRepository extends JpaRepository<Guest, UUID> {
    Optional<Guest> findBySessionIdAndGuestTokenHash(UUID sessionId, String guestTokenHash);
    List<Guest> findBySessionId(UUID sessionId);
    long countBySessionId(UUID sessionId);
}
