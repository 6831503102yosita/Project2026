package com.bluetrail.controller;

import com.bluetrail.entity.User;
import com.bluetrail.repository.UserRepository;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.core.Authentication;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import java.util.*;

@RestController
public class BusinessDataController {
    private final JdbcTemplate jdbc;
    private final UserRepository users;
    private static final List<String> CONTACT_KEYS = List.of("phone", "email", "line", "fb", "ig", "addr", "pay", "hold");

    public BusinessDataController(JdbcTemplate jdbc, UserRepository users) {
        this.jdbc = jdbc;
        this.users = users;
    }

    private ResponseStatusException invalid(String text) {
        return new ResponseStatusException(HttpStatus.BAD_REQUEST, text);
    }

    @GetMapping("/api/site/contact")
    public Map<String,String> contact() {
        Map<String,String> result = new LinkedHashMap<>();
        jdbc.query("SELECT setting_key, setting_value FROM site_settings WHERE setting_key IN ('phone','email','line','fb','ig','addr','pay','hold')",
            rs -> { result.put(rs.getString(1), rs.getString(2)); });
        return result;
    }

    @PutMapping("/api/admin/site/contact")
    @Transactional
    public Map<String,String> updateContact(@RequestBody Map<String,String> payload) {
        if (payload == null) throw invalid("Missing contact settings");
        for (String key : CONTACT_KEYS) {
            String value = payload.getOrDefault(key, "").trim();
            if (value.length() > 1500) throw invalid("Contact value too long: " + key);
            if (key.equals("hold")) {
                try {
                    int hours = Integer.parseInt(value);
                    if (hours < 1 || hours > 720) throw invalid("Invalid hold hours");
                } catch (NumberFormatException e) { throw invalid("Invalid hold hours"); }
            }
            jdbc.update("INSERT INTO site_settings (setting_key,setting_value) VALUES (?,?) ON DUPLICATE KEY UPDATE setting_value=VALUES(setting_value)", key, value);
        }
        return contact();
    }

    @GetMapping("/api/admin/users")
    public List<Map<String,Object>> adminUsers() {
        return users.findAll().stream().map(u -> {
            Map<String,Object> m = new LinkedHashMap<>();
            m.put("id",u.getId());
            m.put("name",u.getName());
            m.put("email",u.getEmail());
            m.put("role",u.getRole());
            m.put("phone",u.getPhone());
            return m;
        }).toList();
    }

    public record RoleChange(String role) {}

    @PatchMapping("/api/admin/users/{id}/role")
    @Transactional
    public Map<String,Object> changeRole(@PathVariable Long id, @RequestBody RoleChange change, Authentication auth) {
        if (change == null || change.role() == null) throw invalid("Role required");
        String role = change.role().trim().toUpperCase(Locale.ROOT);
        if (!Set.of("CUSTOMER", "ORGANIZER", "ADMIN").contains(role)) throw invalid("Invalid role");
        User target = users.findById(id).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
        if (target.getEmail().equalsIgnoreCase(auth.getName()) && !role.equals("ADMIN"))
            throw new ResponseStatusException(HttpStatus.CONFLICT,"Cannot demote your own admin account");
        if ("ADMIN".equals(target.getRole()) && !role.equals("ADMIN")) {
            Long count = jdbc.queryForObject("SELECT COUNT(*) FROM users WHERE role='ADMIN'",Long.class);
            if (count == null || count < 2) throw new ResponseStatusException(HttpStatus.CONFLICT,"Cannot remove last admin");
        }
        if ("ORGANIZER".equals(target.getRole()) && !role.equals("ORGANIZER")) {
            Long count = jdbc.queryForObject("SELECT COUNT(*) FROM organizer_assignments WHERE organizer_id=?",Long.class,id);
            if (count != null && count > 0) throw new ResponseStatusException(HttpStatus.CONFLICT,"Organizer has assigned work");
        }
        target.setRole(role);
        users.saveAndFlush(target);
        return Map.of("id",target.getId(),"role",target.getRole());
    }
}
