package com.bluetrail;

import com.bluetrail.entity.Booking;
import com.bluetrail.entity.Event;
import com.bluetrail.entity.User;
import com.bluetrail.service.BookingMailService;

import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.jdbc.core.JdbcTemplate;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class BookingMailQueueTest {

    private Booking booking() {
        var booking = new Booking();
        booking.setId(8L);

        var user = new User();
        user.setEmail("account@example.com");
        booking.setUser(user);
        booking.setContactEmail("test@example.com");

        var event = new Event();
        event.setTitle("ทดสอบ");
        event.setLocation("เชียงราย");
        event.setEventDate(
            LocalDateTime.of(2027, 1, 31, 18, 19, 27, 281147000)
        );

        booking.setEvent(event);
        booking.setTotalPrice(new BigDecimal("650.00"));

        return booking;
    }

    @Test
    void duplicateAutomaticNotificationDoesNotInsertOrPublish() {
        var db = mock(JdbcTemplate.class);
        var events = mock(ApplicationEventPublisher.class);
        var mail = new BookingMailService(db, events);

        when(db.queryForList(
            contains("message=?"),
            eq(8L),
            anyString(),
            eq(false)
        )).thenReturn(List.of(Map.of("id", 1L)));

        mail.queue(booking(), "Booking created");

        verify(db).queryForObject(
            contains("FOR UPDATE"),
            eq(Long.class),
            eq(8L)
        );

        verify(db, never()).update(anyString(), any(Object[].class));
        verifyNoInteractions(events);
    }

    @Test
    void mailUsesContactEmailReadableDateAndTranslatedState() {
        var db = mock(JdbcTemplate.class);
        var events = mock(ApplicationEventPublisher.class);
        var mail = new BookingMailService(db, events);

        mail.queueResend(booking(), "Requested resend");

        var body = ArgumentCaptor.forClass(String.class);

        verify(db).update(
            contains("INSERT INTO"),
            eq(8L),
            eq("test@example.com"),
            contains("Pending payment"),
            body.capture()
        );

        assertTrue(body.getValue().contains("31/01/2027 18:19"));
        assertTrue(body.getValue().contains("รอชำระเงิน"));
        assertFalse(body.getValue().contains("281147"));

        verify(db).queryForList(
            contains("FOR UPDATE"),
            eq(8L),
            anyString(),
            eq(true)
        );

        verify(events).publishEvent(
            any(BookingMailService.Queued.class)
        );
    }

    @Test
    void invalidContactEmailDoesNotQueueOrThrow() {
        var db = mock(JdbcTemplate.class);
        var events = mock(ApplicationEventPublisher.class);
        var mail = new BookingMailService(db, events);

        var booking = booking();
        booking.setContactEmail("invalid-email");

        assertDoesNotThrow(() ->
            mail.queue(booking, "Booking created")
        );

        verify(db, never()).update(anyString(), any(Object[].class));
        verifyNoInteractions(events);
    }
}