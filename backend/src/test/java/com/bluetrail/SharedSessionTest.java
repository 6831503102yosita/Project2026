package com.bluetrail;

import com.bluetrail.config.SharedSessionConfig;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DriverManagerDataSource;
import org.springframework.jdbc.datasource.DataSourceTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.session.jdbc.JdbcIndexedSessionRepository;
import org.springframework.security.core.context.SecurityContextImpl;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.web.csrf.DefaultCsrfToken;
import java.util.List;
import static org.junit.jupiter.api.Assertions.*;

class SharedSessionTest {
    @Test void loginAndCsrfSurviveAnotherInstanceAndRepositoryRestart() {
        var ds = new DriverManagerDataSource("jdbc:h2:mem:shared;MODE=MySQL;DB_CLOSE_DELAY=-1", "sa", "");
        var jdbc = new JdbcTemplate(ds);
        SharedSessionConfig.initializeSchema(jdbc);
        SharedSessionConfig.initializeSchema(jdbc); // Repeat startup must not drop sessions.
        var tx = new TransactionTemplate(new DataSourceTransactionManager(ds));
        var first = new JdbcIndexedSessionRepository(jdbc, tx);
        first.setTableName("BT_HTTP_SESSION");
        org.springframework.session.SessionRepository<org.springframework.session.Session> firstApi = (org.springframework.session.SessionRepository)first;
        var session = firstApi.createSession();
        var auth = UsernamePasswordAuthenticationToken.authenticated("customer@example.com", null,
            List.of(new SimpleGrantedAuthority("ROLE_CUSTOMER")));
        session.setAttribute("SPRING_SECURITY_CONTEXT", new SecurityContextImpl(auth));
        session.setAttribute("CSRF", new DefaultCsrfToken("X-CSRF-TOKEN", "_csrf", "original-token"));
        firstApi.save(session);
        var second = new JdbcIndexedSessionRepository(jdbc, tx);
        second.setTableName("BT_HTTP_SESSION");
        org.springframework.session.SessionRepository<org.springframework.session.Session> secondApi = (org.springframework.session.SessionRepository)second;
        var restored = secondApi.findById(session.getId());
        assertNotNull(restored);
        SecurityContextImpl context = restored.getAttribute("SPRING_SECURITY_CONTEXT");
        assertTrue(context.getAuthentication().isAuthenticated());
        assertEquals("customer@example.com", context.getAuthentication().getName());
        assertEquals("ROLE_CUSTOMER", context.getAuthentication().getAuthorities().iterator().next().getAuthority());
        DefaultCsrfToken csrf = restored.getAttribute("CSRF");
        assertEquals("original-token", csrf.getToken());
        SharedSessionConfig.initializeSchema(jdbc);
        assertNotNull(second.findById(session.getId()));
        second.deleteById(session.getId());
        assertNull(first.findById(session.getId()));
    }
}
