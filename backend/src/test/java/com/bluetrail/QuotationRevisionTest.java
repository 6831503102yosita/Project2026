package com.bluetrail;

import com.bluetrail.controller.EventRequestController;
import com.bluetrail.controller.QuotationController;
import com.bluetrail.controller.QuotationExtrasController;
import com.bluetrail.entity.User;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.*;
import java.util.concurrent.*;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest(properties = {
    "spring.datasource.url=jdbc:mysql://127.0.0.1:3306/bluetrail_db?allowPublicKeyRetrieval=true&useSSL=false",
    "spring.datasource.username=bluetrail",
    "spring.datasource.password=${BT_LOCAL_DB_PASSWORD}",
    "BLUETRAIL_MAIL_ENABLED=false"
})
class QuotationRevisionTest {
    @Autowired QuotationExtrasController extras;
    @Autowired QuotationController quotations;
    @Autowired EventRequestController requests;
    @Autowired JdbcTemplate db;
    @Autowired PlatformTransactionManager manager;
    @PersistenceContext EntityManager em;

    private Long userId;
    private Long requestId;
    private Long quotationId;
    private UsernamePasswordAuthenticationToken admin;
    private UsernamePasswordAuthenticationToken customer;

    @BeforeEach
    void prepare() {
        String email = "revision-test-" + UUID.randomUUID() + "@example.com";

        new TransactionTemplate(manager).executeWithoutResult(status -> {
            User user = new User();
            user.setName("TEST - Revision");
            user.setEmail(email);
            user.setPassword("TEST_ACCOUNT_NOT_FOR_LOGIN");
            user.setRole("CUSTOMER");
            em.persist(user);
            em.flush();
            userId = user.getId();
        });

        customer = new UsernamePasswordAuthenticationToken(
            email, "", List.of(new SimpleGrantedAuthority("ROLE_CUSTOMER"))
        );
        admin = new UsernamePasswordAuthenticationToken(
            email, "", List.of(new SimpleGrantedAuthority("ROLE_ADMIN"))
        );

        String date = LocalDate.now().plusDays(30).toString();

        var response = requests.create(
            new EventRequestController.NewRequest(
                "TEST - Revision request", "group", "Test",
                "Chiang Rai", date, date, 20,
                new BigDecimal("1000.00"), "{}"
            ),
            customer
        );

        assertEquals(201, response.getStatusCode().value());
        requestId = ((Number) ((Map<?, ?>) response.getBody()).get("id"))
            .longValue();

        var quotation = quotations.create(
            new QuotationController.NewQuotation(
                requestId,
                List.of(new QuotationController.ItemInput(
                    "TEST item", BigDecimal.ONE, new BigDecimal("100")
                )),
                BigDecimal.ZERO, BigDecimal.ZERO, "TEST note", null
            ),
            admin
        );

        quotationId = ((Number) quotation.get("id")).longValue();
    }

    private List<Map<String, Object>> together(
            Callable<Map<String, Object>> first,
            Callable<Map<String, Object>> second) throws Exception {

        ExecutorService pool = Executors.newFixedThreadPool(2);
        CountDownLatch ready = new CountDownLatch(2);
        CountDownLatch start = new CountDownLatch(1);

        try {
            Callable<Map<String, Object>> a = () -> {
                ready.countDown();
                if (!start.await(10, TimeUnit.SECONDS))
                    throw new IllegalStateException("Start timeout");
                return first.call();
            };
            Callable<Map<String, Object>> b = () -> {
                ready.countDown();
                if (!start.await(10, TimeUnit.SECONDS))
                    throw new IllegalStateException("Start timeout");
                return second.call();
            };

            var one = pool.submit(a);
            var two = pool.submit(b);
            assertTrue(ready.await(10, TimeUnit.SECONDS));
            start.countDown();

            return List.of(
                one.get(30, TimeUnit.SECONDS),
                two.get(30, TimeUnit.SECONDS)
            );
        } finally {
            start.countDown();
            pool.shutdownNow();
            assertTrue(pool.awaitTermination(35, TimeUnit.SECONDS));
        }
    }

    private List<Integer> revisionNumbers() {
        return db.queryForList(
            "SELECT revision FROM quotation_revisions " +
            "WHERE quotation_id=? ORDER BY revision",
            Integer.class, quotationId
        );
    }

    @Test
    void concurrentSnapshotsHaveDifferentRevisionNumbers() throws Exception {
        together(
            () -> extras.revision(quotationId, "{}", admin),
            () -> extras.revision(quotationId, "{}", admin)
        );

        assertEquals(List.of(0, 1), revisionNumbers());
    }

    @Test
    void sendingAndCapturingSnapshotDoNotCollide() throws Exception {
        together(
            () -> quotations.send(quotationId),
            () -> extras.revision(quotationId, "{}", admin)
        );

        assertEquals(List.of(0, 1), revisionNumbers());
        assertEquals("SENT", db.queryForObject(
            "SELECT status FROM quotations WHERE id=?",
            String.class, quotationId
        ));
    }

    @Test
    void snapshotUsesDatabasePriceInsteadOfClientPrice() {
        extras.revision(
            quotationId,
            "{\"totalAmount\":1,\"items\":[],\"status\":\"ACCEPTED\"}",
            admin
        );

        String total = db.queryForObject(
            "SELECT JSON_UNQUOTE(JSON_EXTRACT(snapshot_json,'$.totalAmount')) " +
            "FROM quotation_revisions WHERE quotation_id=?",
            String.class, quotationId
        );
        String status = db.queryForObject(
            "SELECT JSON_UNQUOTE(JSON_EXTRACT(snapshot_json,'$.status')) " +
            "FROM quotation_revisions WHERE quotation_id=?",
            String.class, quotationId
        );

        assertEquals(0, new BigDecimal("100.00")
            .compareTo(new BigDecimal(total)));
        assertEquals("DRAFT", status);
    }

    @Test
    void customerCannotCreateRevision() {
        var error = assertThrows(
            ResponseStatusException.class,
            () -> extras.revision(quotationId, "{}", customer)
        );

        assertEquals(403, error.getStatusCode().value());
        assertTrue(revisionNumbers().isEmpty());
    }

    @AfterEach
    void cleanup() {
        new TransactionTemplate(manager).executeWithoutResult(status -> {
            if (quotationId != null) {
                db.update(
                    "DELETE FROM quotation_revisions WHERE quotation_id=?",
                    quotationId
                );
                db.update(
                    "DELETE FROM quotation_documents WHERE quotation_id=?",
                    quotationId
                );
                db.update(
                    "DELETE FROM quotation_items WHERE quotation_id=?",
                    quotationId
                );
                db.update("DELETE FROM quotations WHERE id=?", quotationId);
            }
            if (requestId != null) {
                db.update("DELETE FROM event_requests WHERE id=?", requestId);
            }
            if (userId != null) {
                db.update("DELETE FROM users WHERE id=?", userId);
            }
        });
    }
}
