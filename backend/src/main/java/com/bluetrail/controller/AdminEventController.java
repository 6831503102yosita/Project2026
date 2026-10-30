package com.bluetrail.controller;

import com.bluetrail.entity.Event;
import com.bluetrail.repository.EventRepository;
import jakarta.persistence.EntityManager;
import jakarta.persistence.LockModeType;
import jakarta.persistence.PersistenceContext;
import jakarta.transaction.Transactional;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.Authentication;
import java.util.Map;
import java.util.LinkedHashMap;
import java.util.Objects;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Locale;
import java.util.Set;

@RestController
@RequestMapping("/api/admin/events")
public class AdminEventController {

    private final EventRepository events;

    @PersistenceContext
    private EntityManager em;

    @Autowired
    private JdbcTemplate jdbc;

    private String str(Object value) {
        return value == null ? "" : String.valueOf(value);
    }

    private Map<String, String> snapshot(Event e) {
        Map<String, String> values = new LinkedHashMap<>();
        values.put("title", str(e.getTitle()));
        values.put("titleEn", str(e.getTitleEn()));
        values.put("descriptionEn", str(e.getDescriptionEn()));
        values.put("category", str(e.getCategory()));
        values.put("description", str(e.getDescription()));
        values.put("location", str(e.getLocation()));
        values.put("eventDate", str(e.getEventDate()));
        values.put("price", str(e.getPrice()));
        values.put("totalSeats", str(e.getTotalSeats()));
        values.put("availableSeats", str(e.getAvailableSeats()));
        values.put("status", str(e.getStatus()));
        return values;
    }

    private void recordChanges(
            Event event,
            Map<String, String> before,
            Authentication auth) {

        Map<String, String> after = snapshot(event);

        String actor = auth == null
            ? "unknown"
            : auth.getName();

        for (String field : before.keySet()) {
            String oldValue = before.get(field);
            String newValue = after.get(field);

            if (Objects.equals(oldValue, newValue)) continue;

            jdbc.update(
                "INSERT INTO event_change_history " +
                "(event_id, changed_by, field_name, old_value, new_value) " +
                "VALUES (?, ?, ?, ?, ?)",
                event.getId(),
                actor,
                field,
                oldValue,
                newValue
            );
        }
    }

    @GetMapping("/{id}/history")
    public List<Map<String, Object>> history(@PathVariable Long id) {
        if (!events.existsById(id)) {
            throw new ResponseStatusException(
                HttpStatus.NOT_FOUND, "Event not found");
        }

        return jdbc.queryForList(
            "SELECT id, event_id AS eventId, " +
            "changed_by AS changedBy, field_name AS fieldName, " +
            "old_value AS oldValue, new_value AS newValue, " +
            "changed_at AS changedAt " +
            "FROM event_change_history " +
            "WHERE event_id = ? ORDER BY id DESC",
            id
        );
    }

    public AdminEventController(EventRepository events) {
        this.events = events;
    }

    public record EventInput(
        String title,
        String category,
        String description,
        String location,
        LocalDateTime eventDate,
        BigDecimal price,
        Integer totalSeats,
        String titleEn,
        String descriptionEn
    ) {}

    public record StatusInput(String status) {}

    private ResponseStatusException invalid(String reason) {
        return new ResponseStatusException(HttpStatus.BAD_REQUEST, reason);
    }

    private String clean(String value) {
        return value == null ? "" : value.trim();
    }

    private void validate(EventInput input) {
        if (input == null) throw invalid("Missing event data");

        String title = clean(input.title());
        String category = clean(input.category()).toLowerCase(Locale.ROOT);
        String location = clean(input.location());

        if (title.isEmpty() || title.length() > 200)
            throw invalid("Invalid title");

        if (input.titleEn()!=null && input.titleEn().length()>200)throw invalid("English title too long");
        if (input.descriptionEn()!=null && input.descriptionEn().length()>10000)throw invalid("English description too long");
        if (!Set.of("event", "tour").contains(category))
            throw invalid("Category must be event or tour");

        if (location.isEmpty() || location.length() > 255)
            throw invalid("Invalid location");

        if (input.description() != null &&
            input.description().length() > 10000)
            throw invalid("Description is too long");

        if (input.eventDate() == null)
            throw invalid("Event date is required");

        if (input.price() == null ||
            input.price().signum() < 0 ||
            input.price().scale() > 2 ||
            input.price().compareTo(new BigDecimal("99999999.99")) > 0)
            throw invalid("Invalid price");

        if (input.totalSeats() == null ||
            input.totalSeats() < 1)
            throw invalid("Total seats must be positive");
    }

