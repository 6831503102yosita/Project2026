package com.bluetrail;

import com.bluetrail.controller.AdminEventController;
import com.bluetrail.entity.Event;
import com.bluetrail.repository.EventRepository;
import jakarta.persistence.EntityManager;
import jakarta.persistence.LockModeType;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.core.Authentication;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.time.LocalDateTime;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class EventEditTokenTest {
    private Event event;
    private EventRepository repository;
    private JdbcTemplate db;
    private AdminEventController controller;
    private Authentication auth;

    @BeforeEach
    void setup() {
        event = new Event();
        event.setId(10L);
        event.setTitle("Original title");
        event.setCategory("tour");
        event.setLocation("Chiang Rai");
        event.setEventDate(LocalDateTime.of(2027, 1, 1, 9, 0));
        event.setPrice(new BigDecimal("100.00"));
        event.setTotalSeats(10);
        event.setAvailableSeats(8);
        event.setStatus("ACTIVE");

        repository = mock(EventRepository.class);
        db = mock(JdbcTemplate.class);
        var em = mock(EntityManager.class);
        auth = mock(Authentication.class);
        when(auth.getName()).thenReturn("admin@example.com");

        controller = new AdminEventController(repository);
        ReflectionTestUtils.setField(controller, "em", em);
        ReflectionTestUtils.setField(controller, "jdbc", db);

        when(em.find(Event.class, 10L, LockModeType.PESSIMISTIC_WRITE))
            .thenReturn(event);
        when(repository.saveAndFlush(any(Event.class)))
            .thenAnswer(invocation -> invocation.getArgument(0));
    }

    private AdminEventController.EventInput input() {
        return new AdminEventController.EventInput(
            "Updated title", "tour", "", "Chiang Rai",
            LocalDateTime.of(2027, 1, 1, 9, 0),
            new BigDecimal("100.00"), 10, "", ""
        );
    }

    @Test
    void staleFormCannotOverwriteNewerData() {
        String oldToken = event.getEditToken();
        event.setTitle("Saved by another administrator");

        var error = assertThrows(
            ResponseStatusException.class,
            () -> controller.update(10L, input(), auth, oldToken)
        );

        assertEquals(409, error.getStatusCode().value());
        assertEquals(
            "Saved by another administrator", event.getTitle()
        );
        verify(repository, never()).saveAndFlush(any());
        verifyNoInteractions(db);
    }

    @Test
    void missingTokenCannotUpdate() {
        var error = assertThrows(
            ResponseStatusException.class,
            () -> controller.update(10L, input(), auth, null)
        );

        assertEquals(409, error.getStatusCode().value());
        verify(repository, never()).saveAndFlush(any());
        verifyNoInteractions(db);
    }

    @Test
    void currentTokenUpdatesAndPreservesAllocatedSeats() {
        String token = event.getEditToken();

        Event saved = controller.update(
            10L, input(), auth, token
        );

        assertEquals("Updated title", saved.getTitle());
        assertEquals(10, saved.getTotalSeats());
        assertEquals(8, saved.getAvailableSeats());
        assertNotEquals(token, saved.getEditToken());
        verify(repository).saveAndFlush(event);
    }

    @Test
    void bookingSeatChangesDoNotInvalidateEditToken() {
        String token = event.getEditToken();
        event.setAvailableSeats(7);

        assertEquals(token, event.getEditToken());

        Event saved = controller.update(
            10L, input(), auth, token
        );

        assertEquals(7, saved.getAvailableSeats());
    }
}
