package com.owndj.repository;

import com.owndj.model.Song;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface SongRepository extends JpaRepository<Song, UUID> {
    Optional<Song> findByYoutubeVideoId(String youtubeVideoId);
}
