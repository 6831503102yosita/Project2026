package com.bluetrail;

import com.bluetrail.controller.*;
import com.bluetrail.entity.*;
import com.bluetrail.repository.*;
import com.bluetrail.service.*;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.context.ApplicationEventPublisher;
import java.time.*;
import java.math.BigDecimal;
import java.util.*;

class ExperienceChangesTest {

    private final String future = LocalDate.now(
        ZoneId.of("Asia/Bangkok")
    ).plusDays(10).toString();

    private UsernamePasswordAuthenticationToken auth() {
        return new UsernamePasswordAuthenticationToken(
            "owner@example.com",
            "",
            List.of(new SimpleGrantedAuthority("ROLE_CUSTOMER"))
        );
    }

    private EventRequestController.NewRequest request(String end) {
        return new EventRequestController.NewRequest(
            "Trip",
            "group",
            "Test",
            "Chiang Rai",
            future,
            end,
            20,
            BigDecimal.valueOf(50000),
            "{}"
        );
    }

    @Test
    void rejectsBudgetOutsideDatabaseRangeOrFraction() {
        var repo = mock(EventRequestRepository.class);
        var controller = new EventRequestController(
            repo,
            mock(UserRepository.class)
        );

        for (String amount : List.of(
            "-1",
            "10000000000000",
            "1.001"
        )) {
            var input = new EventRequestController.NewRequest(
                "Trip",
                "group",
                "Test",
                "Chiang Rai",
                future,
                future,
                20,
                new BigDecimal(amount),
                "{}"
            );

            assertEquals(
                400,
                controller.create(input, auth())
                    .getStatusCode().value()
            );
        }

        verifyNoInteractions(repo);
    }

    @Test
    void acceptsBudgetAtDatabaseMaximum() {
        var repo = mock(EventRequestRepository.class);
        var users = mock(UserRepository.class);

        User user = new User();
        user.setEmail("owner@example.com");

        when(users.findByEmail("owner@example.com"))
            .thenReturn(Optional.of(user));

        when(repo.save(any(EventRequest.class)))
            .thenAnswer(invocation -> invocation.getArgument(0));

        var input = new EventRequestController.NewRequest(
            "Trip",
            "group",
            "Test",
            "Chiang Rai",
            future,
            future,
            20,
            new BigDecimal("9999999999999.99"),
            "{}"
        );

        assertEquals(
            201,
            new EventRequestController(repo, users)
                .create(input, auth())
                .getStatusCode().value()
        );

        verify(repo).save(
            argThat(row -> row.getBudget().equals(input.budget()))
        );
    }

    @Test
    void rejectsEndDateBeforeStart() {
        var repo = mock(EventRequestRepository.class);
        var controller = new EventRequestController(
            repo,
            mock(UserRepository.class)
        );

        String earlier = LocalDate.parse(future)
            .minusDays(1).toString();

        assertEquals(
            400,
            controller.create(request(earlier), auth())
                .getStatusCode().value()
        );

        verifyNoInteractions(repo);
    }

    @Test
    void legacyRequestDefaultsToOneDay() {
        var repo = mock(EventRequestRepository.class);
        var users = mock(UserRepository.class);

        User user = new User();
        user.setEmail("owner@example.com");

        when(users.findByEmail("owner@example.com"))
            .thenReturn(Optional.of(user));

        when(repo.save(any(EventRequest.class)))
            .thenAnswer(invocation -> invocation.getArgument(0));

        var response = new EventRequestController(repo, users)
            .create(request(null), auth());

        assertEquals(201, response.getStatusCode().value());

        var out = (Map<?, ?>) response.getBody();

        assertNotNull(out);
        assertEquals(
            LocalDate.parse(future),
            out.get("endDate")
        );
    }

    @Test
    void savesMultiDayEndDate() {
        var repo = mock(EventRequestRepository.class);
        var users = mock(UserRepository.class);

        User user = new User();
        user.setEmail("owner@example.com");

        when(users.findByEmail("owner@example.com"))
            .thenReturn(Optional.of(user));

        when(repo.save(any(EventRequest.class)))
            .thenAnswer(invocation -> invocation.getArgument(0));

        var finish = LocalDate.parse(future).plusDays(2);

        var response = new EventRequestController(repo, users)
            .create(request(finish.toString()), auth());

        var out = (Map<?, ?>) response.getBody();

        assertNotNull(out);
        assertEquals(finish, out.get("endDate"));
    }

    @Test
    void reportsRejectInvalidPercentageWithoutWriting() {
        JdbcTemplate db = mock(JdbcTemplate.class);
        var controller = new WorkProgressController(db);

        assertThrows(
            ResponseStatusException.class,
            () -> controller.report(
                1,
                new WorkProgressController.Report(101, "Done"),
                auth()
            )
        );

        verifyNoInteractions(db);
    }

    @Test
    void reportsRequireOwnedAssignment() {
        JdbcTemplate db = mock(JdbcTemplate.class);
        var controller = new WorkProgressController(db);

        assertThrows(
            ResponseStatusException.class,
            () -> controller.report(
                1,
                new WorkProgressController.Report(
                    50,
                    "In progress"
                ),
                auth()
            )
        );

        verify(db, never()).update(
            anyString(),
            any(Object[].class)
        );
    }

    @Test
    void creatingUserDoesNotAcceptUnknownRole() {
        var users = mock(UserRepository.class);

        var controller = new ExperienceController(
            mock(JdbcTemplate.class),
            users,
            mock(PasswordEncoder.class)
        );

        assertThrows(
            ResponseStatusException.class,
            () -> controller.createUser(
                new ExperienceController.NewUser(
                    "Test",
                    "test@example.com",
                    "",
                    "password123",
                    "SUPERUSER"
                )
            )
        );

        verifyNoInteractions(users);
    }

    @Test
    void bcryptLengthLimitUsesBytes() {
        var users = mock(UserRepository.class);

        var controller = new ExperienceController(
            mock(JdbcTemplate.class),
            users,
            mock(PasswordEncoder.class)
        );

        assertThrows(
            ResponseStatusException.class,
            () -> controller.createUser(
                new ExperienceController.NewUser(
                    "Test",
                    "test@example.com",
                    "",
                    "ก".repeat(30),
                    "CUSTOMER"
                )
            )
        );

        verifyNoInteractions(users);
    }

    @Test
    void mailIsOffUntilConfiguredAndQueuesToContactEmail() {
        JdbcTemplate db = mock(JdbcTemplate.class);
        var events = mock(ApplicationEventPublisher.class);
        var service = new BookingMailService(db, events);

        ReflectionTestUtils.setField(service, "enabled", false);
        ReflectionTestUtils.setField(service, "host", "");
        ReflectionTestUtils.setField(service, "from", "");

        assertFalse(service.configured());

        User user = new User();
        user.setEmail("owner@example.com");

        Event event = new Event();
        event.setTitle("Test event");

        Booking booking = new Booking();
        booking.setId(7L);
        booking.setUser(user);
        booking.setEvent(event);
        booking.setQuantity(2);
        booking.setTotalPrice(new BigDecimal("50000.00"));
        booking.setStatus("PENDING");
        booking.setContactEmail("different@example.com");

        service.queue(booking, "Booked");

        verify(db).update(
            contains("INSERT INTO booking_email_outbox"),
            eq(7L),
            eq("different@example.com"),
            anyString(),
            contains("50,000")
        );

        verify(events).publishEvent(
            any(BookingMailService.Queued.class)
        );
    }
}