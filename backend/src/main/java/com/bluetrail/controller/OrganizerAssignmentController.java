package com.bluetrail.controller;

import com.bluetrail.repository.UserRepository;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.core.Authentication;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import java.sql.*;
import java.util.*;

@RestController
public class OrganizerAssignmentController {
    private final JdbcTemplate jdbc;
    private final UserRepository users;
    public OrganizerAssignmentController(JdbcTemplate jdbc, UserRepository users) {
        this.jdbc=jdbc; this.users=users;
    }
    public record AssignmentInput(Long requestId, Long organizerId, String note) {}
    private List<Map<String,Object>> list(String where, Object... args) {
        return jdbc.queryForList("SELECT a.id, a.request_id AS requestId, a.organizer_id AS organizerId," +
            " a.status, a.note, a.created_at AS createdAt, r.title AS eventTitle," +
            " r.location, r.requested_date AS requestedDate, r.guest_count AS guestCount," +
            " u.name AS organizerName FROM organizer_assignments a" +
            " JOIN event_requests r ON r.id=a.request_id JOIN users u ON u.id=a.organizer_id" +
            " WHERE " + where + " ORDER BY a.id DESC", args);
    }
    @GetMapping("/api/admin/organizer-assignments")
    public List<Map<String,Object>> adminList() { return list("1=1"); }
    @GetMapping("/api/organizer/assignments/my")
    public List<Map<String,Object>> myList(Authentication auth) {
        Long id=users.findByEmail(auth.getName()).orElseThrow().getId();
        return list("a.organizer_id=?",id);
    }
    @PostMapping("/api/admin/organizer-assignments")
    @ResponseStatus(HttpStatus.CREATED)
    @Transactional
    public Map<String,Object> assign(@RequestBody AssignmentInput input) {
        if(input==null || input.requestId()==null || input.organizerId()==null) throw new ResponseStatusException(HttpStatus.BAD_REQUEST);
        Long requestCount=jdbc.queryForObject("SELECT COUNT(*) FROM event_requests WHERE id=?",Long.class,input.requestId());
        Long organizerCount=jdbc.queryForObject("SELECT COUNT(*) FROM users WHERE id=? AND role='ORGANIZER'",Long.class,input.organizerId());
        if(requestCount==null || requestCount==0 || organizerCount==null || organizerCount==0) throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Invalid request or organizer");
        String note=input.note()==null?"":input.note().trim();
        if(note.length()>2000) throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Note too long");
        jdbc.update("INSERT INTO organizer_assignments(request_id,organizer_id,note,status) VALUES(?,?,?,'ASSIGNED')",input.requestId(),input.organizerId(),note);
        return Map.of("message","Assigned");
    }
    public record StatusInput(String status) {}
    @PatchMapping("/api/organizer/assignments/{id}/status")
    @Transactional
    public Map<String,Object> update(@PathVariable Long id, @RequestBody StatusInput input,Authentication auth) {
        if(input==null || input.status()==null) throw new ResponseStatusException(HttpStatus.BAD_REQUEST);
        String status=input.status().toUpperCase(Locale.ROOT).trim();
        if(!Set.of("ASSIGNED","PROGRESS","DONE").contains(status)) throw new ResponseStatusException(HttpStatus.BAD_REQUEST);
        Long uid=users.findByEmail(auth.getName()).orElseThrow().getId();
        int changed=jdbc.update("UPDATE organizer_assignments SET status=? WHERE id=? AND organizer_id=?",status,id,uid);
        if(changed==0) throw new ResponseStatusException(HttpStatus.NOT_FOUND);
        return Map.of("id",id,"status",status);
    }
}