    private void apply(Event event, EventInput input) {
        event.setTitle(clean(input.title()));
        event.setTitleEn(clean(input.titleEn()));
        event.setDescriptionEn(clean(input.descriptionEn()));
        event.setCategory(clean(input.category()).toLowerCase(Locale.ROOT));
        event.setDescription(clean(input.description()));
        event.setLocation(clean(input.location()));
        event.setEventDate(input.eventDate());
        event.setPrice(input.price());
    }

    @GetMapping
    public List<Event> list() {
        return events.findAll();
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @Transactional
    public Event create(@RequestBody EventInput input) {
        validate(input);

        Event event = new Event();
        apply(event, input);
        event.setTotalSeats(input.totalSeats());
        event.setAvailableSeats(input.totalSeats());
        event.setStatus("ACTIVE");

        return events.saveAndFlush(event);
    }

    @PutMapping("/{id}")
    @Transactional
    public Event update(
            @PathVariable Long id,
            @RequestBody EventInput input,
            Authentication auth) {

        validate(input);

        Event event = em.find(
            Event.class, id, LockModeType.PESSIMISTIC_WRITE);

        if (event == null)
            throw new ResponseStatusException(
                HttpStatus.NOT_FOUND, "Event not found");

        int oldTotal = event.getTotalSeats() == null
            ? 0 : event.getTotalSeats();

        int oldAvailable = event.getAvailableSeats() == null
            ? 0 : event.getAvailableSeats();

        int allocated = oldTotal - oldAvailable;

        if (allocated < 0)
            throw new ResponseStatusException(
                HttpStatus.CONFLICT, "Invalid existing seat data");

        if (input.totalSeats() < allocated)
            throw new ResponseStatusException(
                HttpStatus.CONFLICT,
                "Total seats cannot be less than allocated seats");

        Map<String, String> before = snapshot(event);

        apply(event, input);

        event.setTotalSeats(input.totalSeats());
        event.setAvailableSeats(input.totalSeats() - allocated);

        Event saved = events.saveAndFlush(event);
        recordChanges(saved, before, auth);
        return saved;
    }


    @DeleteMapping("/{id}")
    @Transactional
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable Long id) {

        Event event = em.find(
            Event.class,
            id,
            LockModeType.PESSIMISTIC_WRITE
        );

        if (event == null) {
            throw new ResponseStatusException(
                HttpStatus.NOT_FOUND,
                "Event not found"
            );
        }

        Integer bookings = jdbc.queryForObject(
            "SELECT COUNT(*) FROM bookings WHERE event_id = ?",
            Integer.class, id
        );

        Integer history = jdbc.queryForObject(
            "SELECT COUNT(*) FROM event_change_history WHERE event_id = ?",
            Integer.class, id
        );

        Integer legacy = jdbc.queryForObject(
            "SELECT COUNT(*) FROM legacy_event_imports WHERE event_id = ?",
            Integer.class, id
        );

        if ((bookings != null && bookings > 0) ||
            (history != null && history > 0) ||
            (legacy != null && legacy > 0)) {

            throw new ResponseStatusException(
                HttpStatus.CONFLICT,
                "This event has related records. " +
                "Set it to INACTIVE instead."
            );
        }

        events.delete(event);
        events.flush();
    }

    @PatchMapping("/{id}/status")
    @Transactional
    public Event changeStatus(
            @PathVariable Long id,
            @RequestBody StatusInput input,
            Authentication auth) {

        if (input == null || input.status() == null)
            throw invalid("Status is required");

        String status = input.status()
            .trim().toUpperCase(Locale.ROOT);

        if (!Set.of("ACTIVE", "INACTIVE").contains(status))
            throw invalid("Invalid status");

        Event event = em.find(
            Event.class, id, LockModeType.PESSIMISTIC_WRITE);

        if (event == null)
            throw new ResponseStatusException(
                HttpStatus.NOT_FOUND, "Event not found");

        Map<String, String> before = snapshot(event);

        event.setStatus(status);
        Event saved = events.saveAndFlush(event);
        recordChanges(saved, before, auth);
        return saved;
    }
}
