package com.bluetrail;

import com.bluetrail.controller.BookingDetailController;
import com.bluetrail.entity.Booking;
import com.bluetrail.entity.User;
import com.bluetrail.service.BookingMailService;

import jakarta.persistence.EntityManager;
import jakarta.persistence.LockModeType;

import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.List;

import static org.mockito.Mockito.*;

class BookingResendTest {

    @Test
    void resendRetriesExistingPendingMessageWithoutCreatingAnother() {
        var mail = mock(BookingMailService.class);
        var db = mock(JdbcTemplate.class);
        var em = mock(EntityManager.class);
        var auth = mock(Authentication.class);

        var user = new User();
        user.setEmail("test@example.com");

        var booking = new Booking();
        booking.setId(8L);
        booking.setUser(user);

        when(auth.getName()).thenReturn("test@example.com");
        when(em.find(
            Booking.class, 8L, LockModeType.PESSIMISTIC_WRITE
        )).thenReturn(booking);

        when(db.queryForObject(
            contains("created_at>"), eq(Integer.class), eq(8L)
        )).thenReturn(0);

        when(db.queryForObject(
            contains("status='PENDING'"), eq(Integer.class), eq(8L)
        )).thenReturn(1);

        var controller = new BookingDetailController(mail, db);
        ReflectionTestUtils.setField(controller, "em", em);

        controller.resend(8L, auth);

        verify(mail).deliverBooking(8L);
        verify(mail, never()).queue(any(), anyString());
        verify(mail, never()).queueResend(any(), anyString());
    }

    @Test
    void existingConfirmationDoesNotCreateAnotherEmail() {
        checkPaymentConfirmation(1, false);
    }

    @Test
    void missingConfirmationCreatesAutomaticStyleEmail() {
        checkPaymentConfirmation(0, true);
    }

    private void checkPaymentConfirmation(
            int existingCount, boolean shouldQueue) {

        var mail = mock(BookingMailService.class);
        var db = mock(JdbcTemplate.class);
        var em = mock(EntityManager.class);

        Authentication auth =
            new UsernamePasswordAuthenticationToken(
                "admin@example.com",
                "unused",
                List.of(new SimpleGrantedAuthority("ROLE_ADMIN"))
            );

        var user = new User();
        user.setEmail("customer@example.com");

        var booking = new Booking();
        booking.setId(8L);
        booking.setUser(user);
        booking.setContactEmail("contact@example.com");
        booking.setStatus("CONFIRMED");

        when(em.find(
            Booking.class, 8L, LockModeType.PESSIMISTIC_WRITE
        )).thenReturn(booking);

        when(mail.configured()).thenReturn(true);

        when(db.queryForObject(
            contains("FROM payments"),
            eq(Integer.class),
            eq(8L)
        )).thenReturn(1);

        String update = "ผลตรวจสอบการชำระเงิน: APPROVED\n";

        when(db.queryForObject(
            contains("LOCATE(?, message)>0"),
            eq(Integer.class),
            eq(8L),
            eq(update)
        )).thenReturn(existingCount);

        var controller = new BookingDetailController(mail, db);
        ReflectionTestUtils.setField(controller, "em", em);

        controller.paymentConfirmation(8L, auth);

        if (shouldQueue) {
            verify(mail).queue(booking, update);
        } else {
            verify(mail, never()).queue(any(), anyString());
        }

        verify(mail, never()).queueResend(any(), anyString());
        verify(mail).state(8L);
    }
}