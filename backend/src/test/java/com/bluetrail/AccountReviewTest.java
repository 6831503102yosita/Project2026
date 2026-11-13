package com.bluetrail;
import com.bluetrail.controller.ExperienceController;
import com.bluetrail.entity.*;
import com.bluetrail.repository.UserRepository;
import jakarta.persistence.*;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.server.ResponseStatusException;
import java.time.LocalDateTime;
import java.util.Optional;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;
class AccountReviewTest {
 @Test void editingReviewUpdatesOwnedBookingWithoutDuplicateInsert(){
  var db=mock(JdbcTemplate.class);var users=mock(UserRepository.class);var em=mock(EntityManager.class);
  var c=new ExperienceController(db,users,mock(PasswordEncoder.class));ReflectionTestUtils.setField(c,"em",em);
  var owner=new User();owner.setId(1L);var event=new Event();event.setEventDate(LocalDateTime.now().minusDays(5));
  var booking=new Booking();booking.setUser(owner);booking.setEvent(event);booking.setStatus("CONFIRMED");
  when(users.findByEmail("owner@example.com")).thenReturn(Optional.of(owner));when(em.find(Booking.class,7L,LockModeType.PESSIMISTIC_WRITE)).thenReturn(booking);
  when(db.queryForObject("SELECT COUNT(*) FROM booking_reviews WHERE booking_id=?",Integer.class,7L)).thenReturn(1);
  var auth=new UsernamePasswordAuthenticationToken("owner@example.com","");
  assertEquals(true,c.review(7L,new ExperienceController.Review(5,"Updated"),auth).get("saved"));
  verify(db).update("UPDATE booking_reviews SET rating=?,comment=? WHERE booking_id=? AND user_id=?",5,"Updated",7L,1L);
 }
 @Test void anotherUsersReviewCannotBeEdited(){
  var db=mock(JdbcTemplate.class);var users=mock(UserRepository.class);var em=mock(EntityManager.class);
  var c=new ExperienceController(db,users,mock(PasswordEncoder.class));ReflectionTestUtils.setField(c,"em",em);
  var owner=new User();owner.setId(1L);var other=new User();other.setId(2L);var booking=new Booking();booking.setUser(other);
  when(users.findByEmail("owner@example.com")).thenReturn(Optional.of(owner));when(em.find(Booking.class,7L,LockModeType.PESSIMISTIC_WRITE)).thenReturn(booking);
  assertThrows(ResponseStatusException.class,()->c.review(7L,new ExperienceController.Review(5,"Updated"),new UsernamePasswordAuthenticationToken("owner@example.com","")));
  verifyNoInteractions(db);
 }
}
