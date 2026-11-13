package com.bluetrail.repository;

import com.bluetrail.entity.EventRequestChange;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface EventRequestChangeRepository
        extends JpaRepository<EventRequestChange, Long> {
    List<EventRequestChange> findByEventRequestIdOrderByCreatedAtDesc(Long id);
    List<EventRequestChange> findAllByOrderByCreatedAtDesc();
}
