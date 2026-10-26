
package com.bluetrail.repository;

import com.bluetrail.entity.Event;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface EventRepository extends JpaRepository<Event, Long> {

    List<Event> findByStatus(String status);

    List<Event> findByCategory(String category);

    List<Event> findByTitleContainingIgnoreCase(String keyword);
}
