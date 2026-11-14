
package com.bluetrail;

import com.bluetrail.controller.OrganizerAssignmentController;
import com.bluetrail.repository.UserRepository;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class OrganizerAssignmentTest {

    private OrganizerAssignmentController controller;
    private JdbcTemplate jdbc;
    private Authentication auth;

    @BeforeEach
    void setup() {
        jdbc = mock(JdbcTemplate.class);
        auth = mock(Authentication.class);

        controller = new OrganizerAssignmentController(
            jdbc,
            mock(UserRepository.class)
        );

        when(auth.isAuthenticated()).thenReturn(true);

        GrantedAuthority adminRole = () -> "ROLE_ADMIN";

        doReturn(List.of(adminRole))
            .when(auth).getAuthorities();
    }

    @Test
    void assignmentWithoutReportsCanBeDeleted() {
        when(jdbc.queryForList(
            contains("FOR UPDATE"),
            eq(10L)
        )).thenReturn(List.of(Map.of("id", 10L)));

        when(jdbc.queryForObject(
            contains("organizer_work_reports"),
            eq(Long.class),
            eq(10L)
        )).thenReturn(0L);

        when(jdbc.update(
            contains("DELETE FROM organizer_assignments"),
            eq(10L)
        )).thenReturn(1);

        Map<String, Object> result =
            controller.cancelAssignment(10L, auth);

        assertEquals(
            "Assignment cancelled",
            result.get("message")
        );

        verify(jdbc).queryForList(
            contains("FOR UPDATE"),
            eq(10L)
        );

        verify(jdbc).queryForObject(
            contains("organizer_work_reports"),
            eq(Long.class),
            eq(10L)
        );

        verify(jdbc).update(
            contains("DELETE FROM organizer_assignments"),
            eq(10L)
        );
    }

    @Test
    void assignmentWithReportsCannotBeDeleted() {
        when(jdbc.queryForList(
            contains("FOR UPDATE"),
            eq(10L)
        )).thenReturn(List.of(Map.of("id", 10L)));

        when(jdbc.queryForObject(
            contains("organizer_work_reports"),
            eq(Long.class),
            eq(10L)
        )).thenReturn(2L);

        ResponseStatusException error = assertThrows(
            ResponseStatusException.class,
            () -> controller.cancelAssignment(10L, auth)
        );

        assertEquals(
            409,
            error.getStatusCode().value()
        );

        verify(jdbc, never()).update(
            contains("DELETE FROM organizer_assignments"),
            eq(10L)
        );
    }

    @Test
    void nonexistentAssignmentReturnsNotFound() {
        when(jdbc.queryForList(
            contains("FOR UPDATE"),
            eq(999L)
        )).thenReturn(List.of());

        ResponseStatusException error = assertThrows(
            ResponseStatusException.class,
            () -> controller.cancelAssignment(999L, auth)
        );

        assertEquals(
            404,
            error.getStatusCode().value()
        );

        verify(jdbc, never()).update(
            contains("DELETE FROM organizer_assignments"),
            eq(999L)
        );
    }

    @Test
    void nonAdminCannotDeleteAssignment() {
        GrantedAuthority userRole = () -> "ROLE_USER";

        doReturn(List.of(userRole))
            .when(auth).getAuthorities();

        ResponseStatusException error = assertThrows(
            ResponseStatusException.class,
            () -> controller.cancelAssignment(10L, auth)
        );

        assertEquals(
            403,
            error.getStatusCode().value()
        );

        verify(jdbc, never()).update(
            contains("DELETE FROM organizer_assignments"),
            eq(10L)
        );

        verify(jdbc, never()).queryForList(
            contains("FOR UPDATE"),
            eq(10L)
        );
    }
}
