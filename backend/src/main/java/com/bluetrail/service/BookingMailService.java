package com.bluetrail.service;

import com.bluetrail.entity.Booking;
import org.springframework.stereotype.Service;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSenderImpl;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.transaction.annotation.Transactional;
import java.time.*;
import java.util.*;
import org.slf4j.LoggerFactory;

/** Queue in the booking transaction; delivery failure never rolls back a booking. */
@Service
public class BookingMailService {
    private final JdbcTemplate db;
    private final org.springframework.context.ApplicationEventPublisher events;
    public record Queued(long id){}
    @Value("${BLUETRAIL_MAIL_ENABLED:false}") private boolean enabled;
    @Value("${BLUETRAIL_SMTP_HOST:}") private String host;
    @Value("${BLUETRAIL_SMTP_PORT:587}") private int port;
    @Value("${BLUETRAIL_SMTP_USERNAME:}") private String username;
    @Value("${BLUETRAIL_SMTP_PASSWORD:}") private String password;
    @Value("${BLUETRAIL_MAIL_FROM:}") private String from;
    @Value("${BLUETRAIL_SMTP_SSL:false}") private boolean ssl;
    public BookingMailService(JdbcTemplate db,org.springframework.context.ApplicationEventPublisher events){this.db=db;this.events=events;}
    protected JavaMailSenderImpl createSender(){return new JavaMailSenderImpl();}
    public boolean configured(){return enabled && !host.isBlank() && !from.isBlank() && !username.isBlank() && !password.isBlank();}
    @Transactional
    public void queue(Booking b,String update){queueInternal(b,update,false);}
    @Transactional
    public void queueResend(Booking b,String update){queueInternal(b,update,true);}
    private void queueInternal(Booking b,String update,boolean manual){
        // Serialize queue creation per booking across requests and instances.
        db.queryForObject("SELECT id FROM bookings WHERE id=? FOR UPDATE",Long.class,b.getId());
        String recipient=b.getUser().getEmail();
        String total=java.text.NumberFormat.getNumberInstance(Locale.US).format(b.getTotalPrice());
        String text="BlueTrail — รายละเอียดการจอง / Booking details\n\n"+
            "เลขที่การจอง: #"+b.getId()+"\nงาน: "+b.getEvent().getTitle()+
            "\nวันจัดงาน: "+eventDate(b.getEvent().getEventDate())+
            "\nสถานที่: "+Objects.toString(b.getEvent().getLocation(),"—")+
            "\nจำนวน: "+b.getQuantity()+"\nยอดรวม: ฿"+total+
            "\nสถานะการจอง: "+statusLabel(String.valueOf(b.getStatus()))+"\n"+update+
            "\n\nเข้าสู่เว็บ BlueTrail > การจองของฉัน เพื่อดูข้อมูลล่าสุด";
        var duplicate=db.queryForList("SELECT id FROM booking_email_outbox WHERE booking_id=? AND message=? AND (status='PENDING' OR (?=false AND status='SENT')) ORDER BY id LIMIT 1 FOR UPDATE",b.getId(),text,manual);
        if(!duplicate.isEmpty()){
            LoggerFactory.getLogger(getClass()).info("Booking email duplicate suppressed for booking {}",b.getId());
            return;
        }
        db.update("INSERT INTO booking_email_outbox(booking_id,recipient,subject,message,next_attempt,created_at) VALUES(?,?,?,?,UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))",
            b.getId(),recipient,"BlueTrail: Booking #"+b.getId()+" — "+statusLabel(String.valueOf(b.getStatus())),text);
        events.publishEvent(new Queued(b.getId()));
    }
    static String eventDate(LocalDateTime date){
        return date==null?"—":date.format(java.time.format.DateTimeFormatter.ofPattern("dd/MM/uuuu HH:mm"))+" (เวลาไทย / Thai time)";
    }
    static String statusLabel(String status){
        return switch(status.toUpperCase(Locale.ROOT)){
            case "PENDING" -> "รอชำระเงิน / Pending payment";
            case "CONFIRMED" -> "ยืนยันแล้ว / Confirmed";
            case "EXPIRED" -> "หมดอายุ / Expired";
            case "CANCELLED" -> "ยกเลิก / Cancelled";
            default -> status;
        };
    }
    public Map<String,Object> state(long id){
        var rows=db.queryForList("SELECT status,attempts,sent_at AS sentAt,created_at AS queuedAt,next_attempt AS nextAttempt FROM booking_email_outbox WHERE booking_id=? ORDER BY id DESC LIMIT 1",id);
        var result=new LinkedHashMap<String,Object>();result.put("configured",configured());
        if(!rows.isEmpty()) result.putAll(rows.get(0));
        return result;
    }
    @org.springframework.transaction.event.TransactionalEventListener(phase=org.springframework.transaction.event.TransactionPhase.AFTER_COMMIT)
    @Transactional(propagation=org.springframework.transaction.annotation.Propagation.REQUIRES_NEW)
    public void afterCommit(Queued event){
        try {deliverBooking(event.id());} catch(Exception ex) {
            LoggerFactory.getLogger(getClass()).warn("Booking email remains queued for retry");
        }
    }
    // Row locks prevent two Cloud Run instances from processing the same message together.
    @Scheduled(fixedDelay=30000,initialDelay=45000)
    @Transactional
    public void deliver(){
        deliverBooking(0);
    }
    @Transactional
    public void deliverBooking(long bookingId){
        if(!configured()) return;
        String query="SELECT id,recipient,subject,message,attempts FROM booking_email_outbox WHERE status='PENDING' AND next_attempt<=UTC_TIMESTAMP(6)";
        var rows=bookingId>0?db.queryForList(query+" AND booking_id=? ORDER BY id LIMIT 5 FOR UPDATE SKIP LOCKED",bookingId):db.queryForList(query+" ORDER BY id LIMIT 5 FOR UPDATE SKIP LOCKED");
        if(rows.isEmpty()) return;
        JavaMailSenderImpl sender=createSender();sender.setHost(host);sender.setPort(port);
        sender.setUsername(username);sender.setPassword(password);sender.setDefaultEncoding("UTF-8");
        var props=sender.getJavaMailProperties();props.setProperty("mail.smtp.auth",String.valueOf(!username.isBlank()));
        props.setProperty("mail.smtp.starttls.enable",String.valueOf(!ssl));props.setProperty("mail.smtp.starttls.required",String.valueOf(!ssl));
        props.setProperty("mail.smtp.ssl.enable",String.valueOf(ssl));
        props.setProperty("mail.smtp.ssl.checkserveridentity","true");
        props.setProperty("mail.smtp.connectiontimeout","5000");props.setProperty("mail.smtp.timeout","5000");props.setProperty("mail.smtp.writetimeout","5000");
        for(var row:rows){
            long id=((Number)row.get("id")).longValue();int attempts=((Number)row.get("attempts")).intValue()+1;
            try{
                SimpleMailMessage mail=new SimpleMailMessage();mail.setFrom(from);mail.setTo((String)row.get("recipient"));
                mail.setSubject((String)row.get("subject"));mail.setText((String)row.get("message"));sender.send(mail);
                db.update("UPDATE booking_email_outbox SET status='SENT',sent_at=UTC_TIMESTAMP(6),attempts=? WHERE id=?",attempts,id);
            }catch(Exception ex){
                // Avoid logging credentials, customer addresses, or SMTP server replies.
                LoggerFactory.getLogger(getClass()).warn("Booking email delivery failed for outbox {} (attempt {})",id,attempts);
                db.update("UPDATE booking_email_outbox SET attempts=?,status=?,next_attempt=DATE_ADD(UTC_TIMESTAMP(6),INTERVAL 5 MINUTE) WHERE id=?",attempts,attempts>=6?"FAILED":"PENDING",id);
            }
        }
    }
    public void sendNotice(String recipient,String subject,String text){
        if(!configured())throw new IllegalStateException("Email sender unavailable");
        JavaMailSenderImpl sender=createSender();sender.setHost(host);sender.setPort(port);
        sender.setUsername(username);sender.setPassword(password);sender.setDefaultEncoding("UTF-8");
        var props=sender.getJavaMailProperties();props.setProperty("mail.smtp.auth",String.valueOf(!username.isBlank()));
        props.setProperty("mail.smtp.starttls.enable",String.valueOf(!ssl));props.setProperty("mail.smtp.starttls.required",String.valueOf(!ssl));
        props.setProperty("mail.smtp.ssl.enable",String.valueOf(ssl));
        props.setProperty("mail.smtp.ssl.checkserveridentity","true");
        props.setProperty("mail.smtp.connectiontimeout","5000");props.setProperty("mail.smtp.timeout","5000");props.setProperty("mail.smtp.writetimeout","5000");
        SimpleMailMessage message=new SimpleMailMessage();message.setFrom(from);message.setTo(recipient);message.setSubject(subject);message.setText(text);sender.send(message);
    }
}
