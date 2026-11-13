package com.bluetrail;
import com.bluetrail.service.BookingMailService;
import org.junit.jupiter.api.Test;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.util.ReflectionTestUtils;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;
class BookingMailConfigurationTest {
 @Test void senderIsNotReportedReadyWithoutCredentials(){
  var service=new BookingMailService(mock(JdbcTemplate.class),mock(ApplicationEventPublisher.class));
  ReflectionTestUtils.setField(service,"enabled",true);
  ReflectionTestUtils.setField(service,"host","smtp.gmail.com");
  ReflectionTestUtils.setField(service,"from","bluetrail888@gmail.com");
  ReflectionTestUtils.setField(service,"username","bluetrail888@gmail.com");
  ReflectionTestUtils.setField(service,"password","");
  assertFalse(service.configured());
  ReflectionTestUtils.setField(service,"password","test-only-placeholder");
  assertTrue(service.configured());
  ReflectionTestUtils.setField(service,"enabled",false);
  assertFalse(service.configured());
 }
 @Test void disabledMailDoesNotReadOrSendOutbox(){
  var db=mock(JdbcTemplate.class);var service=new BookingMailService(db,mock(ApplicationEventPublisher.class));
  ReflectionTestUtils.setField(service,"enabled",false);service.deliver();verifyNoInteractions(db);
 }
}
