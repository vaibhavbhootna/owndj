package com.owndj.repository;

import com.owndj.model.VisualTemplate;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface VisualTemplateRepository extends JpaRepository<VisualTemplate, UUID> {
    List<VisualTemplate> findByOrderByCreatedAtAsc();
    List<VisualTemplate> findByEventTypeOrderByCreatedAtAsc(String eventType);
}
