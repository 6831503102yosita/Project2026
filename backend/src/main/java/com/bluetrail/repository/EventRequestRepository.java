
package com.bluetrail.repository;

import com.bluetrail.entity.EventRequest;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface EventRequestRepository extends JpaRepository<EventRequest, Long> {

    List<EventRequest> findByUserId(Long userId);

    List<EventRequest> findByStatus(String status);

    List<EventRequest> findByCategory(String category);
}
