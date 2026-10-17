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
    
    @org.springframework.data.jpa.repository.Query("SELECT t FROM DJPlaylistTrack t JOIN FETCH t.playlist p WHERE LOWER(t.title) LIKE LOWER(CONCAT('%', :query, '%')) OR LOWER(t.artist) LIKE LOWER(CONCAT('%', :query, '%')) OR LOWER(p.name) LIKE LOWER(CONCAT('%', :query, '%'))")
    List<DJPlaylistTrack> searchLibraryTracks(@org.springframework.data.repository.query.Param("query") String query);

    void deleteByPlaylist(DJPlaylist playlist);
}
