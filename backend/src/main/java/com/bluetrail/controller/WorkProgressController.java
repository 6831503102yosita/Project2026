package com.bluetrail.controller;

import org.springframework.web.bind.annotation.*;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import java.util.*;

@RestController
public class WorkProgressController {
    private final JdbcTemplate db;
    public WorkProgressController(JdbcTemplate db){this.db=db;}
    private Map<String,Object> assignment(long id,Authentication auth,boolean lock){
        boolean admin=auth.getAuthorities().stream().anyMatch(a->a.getAuthority().equals("ROLE_ADMIN"));
        var rows=db.queryForList("SELECT a.id,a.request_id AS requestId,a.organizer_id AS organizerId,a.status,a.note,r.title,r.category,r.location,r.requested_date AS requestedDate,r.end_date AS endDate,r.guest_count AS guestCount,r.budget,r.description,r.additional_details AS additionalDetails,u.name AS customerName,u.email AS customerEmail,u.phone AS customerPhone,o.name AS organizerName FROM organizer_assignments a JOIN event_requests r ON r.id=a.request_id JOIN users u ON u.id=r.user_id JOIN users o ON o.id=a.organizer_id WHERE a.id=?"+(admin?"":" AND o.email=?")+(lock?" FOR UPDATE":""),admin?new Object[]{id}:new Object[]{id,auth.getName()});
        if(rows.isEmpty()) throw new ResponseStatusException(HttpStatus.NOT_FOUND,"Assignment not found");
        return rows.get(0);
    }
    @GetMapping({"/api/organizer/assignments/{id}","/api/admin/organizer-assignments/{id}"})
    @Transactional(readOnly=true)
    public Map<String,Object> detail(@PathVariable long id,Authentication auth){
        var a=assignment(id,auth,false);
        return Map.of("assignment",a,"reports",db.queryForList("SELECT id,progress,message,created_by AS createdBy,created_at AS createdAt FROM organizer_work_reports WHERE assignment_id=? ORDER BY id DESC",id));
    }
    public record Report(Integer progress,String message){}
    @PostMapping("/api/organizer/assignments/{id}/reports")
    @ResponseStatus(HttpStatus.CREATED)
    @Transactional
    public Map<String,Object> report(@PathVariable long id,@RequestBody Report input,Authentication auth){
        if(input==null || input.progress()==null || input.progress()<0 || input.progress()>100 || input.message()==null || input.message().isBlank() || input.message().length()>3000)
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Progress 0–100 and report 1–3000 characters required");
        assignment(id,auth,true);
        String status=input.progress()==100?"DONE":input.progress()==0?"ASSIGNED":"PROGRESS";
        db.update("INSERT INTO organizer_work_reports(assignment_id,progress,message,created_by) VALUES(?,?,?,?)",id,input.progress(),input.message().trim(),auth.getName());
        db.update("UPDATE organizer_assignments SET status=? WHERE id=?",status,id);
        return Map.of("saved",true,"status",status);
    }
}
