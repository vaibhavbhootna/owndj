package com.owndj.repository;

import com.owndj.model.SongRequestVote;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface SongRequestVoteRepository extends JpaRepository<SongRequestVote, UUID> {
    Optional<SongRequestVote> findBySongRequestIdAndGuestId(UUID songRequestId, UUID guestId);

    @Query("SELECT COALESCE(SUM(v.vote), 0) FROM SongRequestVote v WHERE v.songRequest.id = :requestId")
    int getVoteCountForRequest(@Param("requestId") UUID requestId);
}
