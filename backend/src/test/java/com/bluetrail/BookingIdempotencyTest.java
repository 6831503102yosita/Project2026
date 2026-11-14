package com.bluetrail;

import com.bluetrail.controller.BookingController;
import com.bluetrail.entity.Booking;
import com.bluetrail.entity.Event;
import com.bluetrail.entity.User;
import com.bluetrail.repository.BookingRepository;
import com.bluetrail.service.BookingMailService;
import jakarta.persistence.EntityManager;
import jakarta.persistence.TypedQuery;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.core.Authentication;
import org.springframework.test.util.ReflectionTestUtils;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.HexFormat;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class BookingIdempotencyTest {
    private BookingController controller;
    private JdbcTemplate db;
    private EntityManager em;
    private Authentication auth;
    private User user;

    private final String key = "test-booking-key-0001";

    private final BookingController.NewBooking input =
        new BookingController.NewBooking(
            10L, 2, "Test Customer", "0800000000",
            "contact@example.com", null
        );

    @BeforeEach
    @SuppressWarnings("unchecked")
    void setup() {
        db = mock(JdbcTemplate.class);
        em = mock(EntityManager.class);
        auth = mock(Authentication.class);
        user = new User();
        user.setId(7L);
        user.setEmail("owner@example.com");

        controller = spy(new BookingController(
            mock(BookingRepository.class),
            mock(BookingMailService.class)
        ));

        ReflectionTestUtils.setField(controller, "em", em);
        ReflectionTestUtils.setField(controller, "bookingJdbc", db);

        when(auth.isAuthenticated()).thenReturn(true);
        when(auth.getName()).thenReturn("owner@example.com");

        TypedQuery<User> query = mock(TypedQuery.class);
        when(em.createQuery(anyString(), eq(User.class)))
            .thenReturn(query);
        when(query.setParameter(eq("email"), any()))
            .thenReturn(query);
        when(query.getResultStream())
            .thenAnswer(invocation -> java.util.stream.Stream.of(user));
    }

    private String hash() throws Exception {
        return HexFormat.of().formatHex(
            MessageDigest.getInstance("SHA-256")
                .digest(input.toString().getBytes(StandardCharsets.UTF_8))
        );
    }

    @Test
    void missingKeyDoesNotCreateBooking() {
        var result = controller.createOnce(input, auth, null);

        assertEquals(400, result.getStatusCode().value());
        verify(controller, never()).create(any(), any());
        verifyNoInteractions(db);
    }

    @Test
    void newKeyCreatesBookingAndStoresMapping() {
        when(db.queryForList(
            contains("FROM booking_idempotency"),
            eq(7L), eq(key)
        )).thenReturn(List.of());

        doReturn(ResponseEntity.status(201).body(Map.of("id", 81L)))
            .when(controller).create(input, auth);

        var result = controller.createOnce(input, auth, key);

        assertEquals(201, result.getStatusCode().value());

        var order = inOrder(db, controller);
        order.verify(db).queryForObject(
            contains("FROM users WHERE id=? FOR UPDATE"),
            eq(Long.class), eq(7L)
        );
        order.verify(controller).create(input, auth);
        order.verify(db).update(
            contains("INSERT INTO booking_idempotency"),
            eq(7L), eq(key), anyString(), eq(81L)
        );
    }

    @Test
    void sameKeyAndPayloadReturnsExistingBooking() throws Exception {
        when(db.queryForList(
            contains("FROM booking_idempotency"),
            eq(7L), eq(key)
        )).thenReturn(List.of(Map.of(
            "request_hash", hash(),
            "booking_id", 81L
        )));

        Event event = new Event();
        event.setId(10L);
        event.setTitle("Test event");

        Booking booking = new Booking();
        booking.setId(81L);
        booking.setUser(user);
        booking.setEvent(event);
        booking.setQuantity(2);

        when(em.find(
            Booking.class, 81L,
            jakarta.persistence.LockModeType.PESSIMISTIC_READ
        )).thenReturn(booking);

        var result = controller.createOnce(input, auth, key);

        assertEquals(200, result.getStatusCode().value());
        assertEquals(
            "true",
            result.getHeaders().getFirst("Idempotency-Replayed")
        );
        assertEquals(81L, ((Map<?, ?>) result.getBody()).get("id"));
        verify(controller, never()).create(any(), any());
        verify(db, never()).update(anyString(), any(Object[].class));
    }

    @Test
    void sameKeyWithDifferentPayloadReturnsConflict() {
        when(db.queryForList(
            contains("FROM booking_idempotency"),
            eq(7L), eq(key)
        )).thenReturn(List.of(Map.of(
            "request_hash", "different-payload-hash",
            "booking_id", 81L
        )));

        var result = controller.createOnce(input, auth, key);

        assertEquals(409, result.getStatusCode().value());
        verify(controller, never()).create(any(), any());
        verify(db, never()).update(anyString(), any(Object[].class));
    }
}
