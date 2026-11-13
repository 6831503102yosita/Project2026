package com.bluetrail.controller;

import com.bluetrail.entity.*;
import com.bluetrail.repository.*;
import org.springframework.web.bind.annotation.*;
import org.springframework.security.core.Authentication;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.transaction.annotation.Transactional;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.*;

@RestController
@Transactional
public class EventRequestChangeController {
    private final EventRequestChangeRepository changes;
    private final EventRequestRepository requests;
    private final UserRepository users;

    public EventRequestChangeController(
            EventRequestChangeRepository changes,
            EventRequestRepository requests,
            UserRepository users) {
        this.changes = changes;
        this.requests = requests;
        this.users = users;
    }

    @jakarta.persistence.PersistenceContext
    private jakarta.persistence.EntityManager em;

    public record NewChange(
        String details, String fieldName, String newValue,
        List<ChangeInput> changes) {}
    public record ChangeInput(String fieldName, String newValue) {}
    public record Decision(String status, String adminNote) {}

    private void requireRole(Authentication auth, String role) {
        if (auth == null || !auth.isAuthenticated())
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED);
        if (auth.getAuthorities().stream().noneMatch(
                a -> a.getAuthority().equals("ROLE_" + role)))
            throw new ResponseStatusException(HttpStatus.FORBIDDEN);
    }

    private EventRequest ownedRequest(Long id, Authentication auth) {
        requireRole(auth, "CUSTOMER");
        User user = users.findByEmail(auth.getName()).orElseThrow(
            () -> new ResponseStatusException(HttpStatus.UNAUTHORIZED));
        EventRequest request = requests.findById(id).orElseThrow(
            () -> new ResponseStatusException(HttpStatus.NOT_FOUND));
        if (!Objects.equals(request.getUser().getId(), user.getId()))
            throw new ResponseStatusException(HttpStatus.NOT_FOUND);
        return request;
    }

    private Map<String,Object> response(EventRequestChange c) {
        Map<String,Object> out = new LinkedHashMap<>();
        out.put("id", c.id);
        out.put("eventRequestId", c.eventRequest.getId());
        out.put("eventTitle", c.eventRequest.getTitle());
        out.put("customerName", c.eventRequest.getUser().getName());
        out.put("details", c.details);
        out.put("changes", c.items.stream().map(item -> Map.of(
            "fieldName", item.fieldName,
            "oldValue", item.oldValue,
            "newValue", item.newValue)).toList());
        out.put("fieldName", c.fieldName);
        out.put("oldValue", c.oldValue);
        out.put("newValue", c.newValue);
        out.put("status", c.status);
        out.put("adminNote", c.adminNote);
        out.put("reviewedBy", c.reviewedBy);
        out.put("createdAt", c.createdAt.toString() + "Z");
        out.put("reviewedAt",
            c.reviewedAt == null ? null : c.reviewedAt.toString() + "Z");
        return out;
    }

    @GetMapping("/api/event-requests/{id}/changes")
    public List<Map<String,Object>> mine(
            @PathVariable Long id, Authentication auth) {
        ownedRequest(id, auth);
        return changes.findByEventRequestIdOrderByCreatedAtDesc(id)
            .stream().map(this::response).toList();
    }

    @PostMapping("/api/event-requests/{id}/changes")
    @ResponseStatus(HttpStatus.CREATED)
    public Map<String,Object> submit(
            @PathVariable Long id,
            @RequestBody NewChange input,
            Authentication auth) {
        EventRequest request = ownedRequest(id, auth);
        String text = input == null || input.details() == null
            ? "" : input.details().trim();
        if (text.isEmpty() || text.length() > 5000)
            throw new ResponseStatusException(
                HttpStatus.BAD_REQUEST, "Details must contain 1-5000 characters");
        if ("cancel".equalsIgnoreCase(request.getStatus()))
            throw new ResponseStatusException(
                HttpStatus.CONFLICT, "Request is cancelled");

        List<ChangeInput> inputs = input.changes();
        if (inputs == null || inputs.isEmpty())
            inputs = List.of(new ChangeInput(
                input.fieldName(), input.newValue()));
        if (inputs.size() > 10)
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST);
        EventRequestChange c = new EventRequestChange();
        Set<String> used = new HashSet<>();
        for (ChangeInput entry : inputs) {
            if (entry == null || !used.add(entry.fieldName()))
                throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST, "Duplicate field");
            String field = entry.fieldName();
            String value = entry.newValue() == null ? "" : entry.newValue().trim();
            String before = readValue(request, field);
            validateValue(field, value);
            if (Objects.equals(before, value))
                throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST, "New value must differ");
            EventRequestChange.ChangeItem item = new EventRequestChange.ChangeItem();
            item.fieldName = field;
            item.oldValue = before;
            item.newValue = value;
            c.items.add(item);
        }
        c.eventRequest = request;
        c.details = text;
        return response(changes.saveAndFlush(c));
    }

    @GetMapping("/api/admin/event-request-changes")
    public List<Map<String,Object>> all(Authentication auth) {
        requireRole(auth, "ADMIN");
        return changes.findAllByOrderByCreatedAtDesc()
            .stream().map(this::response).toList();
    }

    @PatchMapping("/api/admin/event-request-changes/{id}")
    public Map<String,Object> decide(
            @PathVariable Long id,
            @RequestBody Decision input,
            Authentication auth) {
        requireRole(auth, "ADMIN");
        if (input == null || input.status() == null ||
                !Set.of("APPROVED", "REJECTED").contains(input.status()))
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST);
        String note = input.adminNote() == null ? "" : input.adminNote().trim();
        if (note.length() > 2000)
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST);
        EventRequestChange c = em.find(
            EventRequestChange.class, id,
            jakarta.persistence.LockModeType.PESSIMISTIC_WRITE);
        if (c == null)
            throw new ResponseStatusException(HttpStatus.NOT_FOUND);
        if (!"PENDING".equals(c.status))
            throw new ResponseStatusException(
                HttpStatus.CONFLICT, "Already reviewed");

        if ("APPROVED".equals(input.status())) {
            EventRequest request = em.find(
                EventRequest.class, c.eventRequest.getId(),
                jakarta.persistence.LockModeType.PESSIMISTIC_WRITE);
            em.refresh(request);
            if ("cancel".equalsIgnoreCase(request.getStatus()))
                throw new ResponseStatusException(HttpStatus.CONFLICT);

            List<EventRequestChange.ChangeItem> entries = new ArrayList<>(c.items);
            if (entries.isEmpty()) {
                if (c.fieldName == null)
                    throw new ResponseStatusException(HttpStatus.CONFLICT);
                EventRequestChange.ChangeItem legacy =
                    new EventRequestChange.ChangeItem();
                legacy.fieldName = c.fieldName;
                legacy.oldValue = c.oldValue;
                legacy.newValue = c.newValue;
                entries.add(legacy);
            }
            for (EventRequestChange.ChangeItem item : entries) {
                if (!Objects.equals(
                        readValue(request, item.fieldName), item.oldValue))
                    throw new ResponseStatusException(
                        HttpStatus.CONFLICT, "Original value has changed");
                validateValue(item.fieldName, item.newValue);
            }
            for (EventRequestChange.ChangeItem item : entries)
                applyValue(request, item.fieldName, item.newValue);
            java.time.LocalDate finish = request.getEndDate()==null
                ? request.getRequestedDate().toLocalDate() : request.getEndDate();
            if(finish.isBefore(request.getRequestedDate().toLocalDate()))
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"End date precedes start date");
            String start=timeValue(request,"startTime"), end=timeValue(request,"endTime");
            if(finish.equals(request.getRequestedDate().toLocalDate()) && !start.isBlank() && !end.isBlank() && end.compareTo(start)<=0)
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"End time must follow start time");
            requests.save(request);
        }
        c.status = input.status();
        c.adminNote = note;
        c.reviewedBy = auth.getName();
        c.reviewedAt = LocalDateTime.now(ZoneOffset.UTC);
        return response(changes.saveAndFlush(c));
    }

    private String timeValue(EventRequest r, String field) {
        String raw = r.getAdditionalDetails();
        if (raw == null || raw.isBlank()) return "";
        var json = java.util.regex.Pattern.compile(
            "\"" + field + "\"\\s*:\\s*\"([^\"]*)\"").matcher(raw);
        if (json.find()) return json.group(1);
        var legacy = java.util.regex.Pattern.compile(
            "(?:^|[,{]\\s*)" + field + "=([^,}]*)").matcher(raw);
        return legacy.find() ? legacy.group(1).trim() : "";
    }

    private String readValue(EventRequest r, String field) {
        if (field == null)
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST);
        return switch (field) {
            case "title" -> Objects.toString(r.getTitle(), "");
            case "location" -> Objects.toString(r.getLocation(), "");
            case "requestedDate" -> r.getRequestedDate() == null ? ""
                : r.getRequestedDate().toLocalDate().toString();
            case "endDate" -> r.getEndDate()==null ? "" : r.getEndDate().toString();
            case "guestCount" -> Objects.toString(r.getGuestCount(), "");
            case "budget" -> r.getBudget() == null ? ""
                : r.getBudget().stripTrailingZeros().toPlainString();
            case "description" -> Objects.toString(r.getDescription(), "");
            case "startTime", "endTime" -> timeValue(r, field);
            default -> throw new ResponseStatusException(HttpStatus.BAD_REQUEST);
        };
    }

    private void validateValue(String field, String value) {
        try {
            if (value == null || value.isBlank()) throw new Exception();
            switch (field) {
                case "title" -> {
                    if (value.length() > 150) throw new Exception();
                }
                case "location" -> {
                    if (value.length() > 255) throw new Exception();
                }
                case "description" -> {
                    if (value.length() > 5000) throw new Exception();
                }
                case "requestedDate", "endDate" -> {
                    if (java.time.LocalDate.parse(value).isBefore(
                        java.time.LocalDate.now(ZoneOffset.ofHours(7))))
                        throw new Exception();
                }
                case "guestCount" -> {
                    if (!value.matches("[1-9][0-9]{0,8}"))
                        throw new Exception();
                }
                case "budget" -> {
                    if (!value.matches("[0-9]{1,13}(\\.[0-9]{1,2})?"))
                        throw new Exception();
                }
                case "startTime", "endTime" -> {
                    if (!value.matches("([01][0-9]|2[0-3]):[0-5][0-9]"))
                        throw new Exception();
                }
                default -> throw new Exception();
            }
        } catch (Exception e) {
            throw new ResponseStatusException(
                HttpStatus.BAD_REQUEST, "Invalid new value");
        }
    }

    private void applyValue(EventRequest r, String field, String value) {
        switch (field) {
            case "endDate" -> r.setEndDate(java.time.LocalDate.parse(value));
            case "title" -> r.setTitle(value);
            case "location" -> r.setLocation(value);
            case "description" -> r.setDescription(value);
            case "requestedDate" -> r.setRequestedDate(
                java.time.LocalDate.parse(value).atTime(
                    r.getRequestedDate() == null ? java.time.LocalTime.MIDNIGHT
                        : r.getRequestedDate().toLocalTime()));
            case "guestCount" -> r.setGuestCount(Integer.valueOf(value));
            case "budget" -> r.setBudget(new java.math.BigDecimal(value));
            case "startTime", "endTime" -> {
                String raw = Objects.toString(r.getAdditionalDetails(), "").trim();
                if (raw.isEmpty()) raw = "{}";
                var pattern = java.util.regex.Pattern.compile(
                    "\"" + field + "\"\\s*:\\s*\"[^\"]*\"");
                var match = pattern.matcher(raw);
                if (match.find()) {
                    raw = match.replaceFirst(java.util.regex.Matcher.quoteReplacement(
                        "\"" + field + "\":\"" + value + "\""));
                } else if (raw.matches("(?s).*\\b" + field + "=.*")) {
                    raw = raw.replaceFirst(
                        "\\b" + field + "=[^,}]*",
                        java.util.regex.Matcher.quoteReplacement(field + "=" + value));
                } else if (raw.startsWith("{") && raw.endsWith("}")
                        && (raw.equals("{}") || raw.startsWith("{\""))) {
                    String inner = raw.substring(1, raw.length()-1).trim();
                    raw = "{" + inner + (inner.isEmpty() ? "" : ",")
                        + "\"" + field + "\":\"" + value + "\"}";
                } else {
                    throw new ResponseStatusException(
                        HttpStatus.CONFLICT, "Unsupported additional details format");
                }
                r.setAdditionalDetails(raw);
            }
            default -> throw new ResponseStatusException(HttpStatus.BAD_REQUEST);
        }
    }

}
