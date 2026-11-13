package com.bluetrail;
import com.bluetrail.controller.BookingDetailController;
import com.bluetrail.service.BookingMailService;
import com.bluetrail.entity.*;
import jakarta.persistence.*;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.core.Authentication;
import org.springframework.test.util.ReflectionTestUtils;
import static org.mockito.Mockito.*;
class BookingResendTest {
 @Test void resendRetriesExistingPendingMessageWithoutCreatingAnother(){
  var mail=mock(BookingMailService.class);var db=mock(JdbcTemplate.class);var em=mock(EntityManager.class);var auth=mock(Authentication.class);
  var user=new User();user.setEmail("test@example.com");var b=new Booking();b.setUser(user);
  when(auth.getName()).thenReturn("test@example.com");when(em.find(Booking.class,8L,LockModeType.PESSIMISTIC_WRITE)).thenReturn(b);
  when(db.queryForObject(contains("created_at>"),eq(Integer.class),eq(8L))).thenReturn(0);
  when(db.queryForObject(contains("status='PENDING'"),eq(Integer.class),eq(8L))).thenReturn(1);
  var controller=new BookingDetailController(mail,db);ReflectionTestUtils.setField(controller,"em",em);
  controller.resend(8L,auth);verify(mail).deliverBooking(8L);verify(mail,never()).queue(any(),anyString());verify(mail,never()).queueResend(any(),anyString());
 }
}
