package com.bluetrail.controller;

import com.bluetrail.entity.User;
import com.bluetrail.repository.UserRepository;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import java.util.Map;

@RestController
public class ProfileController {
 private final UserRepository users;
 public ProfileController(UserRepository users){this.users=users;}
 public record ProfileInput(String name,String phone){}
 @GetMapping("/api/profile")
 public Map<String,Object> get(Authentication auth){return serialize(current(auth));}
 @PatchMapping("/api/profile")
 @Transactional
 public Map<String,Object> save(@RequestBody ProfileInput in,Authentication auth){
  if(in==null||in.name()==null||in.name().trim().isEmpty()||in.name().trim().length()>100||in.phone()!=null&&in.phone().length()>30)
   throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Invalid profile");
  User u=current(auth);u.setName(in.name().trim());u.setPhone(in.phone()==null?"":in.phone().trim());return serialize(users.saveAndFlush(u));
 }
 private User current(Authentication auth){return users.findByEmail(auth.getName()).orElseThrow(()->new ResponseStatusException(HttpStatus.UNAUTHORIZED));}
 private Map<String,Object> serialize(User u){return Map.of("id",u.getId(),"name",u.getName(),"email",u.getEmail(),"role",u.getRole(),"phone",u.getPhone()==null?"":u.getPhone());}
}
