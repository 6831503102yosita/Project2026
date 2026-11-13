package com.bluetrail;
import com.bluetrail.service.BookingMailService;
import com.bluetrail.entity.*;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.jdbc.core.JdbcTemplate;
import java.time.LocalDateTime;
import java.math.BigDecimal;
import static org.mockito.Mockito.*;
import static org.junit.jupiter.api.Assertions.*;
class BookingMailQueueTest {
 private Booking booking(){var b=new Booking();b.setId(8L);var u=new User();u.setEmail("test@example.com");b.setUser(u);var e=new Event();e.setTitle("ทดสอบ");e.setLocation("เชียงราย");e.setEventDate(LocalDateTime.of(2027,1,31,18,19,27,281147000));b.setEvent(e);b.setTotalPrice(new BigDecimal("650.00"));return b;}
 @Test void duplicateAutomaticNotificationDoesNotInsertOrPublish(){
  var db=mock(JdbcTemplate.class);var events=mock(ApplicationEventPublisher.class);var mail=new BookingMailService(db,events);
  when(db.queryForList(contains("message=?"),eq(8L),anyString(),eq(false))).thenReturn(java.util.List.of(java.util.Map.of("id",1L)));
  mail.queue(booking(),"Booking created");verify(db).queryForObject(contains("FOR UPDATE"),eq(Long.class),eq(8L));verify(db,never()).update(anyString(),any(Object[].class));verifyNoInteractions(events);
 }
 @Test void mailUsesReadableDateAndTranslatedStateAndResendRemainsPossible(){
  var db=mock(JdbcTemplate.class);var events=mock(ApplicationEventPublisher.class);var mail=new BookingMailService(db,events);
  mail.queueResend(booking(),"Requested resend");var body=ArgumentCaptor.forClass(String.class);
  verify(db).update(contains("INSERT INTO"),eq(8L),eq("test@example.com"),contains("Pending payment"),body.capture());
  assertTrue(body.getValue().contains("31/01/2027 18:19"));assertTrue(body.getValue().contains("รอชำระเงิน"));assertFalse(body.getValue().contains("281147"));
  verify(db).queryForList(contains("FOR UPDATE"),eq(8L),anyString(),eq(true));verify(events).publishEvent(any(BookingMailService.Queued.class));
 }
}
