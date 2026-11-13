package com.bluetrail.controller;

import com.bluetrail.entity.Booking;
import com.bluetrail.entity.Event;
import com.bluetrail.entity.User;
import com.bluetrail.repository.BookingRepository;

import jakarta.persistence.EntityManager;
import jakarta.persistence.LockModeType;
import jakarta.persistence.PersistenceContext;
import jakarta.transaction.Transactional;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import java.util.LinkedHashMap;
import java.time.LocalDateTime;

@RestController
public class BookingController {

    private final BookingRepository bookings;
    private final com.bluetrail.service.BookingMailService mail;

    @PersistenceContext
    private EntityManager em;

    public BookingController(BookingRepository bookings,com.bluetrail.service.BookingMailService mail) {
        this.bookings = bookings;
        this.mail = mail;
    }

    public record NewBooking(Long eventId, Integer quantity, String contactName, String contactPhone, String contactEmail, String bankId) {
        public NewBooking(Long eventId,Integer quantity,String name,String phone,String email){this(eventId,quantity,name,phone,email,null);}
    }

    private User currentUser(Authentication auth) {
        if (auth == null || !auth.isAuthenticated()
                || "anonymousUser".equals(auth.getName())) {
            throw new org.springframework.web.server.ResponseStatusException(
                HttpStatus.UNAUTHORIZED, "Login required");
        }

        return em.createQuery(
                "SELECT u FROM User u WHERE u.email = :email", User.class)
            .setParameter("email", auth.getName())
            .getResultStream()
            .findFirst()
            .orElseThrow(() ->
                new org.springframework.web.server.ResponseStatusException(
                    HttpStatus.UNAUTHORIZED, "User not found"));
    }

    private Map<String, Object> response(Booking b) {
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("id", b.getId());
        result.put("eventId", b.getEvent().getId());
        result.put("eventTitle", b.getEvent().getTitle());
        result.put("eventTitleEn", b.getEvent().getTitleEn());
        result.put("location", b.getEvent().getLocation());
        result.put("userId", b.getUser().getId());
        result.put("quantity", b.getQuantity());
        result.put("totalPrice", b.getTotalPrice());
        result.put("status", b.getStatus());
        result.put("bookingDate", b.getBookingDate());
        result.put("paymentDueAt", b.getPaymentDueAt());
        result.put("contactName", b.getContactName());
        result.put("contactPhone", b.getContactPhone());
        result.put("contactEmail", b.getContactEmail());
        result.put("bankId", b.getBankId());
        if(b.getBankId()!=null)result.put("paymentBank", com.bluetrail.service.CompanyBanks.require(b.getBankId()));
        return result;
    }

    @PostMapping("/api/bookings")
    @Transactional
    public ResponseEntity<?> create(
            @RequestBody NewBooking input,
            Authentication auth) {

        User user = currentUser(auth);

        if (input == null || input.eventId() == null
                || input.quantity() == null || input.quantity() <= 0) {
            return ResponseEntity.badRequest()
                .body(Map.of("error", "Invalid booking information"));
        }

        if (input.contactName() == null || input.contactName().isBlank()
                || input.contactName().length() > 100
                || input.contactPhone() == null || input.contactPhone().isBlank()
                || input.contactPhone().length() > 30
                || input.contactEmail() == null || !input.contactEmail().matches("^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$")
                || input.contactEmail().length() > 160) {
            return ResponseEntity.badRequest().body(Map.of("error", "Valid contact details are required"));
        }
        if (input.quantity() > 1000) {
            return ResponseEntity.badRequest()
                .body(Map.of("error", "Quantity exceeds limit"));
        }

        com.bluetrail.service.CompanyBanks.require(input.bankId());

        Event event = em.find(
            Event.class,
            input.eventId(),
            LockModeType.PESSIMISTIC_WRITE
        );

        if (event == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                .body(Map.of("error", "Event not found"));
        }

        if (!"ACTIVE".equalsIgnoreCase(event.getStatus())) {
            return ResponseEntity.badRequest()
                .body(Map.of("error", "Event is not active"));
        }

        if (event.getPrice() == null
                || event.getPrice().compareTo(BigDecimal.ZERO) < 0) {
            return ResponseEntity.badRequest()
                .body(Map.of("error", "Invalid event price"));
        }

        Integer available = event.getAvailableSeats();

        if (available == null || available < input.quantity()) {
            return ResponseEntity.badRequest()
                .body(Map.of("error", "Not enough available seats"));
        }

        Booking booking = new Booking();
        booking.setUser(user);
        booking.setEvent(event);
        booking.setQuantity(input.quantity());
        booking.setTotalPrice(
            event.getPrice().multiply(
                BigDecimal.valueOf(input.quantity())
            )
        );
        booking.setStatus("PENDING");
        booking.setPaymentDueAt(LocalDateTime.now().plusMinutes(30));
        booking.setContactName(input.contactName().trim());
        booking.setContactPhone(input.contactPhone().trim());
        booking.setContactEmail(input.contactEmail().trim());
        booking.setBankId(input.bankId());

        event.setAvailableSeats(available - input.quantity());
        em.flush();

        Booking saved = bookings.saveAndFlush(booking);
        mail.queue(saved,"สร้างการจองสำเร็จ กรุณาชำระภายในเวลาที่กำหนด");

        return ResponseEntity.status(HttpStatus.CREATED)
            .body(response(saved));
    }

    @GetMapping("/api/bookings/my")
    @Transactional
    public List<Map<String, Object>> myBookings(Authentication auth) {
        User user = currentUser(auth);

        return bookings.findByUserId(user.getId())
            .stream()
            .map(this::response)
            .toList();
    }

    @GetMapping("/api/admin/bookings")
    @Transactional
    public List<Map<String, Object>> adminBookings(Authentication auth) {

        if (auth == null || auth.getAuthorities().stream()
                .noneMatch(a -> "ROLE_ADMIN".equals(a.getAuthority()))) {
            throw new org.springframework.web.server.ResponseStatusException(
                HttpStatus.FORBIDDEN, "Admin only");
        }

        return bookings.findAll()
            .stream()
            .map(this::response)
            .toList();
    }
}
