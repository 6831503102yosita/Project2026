package com.bluetrail.controller;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;
import java.util.LinkedHashMap;
import java.util.Map;

@RestController
public class AdminOverviewController {

    private final JdbcTemplate jdbc;

    public AdminOverviewController(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    private long count(String sql) {
        Long result = jdbc.queryForObject(sql, Long.class);
        return result == null ? 0 : result;
    }

    @GetMapping("/api/admin/overview")
    public Map<String, Long> overview() {
        Map<String, Long> data = new LinkedHashMap<>();

        data.put("events",
            count("SELECT COUNT(*) FROM events"));

        data.put("bookings",
            count("SELECT COUNT(*) FROM bookings"));

        data.put("pendingSlips",
            count("SELECT COUNT(*) FROM payments " +
                  "WHERE UPPER(status) = 'PENDING'"));

        data.put("requests",
            count("SELECT COUNT(*) FROM event_requests"));

        data.put("users",
            count("SELECT COUNT(*) FROM users"));

        return data;
    }
}
