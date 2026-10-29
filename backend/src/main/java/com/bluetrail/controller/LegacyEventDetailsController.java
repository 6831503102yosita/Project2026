package com.bluetrail.controller;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.LinkedHashMap;
import java.util.Map;

@RestController
public class LegacyEventDetailsController {

    private final JdbcTemplate jdbc;

    public LegacyEventDetailsController(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    @GetMapping("/api/events/legacy-details")
    public Map<Long, String> legacyDetails() {
        Map<Long, String> result = new LinkedHashMap<>();

        jdbc.query(
            "SELECT event_id, source_data FROM legacy_event_imports",
            rs -> {
                result.put(
                    rs.getLong("event_id"),
                    rs.getString("source_data")
                );
            }
        );

        return result;
    }
}
