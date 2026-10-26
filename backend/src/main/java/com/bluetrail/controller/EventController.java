
package com.bluetrail.controller;

import com.bluetrail.entity.Event;
import com.bluetrail.service.EventService;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/events")
public class EventController {

    private final EventService eventService;

    public EventController(EventService eventService) {
        this.eventService = eventService;
    }

    // Get all events
    @GetMapping
    public List<Event> getAllEvents() {
        return eventService.getAllEvents();
    }

    // Get event by ID
    @GetMapping("/{id}")
    public ResponseEntity<Event> getEventById(
            @PathVariable Long id) {

        return eventService.getEventById(id)
                .map(ResponseEntity::ok)
                .orElseGet(() ->
                        ResponseEntity.notFound().build());
    }

    // Get active events
    @GetMapping("/active")
    public List<Event> getActiveEvents() {
        return eventService.getActiveEvents();
    }
}
