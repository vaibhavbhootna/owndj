package com.owndj.repository;

import com.owndj.model.DJPlaylist;
import com.owndj.model.DJPlaylistTrack;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface DJPlaylistTrackRepository extends JpaRepository<DJPlaylistTrack, UUID> {
    List<DJPlaylistTrack> findByPlaylistOrderBySortOrderAsc(DJPlaylist playlist);
    void deleteByPlaylist(DJPlaylist playlist);
}
