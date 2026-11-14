package com.bluetrail;

import com.bluetrail.controller.BookingController;
import com.bluetrail.entity.Event;
import com.bluetrail.entity.User;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.*;
import java.util.concurrent.*;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest(properties = {
    "spring.datasource.url=jdbc:mysql://127.0.0.1:3306/bluetrail_db?allowPublicKeyRetrieval=true&useSSL=false",
    "spring.datasource.username=bluetrail",
    "spring.datasource.password=${BT_LOCAL_DB_PASSWORD}",
    "BLUETRAIL_MAIL_ENABLED=false"
})
class BookingConcurrencyTest {
    @Autowired BookingController controller;
    @Autowired JdbcTemplate db;
    @Autowired PlatformTransactionManager transactionManager;
    @PersistenceContext EntityManager em;

    private TransactionTemplate tx;
    private Long eventId;
    private final List<Long> userIds = new ArrayList<>();
    private final List<String> emails = new ArrayList<>();

    @BeforeEach
    void prepare() {
        tx = new TransactionTemplate(transactionManager);

        tx.executeWithoutResult(status -> {
            for (int i = 0; i < 2; i++) {
                User user = new User();
                user.setName("Idempotency integration test");
                user.setEmail("booking-test-" + UUID.randomUUID() + "@example.com");
                user.setPassword("TEST_ACCOUNT_NOT_FOR_LOGIN");
                user.setRole("CUSTOMER");
                em.persist(user);
                em.flush();

                userIds.add(user.getId());
                emails.add(user.getEmail());
            }

            Event event = new Event();
            event.setTitle("TEST - Booking concurrency");
            event.setCategory("tour");
            event.setLocation("Test location");
            event.setEventDate(LocalDateTime.now().plusDays(30));
            event.setPrice(new BigDecimal("100.00"));
            event.setTotalSeats(2);
            event.setAvailableSeats(2);
            event.setStatus("ACTIVE");
            em.persist(event);
            em.flush();
            eventId = event.getId();
        });
    }

    private BookingController.NewBooking input(int quantity) {
        return new BookingController.NewBooking(
            eventId, quantity, "Test Customer", "0800000000",
            "booking-contact@example.com", "KBANK"
        );
    }

    private ResponseEntity<?> book(int userIndex, String key, int quantity) {
        var auth = new UsernamePasswordAuthenticationToken(
            emails.get(userIndex), "",
            List.of(new SimpleGrantedAuthority("ROLE_CUSTOMER"))
        );
        return controller.createOnce(input(quantity), auth, key);
    }

    private long bookingId(ResponseEntity<?> response) {
        return ((Number) ((Map<?, ?>) response.getBody()).get("id"))
            .longValue();
    }

    private int seats() {
        return db.queryForObject(
            "SELECT available_seats FROM events WHERE id=?",
            Integer.class, eventId
        );
    }

    private int bookingCount() {
        return db.queryForObject(
            "SELECT COUNT(*) FROM bookings WHERE event_id=?",
            Integer.class, eventId
        );
    }

    private int keyCount() {
        return db.queryForObject(
            "SELECT COUNT(*) FROM booking_idempotency i " +
            "JOIN bookings b ON b.id=i.booking_id WHERE b.event_id=?",
            Integer.class, eventId
        );
    }

    private List<ResponseEntity<?>> together(
            Callable<ResponseEntity<?>> first,
            Callable<ResponseEntity<?>> second) throws Exception {

        ExecutorService pool = Executors.newFixedThreadPool(2);
        CountDownLatch ready = new CountDownLatch(2);
        CountDownLatch start = new CountDownLatch(1);

        try {
            Callable<ResponseEntity<?>> a = () -> {
                ready.countDown();
                if (!start.await(10, TimeUnit.SECONDS)) {
                    throw new IllegalStateException("Start timeout");
                }
                return first.call();
            };
            Callable<ResponseEntity<?>> b = () -> {
                ready.countDown();
                if (!start.await(10, TimeUnit.SECONDS)) {
                    throw new IllegalStateException("Start timeout");
                }
                return second.call();
            };

            Future<ResponseEntity<?>> one = pool.submit(a);
            Future<ResponseEntity<?>> two = pool.submit(b);

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

    @Test
    void concurrentSameKeyCreatesOneBookingAndDeductsSeatsOnce()
            throws Exception {
        String key = UUID.randomUUID().toString();

        var results = together(
            () -> book(0, key, 1),
            () -> book(0, key, 1)
        );

        var codes = results.stream()
            .map(r -> r.getStatusCode().value())
            .sorted().toList();

        assertEquals(List.of(200, 201), codes);
        assertEquals(bookingId(results.get(0)), bookingId(results.get(1)));
        assertEquals(1, bookingCount());
        assertEquals(1, keyCount());
        assertEquals(1, seats());

        assertEquals(1, db.queryForObject(
            "SELECT COUNT(*) FROM booking_email_outbox o " +
            "JOIN bookings b ON b.id=o.booking_id WHERE b.event_id=?",
            Integer.class, eventId
        ));
    }

    @Test
    void twoCustomersCannotBothReserveAllRemainingSeats()
            throws Exception {
        var results = together(
            () -> book(0, UUID.randomUUID().toString(), 2),
            () -> book(1, UUID.randomUUID().toString(), 2)
        );

        var codes = results.stream()
            .map(r -> r.getStatusCode().value())
            .sorted().toList();

        assertEquals(List.of(201, 400), codes);
        assertEquals(1, bookingCount());
        assertEquals(1, keyCount());
        assertEquals(0, seats());
    }

    @Test
    void reusedKeyWithDifferentQuantityReturnsConflict() {
        String key = UUID.randomUUID().toString();

        assertEquals(201, book(0, key, 1).getStatusCode().value());
        assertEquals(409, book(0, key, 2).getStatusCode().value());

        assertEquals(1, bookingCount());
        assertEquals(1, keyCount());
        assertEquals(1, seats());
    }

    @Test
    void rollbackRestoresSeatsAndRemovesBookingKeyAndEmail() {
        String key = UUID.randomUUID().toString();

        assertThrows(IllegalStateException.class, () ->
            tx.executeWithoutResult(status -> {
                assertEquals(
                    201, book(0, key, 1).getStatusCode().value()
                );
                throw new IllegalStateException("Force test rollback");
            })
        );

        assertEquals(0, bookingCount());
        assertEquals(0, keyCount());
        assertEquals(2, seats());

        assertEquals(0, db.queryForObject(
            "SELECT COUNT(*) FROM booking_email_outbox WHERE booking_id " +
            "NOT IN (SELECT id FROM bookings)",
            Integer.class
        ));
    }

    @AfterEach
    void cleanup() {
        if (eventId == null) return;

        tx.executeWithoutResult(status -> {
            db.update(
                "DELETE FROM booking_email_outbox WHERE booking_id IN " +
                "(SELECT id FROM bookings WHERE event_id=?)", eventId
            );
            db.update(
                "DELETE FROM booking_idempotency WHERE booking_id IN " +
                "(SELECT id FROM bookings WHERE event_id=?)", eventId
            );
            db.update("DELETE FROM bookings WHERE event_id=?", eventId);
            db.update("DELETE FROM events WHERE id=?", eventId);

            for (Long id : userIds) {
                db.update("DELETE FROM users WHERE id=?", id);
            }
        });
    }
}
