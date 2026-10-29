package com.bluetrail.controller;

import com.bluetrail.entity.Booking;
import com.bluetrail.entity.Payment;
import com.bluetrail.entity.User;
import com.bluetrail.repository.PaymentRepository;

import jakarta.persistence.EntityManager;
import jakarta.persistence.LockModeType;
import jakarta.persistence.PersistenceContext;
import jakarta.transaction.Transactional;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.io.IOException;
import java.math.BigDecimal;
import java.nio.file.*;
import java.time.LocalDateTime;
import java.util.*;

@RestController
public class PaymentController {

    private final PaymentRepository payments;

    @PersistenceContext
    private EntityManager em;

    @Value("${bluetrail.upload-dir:${user.home}/BlueTrail-Uploads}")
    private String uploadDir;

    public PaymentController(PaymentRepository payments) {
        this.payments = payments;
    }

    public record Decision(String status, String reason) {}

    private ResponseStatusException fail(HttpStatus code, String message) {
        return new ResponseStatusException(code, message);
    }

    private User currentUser(Authentication auth) {
        if (auth == null || !auth.isAuthenticated()) {
            throw fail(HttpStatus.UNAUTHORIZED, "Login required");
        }

        return em.createQuery(
            "SELECT u FROM User u WHERE u.email = :email", User.class)
            .setParameter("email", auth.getName())
            .getResultStream()
            .findFirst()
            .orElseThrow(() -> fail(
                HttpStatus.UNAUTHORIZED, "User not found"));
    }

    private boolean isAdmin(Authentication auth) {
        return auth != null && auth.getAuthorities().stream()
            .anyMatch(a -> "ROLE_ADMIN".equals(a.getAuthority()));
    }

    private Map<String, Object> toResponse(Payment p) {
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("id", p.getId());
        result.put("bookingId", p.getBooking().getId());
        result.put("customerId", p.getBooking().getUser().getId());
        result.put("amount", p.getAmount());
        result.put("paymentMethod", p.getPaymentMethod());
        result.put("status", p.getStatus());
        result.put("hasSlip", p.getSlipUrl() != null);
        result.put("createdAt", p.getCreatedAt());
        result.put("verifiedAt", p.getVerifiedAt());
        result.put("rejectionReason", p.getRejectionReason());
        return result;
    }

    private String detectExtension(byte[] data) {
        if (data.length >= 3
                && (data[0] & 255) == 0xff
                && (data[1] & 255) == 0xd8
                && (data[2] & 255) == 0xff) {
            return ".jpg";
        }

        if (data.length >= 8
                && (data[0] & 255) == 0x89
                && data[1] == 'P'
                && data[2] == 'N'
                && data[3] == 'G'
                && (data[4] & 255) == 13
                && (data[5] & 255) == 10
                && (data[6] & 255) == 26
                && (data[7] & 255) == 10) {
            return ".png";
        }

        if (data.length >= 12
                && data[0] == 'R'
                && data[1] == 'I'
                && data[2] == 'F'
                && data[3] == 'F'
                && data[8] == 'W'
                && data[9] == 'E'
                && data[10] == 'B'
                && data[11] == 'P') {
            return ".webp";
        }

        throw fail(HttpStatus.BAD_REQUEST,
            "Only JPEG, PNG and WebP images are allowed");
    }

    @PostMapping(
        value = "/api/payments/booking/{bookingId}/slip",
        consumes = MediaType.MULTIPART_FORM_DATA_VALUE
    )
    @Transactional
    public ResponseEntity<?> upload(
            @PathVariable Long bookingId,
            @RequestParam("file") MultipartFile file,
            Authentication auth) throws IOException {

        User user = currentUser(auth);

        if (!"CUSTOMER".equals(user.getRole())) {
            throw fail(HttpStatus.FORBIDDEN, "Customer only");
        }

        Booking booking = em.find(
            Booking.class, bookingId, LockModeType.PESSIMISTIC_WRITE);

        if (booking == null) {
            throw fail(HttpStatus.NOT_FOUND, "Booking not found");
        }

        if (!booking.getUser().getId().equals(user.getId())) {
            throw fail(HttpStatus.FORBIDDEN, "Not your booking");
        }

        if (!"PENDING".equalsIgnoreCase(booking.getStatus())) {
            throw fail(HttpStatus.CONFLICT, "Booking is not pending");
        }

        for (Payment existing : payments.findByBookingId(bookingId)) {
            if ("PENDING".equals(existing.getStatus())
                    || "APPROVED".equals(existing.getStatus())) {
                throw fail(HttpStatus.CONFLICT,
                    "Payment is already submitted or approved");
            }
        }

        if (file.isEmpty() || file.getSize() > 5_000_000) {
            throw fail(HttpStatus.BAD_REQUEST,
                "Slip must be between 1 byte and 5 MB");
        }

        byte[] data = file.getBytes();

        if (data.length == 0 || data.length > 5_000_000) {
            throw fail(HttpStatus.BAD_REQUEST, "Invalid file size");
        }

        String ext = detectExtension(data);
        Path dir = Paths.get(uploadDir).toAbsolutePath().normalize();

        Files.createDirectories(dir);

        String name = UUID.randomUUID() + ext;
        Path destination = dir.resolve(name);

        Files.write(destination, data, StandardOpenOption.CREATE_NEW);

        try {
            Payment payment = new Payment();
            payment.setBooking(booking);
            payment.setAmount(booking.getTotalPrice());
            payment.setPaymentMethod("BANK_TRANSFER");
            payment.setStatus("PENDING");
            payment.setSlipUrl(name);

            Payment saved = payments.saveAndFlush(payment);

            return ResponseEntity.status(HttpStatus.CREATED)
                .body(toResponse(saved));
        } catch (RuntimeException ex) {
            Files.deleteIfExists(destination);
            throw ex;
        }
    }

