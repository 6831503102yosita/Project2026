package com.bluetrail;
import com.bluetrail.service.BookingMailService;
import org.junit.jupiter.api.Test;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSenderImpl;
import org.springframework.test.util.ReflectionTestUtils;
import java.util.*;
import static org.mockito.Mockito.*;
class BookingMailDeliveryTest {
 private BookingMailService service(JdbcTemplate db,JavaMailSenderImpl sender){
  var s=new BookingMailService(db,mock(ApplicationEventPublisher.class)){@Override protected JavaMailSenderImpl createSender(){return sender;}};
  for(var e:Map.of("enabled",true,"host","smtp.gmail.com","from","sender@example.com","username","sender@example.com","password","test-only-placeholder").entrySet())ReflectionTestUtils.setField(s,e.getKey(),e.getValue());
  return s;
 }
 @Test void requestRetryTargetsOnlyOwnedBookingAndMarksSmtpAccepted(){
  var db=mock(JdbcTemplate.class);var sender=mock(JavaMailSenderImpl.class);when(sender.getJavaMailProperties()).thenReturn(new Properties());var s=service(db,sender);
  when(db.queryForList(anyString(),eq(5L))).thenReturn(List.of(Map.of("id",9L,"recipient","test@example.com","subject","test","message","body","attempts",0)));
  s.deliverBooking(5L);
  verify(db).queryForList(contains("AND booking_id=?"),eq(5L));
  verify(sender).send(any(SimpleMailMessage.class));
  verify(db).update(contains("status='SENT'"),eq(1),eq(9L));
 }
 @Test void sixthSmtpFailureBecomesFailedRatherThanSent(){
  var db=mock(JdbcTemplate.class);var sender=mock(JavaMailSenderImpl.class);when(sender.getJavaMailProperties()).thenReturn(new Properties());var s=service(db,sender);
  when(db.queryForList(anyString(),eq(5L))).thenReturn(List.of(Map.of("id",9L,"recipient","test@example.com","subject","test","message","body","attempts",5)));
  doThrow(new org.springframework.mail.MailSendException("test failure")).when(sender).send(any(SimpleMailMessage.class));
  s.deliverBooking(5L);verify(db).update(contains("next_attempt=DATE_ADD"),eq(6),eq("FAILED"),eq(9L));
 }
}
