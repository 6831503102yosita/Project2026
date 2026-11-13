package com.bluetrail.controller;

import com.bluetrail.entity.*;
import com.bluetrail.repository.UserRepository;
import jakarta.persistence.*;
import org.springframework.web.bind.annotation.*;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import java.time.*;
import java.util.*;

/** Account history and admin-created users use the existing account store. */
@RestController
public class ExperienceController {
    private final JdbcTemplate db;
    private final UserRepository users;
    private final PasswordEncoder passwords;
    @PersistenceContext private EntityManager em;
    public ExperienceController(JdbcTemplate db, UserRepository users, PasswordEncoder passwords){
        this.db=db;this.users=users;this.passwords=passwords;
    }
    private ResponseStatusException fail(HttpStatus status,String text){return new ResponseStatusException(status,text);}
    public record NewUser(String name,String email,String phone,String password,String role){}
    @PostMapping("/api/admin/users")
    @ResponseStatus(HttpStatus.CREATED)
    @Transactional
    public Map<String,Object> createUser(@RequestBody NewUser input){
        if(input==null || input.name()==null || input.name().isBlank() || input.name().length()>100 ||
            input.email()==null || input.email().length()>150 || !input.email().trim().matches("^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$") ||
            input.password()==null || input.password().length()<8 || input.password().getBytes(java.nio.charset.StandardCharsets.UTF_8).length>72 ||
            input.role()==null || !Set.of("CUSTOMER","ORGANIZER","ADMIN").contains(input.role()) ||
            (input.phone()!=null && input.phone().length()>30)) throw fail(HttpStatus.BAD_REQUEST,"Check name, email, role and password (8 characters minimum, 72 bytes maximum)");
        String email=input.email().trim().toLowerCase(Locale.ROOT);
        if(users.findByEmail(email).isPresent()) throw fail(HttpStatus.CONFLICT,"Email is already registered");
        User user=new User();user.setName(input.name().trim());user.setEmail(email);user.setPhone(input.phone());
        user.setPassword(passwords.encode(input.password()));user.setRole(input.role());
        try{users.saveAndFlush(user);}catch(org.springframework.dao.DataIntegrityViolationException e){throw fail(HttpStatus.CONFLICT,"Email is already registered");}
        return Map.of("id",user.getId(),"name",user.getName(),"email",user.getEmail(),"role",user.getRole());
    }
    @GetMapping("/api/profile/history")
    @Transactional(readOnly=true)
    public List<Map<String,Object>> history(Authentication auth){
        User user=users.findByEmail(auth.getName()).orElseThrow();
        return db.queryForList("SELECT b.id,b.event_id AS eventId,e.title,e.title_en AS titleEn,e.image_url AS imageUrl,e.category,e.event_date AS eventDate,b.quantity,b.total_price AS totalPrice,b.status,b.booking_date AS bookingDate,v.rating,v.comment,v.created_at AS reviewedAt FROM bookings b JOIN events e ON e.id=b.event_id LEFT JOIN booking_reviews v ON v.booking_id=b.id WHERE b.user_id=? ORDER BY b.id DESC",user.getId());
    }
    public record Review(Integer rating,String comment){}
    @PostMapping("/api/profile/bookings/{id}/review")
    @Transactional
    public Map<String,Object> review(@PathVariable long id,@RequestBody Review input,Authentication auth){
        if(input==null || input.rating()==null || input.rating()<1 || input.rating()>5 || input.comment()==null || input.comment().length()>2000)
            throw fail(HttpStatus.BAD_REQUEST,"Choose 1–5 stars; comment max 2000 characters");
        User user=users.findByEmail(auth.getName()).orElseThrow();
        Booking booking=em.find(Booking.class,id,LockModeType.PESSIMISTIC_WRITE);
        if(booking==null || !booking.getUser().getId().equals(user.getId())) throw fail(HttpStatus.NOT_FOUND,"Booking not found");
        if(!"CONFIRMED".equals(booking.getStatus()) || booking.getEvent().getEventDate()==null ||
           !booking.getEvent().getEventDate().toLocalDate().isBefore(LocalDate.now(ZoneId.of("Asia/Bangkok"))))
            throw fail(HttpStatus.CONFLICT,"Reviews open after the event date for confirmed bookings");
        Integer count=db.queryForObject("SELECT COUNT(*) FROM booking_reviews WHERE booking_id=?",Integer.class,id);
        if(count!=null && count>0) db.update("UPDATE booking_reviews SET rating=?,comment=? WHERE booking_id=? AND user_id=?",input.rating(),input.comment().trim(),id,user.getId());
        else db.update("INSERT INTO booking_reviews(booking_id,user_id,rating,comment) VALUES(?,?,?,?)",id,user.getId(),input.rating(),input.comment().trim());
        return Map.of("saved",true);
    }
}