    @GetMapping("/api/payments/booking/{bookingId}")
    @Transactional
    public List<Map<String, Object>> myPayments(
            @PathVariable Long bookingId,
            Authentication auth) {

        User user = currentUser(auth);
        Booking booking = em.find(Booking.class, bookingId);

        if (booking == null) {
            throw fail(HttpStatus.NOT_FOUND, "Booking not found");
        }

        if (!isAdmin(auth)
                && !booking.getUser().getId().equals(user.getId())) {
            throw fail(HttpStatus.FORBIDDEN, "Access denied");
        }

        return payments.findByBookingId(bookingId)
            .stream().map(this::toResponse).toList();
    }

    @GetMapping("/api/payments/{paymentId}/slip")
    @Transactional
    public ResponseEntity<byte[]> viewSlip(
            @PathVariable Long paymentId,
            Authentication auth) throws IOException {

        User user = currentUser(auth);

        Payment payment = payments.findById(paymentId)
            .orElseThrow(() -> fail(
                HttpStatus.NOT_FOUND, "Payment not found"));

        if (!isAdmin(auth)
                && !payment.getBooking().getUser().getId()
                    .equals(user.getId())) {
            throw fail(HttpStatus.FORBIDDEN, "Access denied");
        }

        if (payment.getSlipUrl() == null) {
            throw fail(HttpStatus.NOT_FOUND, "Slip not found");
        }

        Path dir = Paths.get(uploadDir).toAbsolutePath().normalize();
        Path path = dir.resolve(payment.getSlipUrl()).normalize();

        if (!path.getParent().equals(dir) || !Files.isRegularFile(path)) {
            throw fail(HttpStatus.NOT_FOUND, "Slip not found");
        }

        String filename = path.getFileName().toString();
        MediaType type = filename.endsWith(".png")
            ? MediaType.IMAGE_PNG
            : filename.endsWith(".webp")
                ? MediaType.parseMediaType("image/webp")
                : MediaType.IMAGE_JPEG;

        return ResponseEntity.ok()
            .contentType(type)
            .header(HttpHeaders.CACHE_CONTROL, "no-store")
            .header("X-Content-Type-Options", "nosniff")
            .body(Files.readAllBytes(path));
    }

    @GetMapping("/api/admin/payments")
    @Transactional
    public List<Map<String, Object>> adminPayments(
            Authentication auth) {

        if (!isAdmin(auth)) {
            throw fail(HttpStatus.FORBIDDEN, "Admin only");
        }

        return payments.findAll()
            .stream().map(this::toResponse).toList();
    }

    @PatchMapping("/api/admin/payments/{id}/status")
    @Transactional
    public Map<String, Object> decide(
            @PathVariable Long id,
            @RequestBody Decision input,
            Authentication auth) {

        if (!isAdmin(auth)) {
            throw fail(HttpStatus.FORBIDDEN, "Admin only");
        }

        if (input == null || input.status() == null) {
            throw fail(HttpStatus.BAD_REQUEST, "Status is required");
        }

        String next = input.status().trim().toUpperCase(Locale.ROOT);

        if (!Set.of("APPROVED", "REJECTED").contains(next)) {
            throw fail(HttpStatus.BAD_REQUEST, "Invalid status");
        }

        Payment payment = em.find(
            Payment.class, id, LockModeType.PESSIMISTIC_WRITE);

        if (payment == null) {
            throw fail(HttpStatus.NOT_FOUND, "Payment not found");
        }

        if (!"PENDING".equals(payment.getStatus())) {
            throw fail(HttpStatus.CONFLICT, "Payment already reviewed");
        }

        Booking booking = em.find(
            Booking.class,
            payment.getBooking().getId(),
            LockModeType.PESSIMISTIC_WRITE
        );

        if (!"PENDING".equals(booking.getStatus())) {
            throw fail(HttpStatus.CONFLICT, "Booking is not pending");
        }

        if ("APPROVED".equals(next)) {
            if (payment.getAmount().compareTo(booking.getTotalPrice()) != 0) {
                throw fail(HttpStatus.CONFLICT, "Payment amount mismatch");
            }

            booking.setStatus("CONFIRMED");
        }

        if ("REJECTED".equals(next)) {
            String reason = input.reason() == null
                ? "" : input.reason().trim();

            if (reason.isEmpty() || reason.length() > 500) {
                throw fail(HttpStatus.BAD_REQUEST,
                    "Rejection reason is required (max 500 characters)");
            }

            payment.setRejectionReason(reason);
        } else {
            payment.setRejectionReason(null);
        }

        payment.setStatus(next);
        payment.setVerifiedAt(LocalDateTime.now());

        return toResponse(payments.saveAndFlush(payment));
    }
}
