package com.bluetrail.controller;

import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.core.Authentication;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Map;

@RestController
public class QuotationExtrasController {
    private final JdbcTemplate jdbc;

    public QuotationExtrasController(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    @GetMapping("/api/admin/quotation-template")
    public String template() {
        return jdbc.query(
            "SELECT template_json FROM quotation_templates WHERE id=1",
            rs -> rs.next() ? rs.getString(1) : "{}"
        );
    }

    @PutMapping("/api/admin/quotation-template")
    @Transactional
    public Map<String, Object> templateSave(
            @RequestBody String body,
            Authentication auth) {

        if (body == null || body.length() > 150000) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST);
        }

        jdbc.update(
            "INSERT INTO quotation_templates " +
            "(id,template_json,updated_by) VALUES(1,?,?) " +
            "ON DUPLICATE KEY UPDATE " +
            "template_json=VALUES(template_json)," +
            "updated_by=VALUES(updated_by)",
            com.bluetrail.service.CompanyBanks.templateDocument(body),
            auth.getName()
        );

        return Map.of("saved", true);
    }

    @GetMapping("/api/admin/quotations/{id}/revisions")
    public List<Map<String, Object>> revisions(@PathVariable long id) {
        return jdbc.queryForList(
            "SELECT revision,snapshot_json AS snapshotJson," +
            "created_at AS createdAt,created_by AS createdBy " +
            "FROM quotation_revisions " +
            "WHERE quotation_id=? ORDER BY revision",
            id
        );
    }

    @PostMapping("/api/admin/quotations/{id}/revisions")
    @Transactional
    public Map<String, Object> revision(
            @PathVariable long id,
            @RequestBody(required = false) String body,
            Authentication auth) {

        if (auth == null || auth.getAuthorities().stream()
                .noneMatch(a -> "ROLE_ADMIN".equals(a.getAuthority()))) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN);
        }

        if (body != null && body.length() > 250000) {
            throw new ResponseStatusException(
                HttpStatus.BAD_REQUEST, "Request body too large");
        }

        // Use the same parent-row lock as quotation send/respond.
        List<Long> parents = jdbc.queryForList(
            "SELECT id FROM quotations WHERE id=? FOR UPDATE",
            Long.class, id
        );

        if (parents.isEmpty()) {
            throw new ResponseStatusException(
                HttpStatus.NOT_FOUND, "Quotation not found");
        }

        // Locking read sees the latest committed revision.
        List<Integer> previous = jdbc.queryForList(
            "SELECT revision FROM quotation_revisions " +
            "WHERE quotation_id=? ORDER BY revision DESC LIMIT 1 FOR UPDATE",
            Integer.class, id
        );

        int next = previous.isEmpty()
            ? 0 : Math.addExact(previous.get(0), 1);

        // Client-supplied snapshot content is never persisted.
        int inserted = jdbc.update(
            "INSERT INTO quotation_revisions " +
            "(quotation_id,revision,snapshot_json,created_by) " +
            "SELECT q.id,?,JSON_OBJECT(" +
            "'id',q.id," +
            "'quotationNumber',q.quotation_number," +
            "'status',q.status," +
            "'totalAmount',q.total_amount," +
            "'subtotal',q.subtotal," +
            "'discount',q.discount," +
            "'taxAmount',q.tax_amount," +
            "'adminNote',q.admin_note," +
            "'customerNote',q.customer_note," +
            "'eventRequestId',q.event_request_id," +
            "'documentJson',d.document_json," +
            "'items',(" +
            "SELECT COALESCE(JSON_ARRAYAGG(JSON_OBJECT(" +
            "'description',i.description," +
            "'quantity',i.quantity," +
            "'unitPrice',i.unit_price," +
            "'lineTotal',i.line_total" +
            ")),JSON_ARRAY()) " +
            "FROM quotation_items i WHERE i.quotation_id=q.id" +
            ")),? " +
            "FROM quotations q " +
            "LEFT JOIN quotation_documents d ON d.quotation_id=q.id " +
            "WHERE q.id=?",
            next, auth.getName(), id
        );

        if (inserted != 1) {
            throw new IllegalStateException(
                "Unable to capture quotation revision");
        }

        return Map.of("quotationId", id, "revision", next);
    }
}
