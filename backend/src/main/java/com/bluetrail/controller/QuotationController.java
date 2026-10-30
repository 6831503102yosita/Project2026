package com.bluetrail.controller;

import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.jdbc.support.KeyHolder;
import org.springframework.security.core.Authentication;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.sql.PreparedStatement;
import java.sql.Statement;
import java.util.*;

@RestController
public class QuotationController {

    private final JdbcTemplate jdbc;

    public QuotationController(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public record ItemInput(
        String description,
        BigDecimal quantity,
        BigDecimal unitPrice
    ) {}

    public record NewQuotation(
        Long eventRequestId,
        List<ItemInput> items,
        BigDecimal discount,
        BigDecimal taxPercent,
        String adminNote,
        String documentJson
    ) {}

    public record CustomerDecision(
        String status,
        String note
    ) {}

    private ResponseStatusException error(
            HttpStatus status, String message) {
        return new ResponseStatusException(status, message);
    }

    private BigDecimal money(BigDecimal value) {
        return value.setScale(2, RoundingMode.HALF_UP);
    }

    private Map<String, Object> quotation(Long id) {
        List<Map<String, Object>> found = jdbc.queryForList(
            "SELECT q.id, q.event_request_id AS eventRequestId, " +
            "q.quotation_number AS quotationNumber, " +
            "q.revision, q.status, q.subtotal, q.discount, " +
            "q.tax_amount AS taxAmount, " +
            "q.total_amount AS totalAmount, " +
            "q.admin_note AS adminNote, " +
            "q.customer_note AS customerNote, " +
            "q.created_by AS createdBy, " +
            "d.document_json AS documentJson, " +
            "q.created_at AS createdAt, " +
            "q.sent_at AS sentAt, " +
            "q.responded_at AS respondedAt, " +
            "r.title AS eventTitle " +
            "FROM quotations q " +
            "JOIN event_requests r ON r.id=q.event_request_id " +
            "LEFT JOIN quotation_documents d ON d.quotation_id=q.id " +
            "WHERE q.id=?", id
        );

        if (found.isEmpty()) {
            throw error(HttpStatus.NOT_FOUND, "Quotation not found");
        }

        Map<String, Object> result =
            new LinkedHashMap<>(found.get(0));

        result.put("items", jdbc.queryForList(
            "SELECT id, description, quantity, " +
            "unit_price AS unitPrice, line_total AS lineTotal " +
            "FROM quotation_items WHERE quotation_id=? " +
            "ORDER BY sort_order,id", id
        ));

        return result;
    }

    private String status(Long id) {
        List<String> values = jdbc.queryForList(
            "SELECT status FROM quotations WHERE id=? FOR UPDATE",
            String.class, id
        );

        if (values.isEmpty()) {
            throw error(HttpStatus.NOT_FOUND, "Quotation not found");
        }

        return values.get(0);
    }

    @GetMapping("/api/admin/quotations")
    @Transactional(readOnly = true)
    public List<Map<String, Object>> adminList() {
        List<Long> ids = jdbc.queryForList(
            "SELECT id FROM quotations ORDER BY id DESC",
            Long.class
        );
        return ids.stream().map(this::quotation).toList();
    }

    @PostMapping("/api/admin/quotations")
    @ResponseStatus(HttpStatus.CREATED)
    @Transactional
    public Map<String, Object> create(
            @RequestBody NewQuotation input,
            Authentication auth) {

        if (input == null || input.eventRequestId() == null ||
            input.items() == null || input.items().isEmpty() ||
            input.items().size() > 100) {
            throw error(HttpStatus.BAD_REQUEST,
                "Event request and items are required");
        }

        Integer requestCount = jdbc.queryForObject(
            "SELECT COUNT(*) FROM event_requests WHERE id=?",
            Integer.class, input.eventRequestId()
        );

        if (requestCount == null || requestCount == 0) {
            throw error(HttpStatus.NOT_FOUND,
                "Event request not found");
        }

        BigDecimal subtotal = BigDecimal.ZERO;
        List<BigDecimal> lineTotals = new ArrayList<>();

        for (ItemInput item : input.items()) {
            if (item == null || item.description() == null ||
                item.description().isBlank() ||
                item.description().length() > 500 ||
                item.quantity() == null ||
                item.unitPrice() == null ||
                item.quantity().signum() <= 0 ||
                item.quantity().stripTrailingZeros().scale() > 0 ||
                item.unitPrice().signum() < 0 ||
                item.unitPrice().stripTrailingZeros().scale() > 0) {
                throw error(HttpStatus.BAD_REQUEST,
                    "Invalid quotation item");
            }

            BigDecimal line = money(
                item.quantity().multiply(item.unitPrice())
            );

            if (line.compareTo(new BigDecimal("9999999999.99")) > 0) {
                throw error(HttpStatus.BAD_REQUEST,
                    "Quotation item amount is too large");
            }

            lineTotals.add(line);
            subtotal = subtotal.add(line);
        }

        BigDecimal discount = input.discount() == null
            ? BigDecimal.ZERO : input.discount();

        BigDecimal rate = input.taxPercent() == null
            ? BigDecimal.ZERO : input.taxPercent();

        if (discount.signum() < 0 ||
            discount.stripTrailingZeros().scale() > 0 ||
            discount.compareTo(subtotal) > 0 ||
            rate.signum() < 0 ||
            rate.stripTrailingZeros().scale() > 0 ||
            rate.compareTo(new BigDecimal("100")) > 0 ||
            subtotal.compareTo(new BigDecimal("9999999999.99")) > 0) {
            throw error(HttpStatus.BAD_REQUEST,
                "Invalid discount, tax or subtotal");
        }

        String note = input.adminNote() == null
            ? "" : input.adminNote().trim();

        if (note.length() > 5000) {
            throw error(HttpStatus.BAD_REQUEST, "Note too long");
        }

        BigDecimal net = subtotal.subtract(discount);
        BigDecimal tax = money(
            net.multiply(rate).divide(new BigDecimal("100"))
        );
        BigDecimal total = net.add(tax);

        if (total.compareTo(new BigDecimal("9999999999.99")) > 0) {
            throw error(HttpStatus.BAD_REQUEST,
                "Total amount is too large");
        }

        final BigDecimal finalSubtotal = money(subtotal);
        final BigDecimal finalDiscount = money(discount);
        KeyHolder keys = new GeneratedKeyHolder();

        jdbc.update(connection -> {
            PreparedStatement ps = connection.prepareStatement(
                "INSERT INTO quotations " +
                "(event_request_id,status,subtotal,discount," +
                "tax_amount,total_amount,admin_note,created_by) " +
                "VALUES (?,'DRAFT',?,?,?,?,?,?)",
                Statement.RETURN_GENERATED_KEYS
            );
            ps.setLong(1, input.eventRequestId());
            ps.setBigDecimal(2, finalSubtotal);
            ps.setBigDecimal(3, finalDiscount);
            ps.setBigDecimal(4, tax);
            ps.setBigDecimal(5, total);
            ps.setString(6, note);
            ps.setString(7, auth.getName());
            return ps;
        }, keys);

        if (keys.getKey() == null) {
            throw error(HttpStatus.INTERNAL_SERVER_ERROR,
                "Unable to create quotation");
        }

        Long id = keys.getKey().longValue();
        String number = String.format("BT-Q-%06d", id);

        jdbc.update(
            "UPDATE quotations SET quotation_number=? WHERE id=?",
            number, id
        );

        for (int i = 0; i < input.items().size(); i++) {
            ItemInput item = input.items().get(i);

            jdbc.update(
                "INSERT INTO quotation_items " +
                "(quotation_id,description,quantity,unit_price," +
                "line_total,sort_order) VALUES (?,?,?,?,?,?)",
                id,
                item.description().trim(),
                item.quantity(),
                item.unitPrice(),
                lineTotals.get(i),
                i
            );
        }

        if (input.documentJson() != null && !input.documentJson().isBlank()) {
            if (input.documentJson().length() > 30000) {
                throw error(HttpStatus.BAD_REQUEST, "Quotation document too large");
            }
            jdbc.update("INSERT INTO quotation_documents(quotation_id,document_json) VALUES (?,?)",
                id, input.documentJson());
        }
        return quotation(id);
    }

    @PatchMapping("/api/admin/quotations/{id}/send")
    @Transactional
    public Map<String, Object> send(@PathVariable Long id) {
        if (!"DRAFT".equals(status(id))) {
            throw error(HttpStatus.CONFLICT,
                "Only draft quotations can be sent");
        }

        int changed = jdbc.update(
            "UPDATE quotations SET status='SENT',sent_at=NOW(6) " +
            "WHERE id=? AND status='DRAFT'", id
        );

        if (changed != 1) {
            throw error(HttpStatus.CONFLICT,
                "Quotation was already sent");
        }

        jdbc.update(
            "INSERT INTO quotation_revisions " +
            "(quotation_id,revision,snapshot_json,created_by) " +
            "SELECT q.id, COALESCE((SELECT MAX(r.revision)+1 " +
            "FROM quotation_revisions r WHERE r.quotation_id=q.id),0), " +
            "JSON_OBJECT('id',q.id,'quotationNumber',q.quotation_number, " +
            "'status',q.status,'totalAmount',q.total_amount, " +
            "'subtotal',q.subtotal,'discount',q.discount, " +
            "'taxAmount',q.tax_amount,'adminNote',q.admin_note, " +
            "'eventRequestId',q.event_request_id,'items', " +
            "(SELECT COALESCE(JSON_ARRAYAGG(JSON_OBJECT( " +
            "'description',i.description,'quantity',i.quantity, " +
            "'unitPrice',i.unit_price,'lineTotal',i.line_total)),JSON_ARRAY()) " +
            "FROM quotation_items i WHERE i.quotation_id=q.id)), " +
            "q.created_by FROM quotations q WHERE q.id=?", id
        );

        return quotation(id);
    }

    @GetMapping("/api/quotations/my")
    @Transactional(readOnly = true)
    public List<Map<String, Object>> myQuotations(
            Authentication auth) {

        List<Long> ids = jdbc.queryForList(
            "SELECT q.id FROM quotations q " +
            "JOIN event_requests r ON r.id=q.event_request_id " +
            "JOIN users u ON u.id=r.user_id " +
            "WHERE u.email=? AND q.status<>'DRAFT' " +
            "ORDER BY q.id DESC",
            Long.class, auth.getName()
        );

        return ids.stream().map(this::quotation).toList();
    }

    @PatchMapping("/api/quotations/{id}/respond")
    @Transactional
    public Map<String, Object> respond(
            @PathVariable Long id,
            @RequestBody CustomerDecision input,
            Authentication auth) {

        if (input == null || input.status() == null) {
            throw error(HttpStatus.BAD_REQUEST, "Status required");
        }

        String choice = input.status()
            .trim().toUpperCase(Locale.ROOT);

        if (!Set.of("ACCEPTED", "REJECTED").contains(choice)) {
            throw error(HttpStatus.BAD_REQUEST, "Invalid decision");
        }

        Integer owned = jdbc.queryForObject(
            "SELECT COUNT(*) FROM quotations q " +
            "JOIN event_requests r ON r.id=q.event_request_id " +
            "JOIN users u ON u.id=r.user_id " +
            "WHERE q.id=? AND u.email=?",
            Integer.class, id, auth.getName()
        );

        if (owned == null || owned == 0) {
            throw error(HttpStatus.NOT_FOUND,
                "Quotation not found");
        }

        if (!"SENT".equals(status(id))) {
            throw error(HttpStatus.CONFLICT,
                "Quotation is not awaiting response");
        }

        String note = input.note() == null
            ? "" : input.note().trim();

        if (note.length() > 5000) {
            throw error(HttpStatus.BAD_REQUEST, "Note too long");
        }

        jdbc.update(
            "UPDATE quotations SET status=?,customer_note=?," +
            "responded_at=NOW(6) WHERE id=?",
            choice, note, id
        );

        return quotation(id);
    }
}
