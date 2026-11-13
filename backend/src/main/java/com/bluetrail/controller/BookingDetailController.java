package com.bluetrail.controller;

import com.bluetrail.entity.Booking;
import com.bluetrail.service.BookingMailService;
import jakarta.persistence.*;
import org.springframework.web.bind.annotation.*;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import java.util.*;

@RestController
public class BookingDetailController {
    private final BookingMailService mail;
    private final JdbcTemplate db;
    @PersistenceContext private EntityManager em;
    public BookingDetailController(BookingMailService mail,JdbcTemplate db){this.mail=mail;this.db=db;}
    private Booking own(long id,Authentication auth,boolean lock){
        Booking b=lock?em.find(Booking.class,id,LockModeType.PESSIMISTIC_WRITE):em.find(Booking.class,id);
        boolean admin=auth!=null && auth.getAuthorities().stream().anyMatch(a->"ROLE_ADMIN".equals(a.getAuthority()));
        if(b==null || auth==null || (!admin && !b.getUser().getEmail().equalsIgnoreCase(auth.getName())))
            throw new ResponseStatusException(HttpStatus.NOT_FOUND,"Booking not found");
        return b;
    }
    @GetMapping({"/api/bookings/{id}","/api/admin/bookings/{id}"})
    @Transactional(readOnly=true)
    public Map<String,Object> detail(@PathVariable long id,Authentication auth){
        Booking b=own(id,auth,false);var out=new LinkedHashMap<String,Object>();
        out.put("id",b.getId());out.put("eventTitle",b.getEvent().getTitle());out.put("eventTitleEn",b.getEvent().getTitleEn());out.put("eventDate",b.getEvent().getEventDate());
        out.put("location",b.getEvent().getLocation());out.put("quantity",b.getQuantity());out.put("totalPrice",b.getTotalPrice());
        out.put("status",b.getStatus());out.put("bookingDate",b.getBookingDate());out.put("paymentDueAt",b.getPaymentDueAt());
        out.put("email", b.getContactEmail());
out.put("contactEmail", b.getContactEmail());out.put("contactName",b.getContactName());out.put("mail",mail.state(id));return out;
    }
    @PostMapping("/api/admin/bookings/{id}/payment-confirmation-email")
@Transactional
public Map<String, Object> paymentConfirmation(
        @PathVariable long id, Authentication auth) {

    Booking b = own(id, auth, true);

    if (auth.getAuthorities().stream()
            .noneMatch(a -> "ROLE_ADMIN".equals(a.getAuthority()))) {
        throw new ResponseStatusException(HttpStatus.FORBIDDEN);
    }

    Integer approved = db.queryForObject(
        "SELECT COUNT(*) FROM payments " +
        "WHERE booking_id=? AND status='APPROVED'",
        Integer.class, id
    );

    if (approved == null || approved == 0
            || !"CONFIRMED".equals(b.getStatus())) {
        throw new ResponseStatusException(
            HttpStatus.CONFLICT, "Approve the payment slip first");
    }

    if (!mail.configured()) {
        throw new ResponseStatusException(
            HttpStatus.SERVICE_UNAVAILABLE,
            "Email sender is not configured");
    }

    String update = "ผลตรวจสอบการชำระเงิน: APPROVED\n";

    Integer existing = db.queryForObject(
        "SELECT COUNT(*) FROM booking_email_outbox " +
        "WHERE booking_id=? AND status IN ('PENDING','SENT') " +
        "AND LOCATE(?, message)>0",
        Integer.class, id, update
    );

    if (existing == null || existing == 0) {
        mail.queue(b, update);
    }

    return mail.state(id);
}
    @GetMapping({"/api/bookings/{id}/email","/api/admin/bookings/{id}/email"})
    @Transactional
    public Map<String,Object> emailState(@PathVariable long id,Authentication auth){
        own(id,auth,false);
        // Request-driven retry also works when Cloud Run suspends background CPU.
        mail.deliverBooking(id);
        return mail.state(id);
    }
    @PostMapping({"/api/bookings/{id}/email","/api/admin/bookings/{id}/email"})
    @Transactional
    public Map<String,Object> resend(@PathVariable long id,Authentication auth){
        Booking b=own(id,auth,true);
        Integer recent=db.queryForObject("SELECT COUNT(*) FROM booking_email_outbox WHERE booking_id=? AND created_at>DATE_SUB(UTC_TIMESTAMP(6),INTERVAL 1 MINUTE)",Integer.class,id);
        if(recent!=null && recent>0) throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS,"Wait one minute before resending");
        Integer pending=db.queryForObject("SELECT COUNT(*) FROM booking_email_outbox WHERE booking_id=? AND status='PENDING'",Integer.class,id);
        // Retry the existing queued message instead of creating a second message.
        if(pending!=null && pending>0){mail.deliverBooking(id);return mail.state(id);}
        mail.queueResend(b,"ส่งรายละเอียดตามที่ลูกค้าร้องขอ");return mail.state(id);
    }
}
