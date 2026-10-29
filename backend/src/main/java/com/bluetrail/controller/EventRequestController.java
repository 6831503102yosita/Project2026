package com.bluetrail.controller;

import com.bluetrail.entity.EventRequest;
import com.bluetrail.entity.User;
import com.bluetrail.repository.EventRequestRepository;
import com.bluetrail.repository.UserRepository;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;

@RestController
public class EventRequestController {

    private final EventRequestRepository requests;
    private final UserRepository users;

    public EventRequestController(
            EventRequestRepository requests,
            UserRepository users) {
        this.requests = requests;
        this.users = users;
    }

    public record NewRequest(
        String title,
        String category,
        String description,
        String location,
        String requestedDate,
        Integer guestCount,
        BigDecimal budget,
        String additionalDetails
    ) {}

    public record StatusUpdate(String status) {}

    private User currentUser(Authentication auth) {
        return users.findByEmail(auth.getName())
            .orElseThrow(() ->
                new IllegalStateException("User not found")
            );
    }

    private String clean(String value) {
        return value == null ? "" : value.trim();
    }

    private Map<String, Object> toResponse(EventRequest req) {
        Map<String, Object> result = new LinkedHashMap<>();

        result.put("id", req.getId());
        result.put("title", req.getTitle());
        result.put("category", req.getCategory());
        result.put("description", req.getDescription());
        result.put("additionalDetails", req.getAdditionalDetails());
        result.put("location", req.getLocation());
        result.put("requestedDate", req.getRequestedDate());
        result.put("guestCount", req.getGuestCount());
        result.put("budget", req.getBudget());
        result.put("status", req.getStatus());
        result.put("createdAt", req.getCreatedAt());

        User owner = req.getUser();

        if (owner != null) {
            result.put("userId", owner.getId());
            result.put("customerName", owner.getName());
            result.put("customerEmail", owner.getEmail());
            result.put("customerPhone", owner.getPhone());
        }

        return result;
    }

    @PostMapping("/api/event-requests")
    public ResponseEntity<?> create(
            @RequestBody NewRequest input,
            Authentication auth) {

        if (input == null) {
            return ResponseEntity.badRequest()
                .body(Map.of("error", "Invalid request"));
        }

        String title = clean(input.title());
        String category = clean(input.category());
        String description = clean(input.description());
        String location = clean(input.location());
        String additionalDetails = clean(input.additionalDetails());

        if (title.isEmpty() || title.length() > 150 ||
            category.isEmpty() || category.length() > 50 ||
            description.length() > 5000 ||
            additionalDetails.length() > 10000 ||
            location.isEmpty() || location.length() > 255 ||
            input.guestCount() == null ||
            input.guestCount() < 1 ||
            input.budget() == null ||
            input.budget().signum() < 0) {

            return ResponseEntity.badRequest()
                .body(Map.of("error", "Invalid event details"));
        }

        LocalDateTime eventDate;

        try {
            eventDate = LocalDate.parse(
                input.requestedDate()
            ).atStartOfDay();
        } catch (Exception ex) {
            return ResponseEntity.badRequest()
                .body(Map.of("error", "Invalid event date"));
        }

        if (eventDate.toLocalDate().isBefore(LocalDate.now())) {
            return ResponseEntity.badRequest()
                .body(Map.of("error", "Event date is in the past"));
        }

        EventRequest req = new EventRequest();

        req.setUser(currentUser(auth));
        req.setTitle(title);
        req.setCategory(category);
        req.setDescription(description);
        req.setAdditionalDetails(additionalDetails);
        req.setLocation(location);
        req.setRequestedDate(eventDate);
        req.setGuestCount(input.guestCount());
        req.setBudget(input.budget());
        req.setStatus("pending");

        EventRequest saved = requests.save(req);

        return ResponseEntity.status(HttpStatus.CREATED)
            .body(toResponse(saved));
    }

    @GetMapping("/api/event-requests/my")
    public List<Map<String, Object>> myRequests(
            Authentication auth) {

        User user = currentUser(auth);

        return requests.findByUserId(user.getId())
            .stream()
            .map(this::toResponse)
            .toList();
    }

    @GetMapping("/api/admin/event-requests")
    public List<Map<String, Object>> allRequests() {

        return requests.findAll()
            .stream()
            .map(this::toResponse)
            .toList();
    }

    @PatchMapping("/api/admin/event-requests/{id}/status")
    public ResponseEntity<?> updateStatus(
            @PathVariable Long id,
            @RequestBody StatusUpdate input) {

        if (input == null || input.status() == null) {
            return ResponseEntity.badRequest()
                .body(Map.of("error", "Status is required"));
        }

        String status = input.status()
            .trim()
            .toLowerCase(Locale.ROOT);

        Set<String> allowed = Set.of(
            "pending",
            "review",
            "info",
            "confirm",
            "confirmed",
            "cancel"
        );

        if (!allowed.contains(status)) {
            return ResponseEntity.badRequest()
                .body(Map.of("error", "Invalid status"));
        }

        return requests.findById(id)
            .<ResponseEntity<?>>map(req -> {
                req.setStatus(status);
                return ResponseEntity.ok(
                    toResponse(requests.save(req))
                );
            })
            .orElseGet(() ->
                ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("error", "Request not found"))
            );
    }
}
