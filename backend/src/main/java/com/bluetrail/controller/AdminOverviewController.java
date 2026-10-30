package com.bluetrail.controller;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;
import java.math.BigDecimal;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/** Read-only admin dashboard. All figures come from current MySQL records. */
@RestController
public class AdminOverviewController {
    private final JdbcTemplate jdbc;
    public AdminOverviewController(JdbcTemplate jdbc) { this.jdbc = jdbc; }

    private long count(String sql) {
        Long result = jdbc.queryForObject(sql, Long.class);
        return result == null ? 0 : result;
    }

    @GetMapping("/api/admin/overview")
    public Map<String, Object> overview() {
        Map<String, Object> d = new LinkedHashMap<>();
        d.put("events", count("SELECT COUNT(*) FROM events"));
        d.put("activeEvents", count("SELECT COUNT(*) FROM events WHERE UPPER(status)='ACTIVE'"));
        d.put("bookings", count("SELECT COUNT(*) FROM bookings"));
        d.put("pendingBookings", count("SELECT COUNT(*) FROM bookings WHERE UPPER(status)='PENDING'"));
        d.put("confirmedBookings", count("SELECT COUNT(*) FROM bookings WHERE UPPER(status)='CONFIRMED'"));
        d.put("pendingSlips", count("SELECT COUNT(*) FROM payments WHERE UPPER(status)='PENDING'"));
        d.put("requests", count("SELECT COUNT(*) FROM event_requests"));
        d.put("newRequests", count("SELECT COUNT(*) FROM event_requests WHERE LOWER(status) IN ('pending','new')"));
        d.put("reviewRequests", count("SELECT COUNT(*) FROM event_requests WHERE LOWER(status) IN ('review','under_review','info')"));
        d.put("waitingRequests", count("SELECT COUNT(*) FROM event_requests WHERE LOWER(status) IN ('confirm','waiting_confirmation','waiting_for_confirmation')"));
        d.put("confirmedRequests", count("SELECT COUNT(*) FROM event_requests WHERE LOWER(status)='confirmed'"));
        d.put("inProgressRequests", count("SELECT COUNT(*) FROM event_requests WHERE LOWER(status) IN ('progress','in_progress')"));
        d.put("completedRequests", count("SELECT COUNT(*) FROM event_requests WHERE LOWER(status) IN ('done','completed')"));
        d.put("users", count("SELECT COUNT(*) FROM users"));
        d.put("sentQuotations", count("SELECT COUNT(*) FROM quotations WHERE UPPER(status)='SENT'"));
        d.put("draftQuotations", count("SELECT COUNT(*) FROM quotations WHERE UPPER(status)='DRAFT'"));
        BigDecimal revenue = jdbc.queryForObject(
            "SELECT COALESCE(SUM(amount),0) FROM payments WHERE UPPER(status)='APPROVED'",
            BigDecimal.class);
        d.put("approvedRevenue", revenue == null ? BigDecimal.ZERO : revenue);
        List<Map<String, Object>> recent = jdbc.queryForList(
            "SELECT r.id, r.title, r.category, r.location, r.status, r.created_at AS createdAt, " +
            "r.requested_date AS requestedDate, r.budget, u.name AS customerName " +
            "FROM event_requests r JOIN users u ON u.id=r.user_id " +
            "ORDER BY r.created_at DESC,r.id DESC LIMIT 8");
        d.put("recentRequests", recent);
        return d;
    }
}
