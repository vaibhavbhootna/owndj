package com.owndj.repository;

import com.owndj.model.DJPlaylist;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface DJPlaylistRepository extends JpaRepository<DJPlaylist, UUID> {
    List<DJPlaylist> findByOrderByUpdatedAtDesc();
    List<DJPlaylist> findByEventTypeOrderByUpdatedAtDesc(String eventType);
}
