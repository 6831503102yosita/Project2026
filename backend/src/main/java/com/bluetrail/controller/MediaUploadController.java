package com.bluetrail.controller;

import java.util.*;
import org.springframework.http.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

@RestController
public class MediaUploadController {
  private final JdbcTemplate db;
  public MediaUploadController(JdbcTemplate db) { this.db = db; }
  private boolean admin(Authentication a) { return a != null && a.getAuthorities().stream().anyMatch(x -> x.getAuthority().equals("ROLE_ADMIN")); }
  private void check(MultipartFile file, boolean imageOnly) throws java.io.IOException {
    if (file == null || file.isEmpty() || file.getSize() > 5_000_000) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "File must be 1-5MB");
    byte[] b = file.getBytes(); String ct=file.getContentType();
    boolean jpeg=b.length>3 && (b[0]&255)==255 && (b[1]&255)==216 && (b[2]&255)==255;
    boolean png=b.length>7 && (b[0]&255)==137 && b[1]==80 && b[2]==78 && b[3]==71;
    boolean webp=b.length>12 && b[0]==82 && b[1]==73 && b[2]==70 && b[3]==70 && b[8]==87 && b[9]==69 && b[10]==66 && b[11]==80;
    boolean pdf=b.length>4 && b[0]==37 && b[1]==80 && b[2]==68 && b[3]==70 && b[4]==45;
    if (!(jpeg && "image/jpeg".equals(ct) || png && "image/png".equals(ct) || webp && "image/webp".equals(ct) || !imageOnly && pdf && "application/pdf".equals(ct))) throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Unsupported file content");
  }
  @PostMapping("/api/admin/events/{id}/image")
  public Map<String,Object> eventImage(@PathVariable long id,@RequestParam("file") MultipartFile file, Authentication a) throws java.io.IOException {
    check(file,true);
    if (db.queryForObject("SELECT COUNT(*) FROM events WHERE id=?",Integer.class,id)==0) throw new ResponseStatusException(HttpStatus.NOT_FOUND);
    db.update("INSERT INTO bluetrail_uploads(owner_email,event_id,file_name,content_type,file_data) VALUES(?,?,?,?,?)",a.getName(),id,Objects.toString(file.getOriginalFilename(),"image"),file.getContentType(),file.getBytes());
    Long uploadId=db.queryForObject("SELECT MAX(id) FROM bluetrail_uploads WHERE event_id=?",Long.class,id);
    String url="/api/media/"+uploadId;
    db.update("UPDATE events SET image_url=? WHERE id=?",url,id);
    return Map.of("imageUrl",url);
  }
  @PostMapping("/api/event-requests/{id}/files")
  public Map<String,Object> requestFile(@PathVariable long id,@RequestParam("file") MultipartFile file,Authentication a) throws java.io.IOException {
    check(file,false);
    Integer count=db.queryForObject("SELECT COUNT(*) FROM event_requests r JOIN users u ON u.id=r.user_id WHERE r.id=? AND u.email=?",Integer.class,id,a.getName());
    if (count==null||count==0) throw new ResponseStatusException(HttpStatus.FORBIDDEN);
    Integer existing=db.queryForObject("SELECT COUNT(*) FROM bluetrail_uploads WHERE event_request_id=?",Integer.class,id);
    if (existing!=null&&existing>=5) throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Maximum five attachments");
    db.update("INSERT INTO bluetrail_uploads(owner_email,event_request_id,file_name,content_type,file_data) VALUES(?,?,?,?,?)",a.getName(),id,Objects.toString(file.getOriginalFilename(),"attachment"),file.getContentType(),file.getBytes());
    Long uploadId=db.queryForObject("SELECT MAX(id) FROM bluetrail_uploads WHERE event_request_id=?",Long.class,id);
    return Map.of("id",uploadId,"url","/api/media/"+uploadId);
  }
  @GetMapping("/api/media/{id}")
  public ResponseEntity<byte[]> download(@PathVariable long id,Authentication a) {
    var rows=db.queryForList("SELECT owner_email,event_id,event_request_id,file_name,content_type,file_data FROM bluetrail_uploads WHERE id=?",id);
    if(rows.isEmpty())throw new ResponseStatusException(HttpStatus.NOT_FOUND);
    var r=rows.get(0);
    if(r.get("event_id")==null && (a==null || !admin(a) && !a.getName().equals(r.get("owner_email"))))throw new ResponseStatusException(HttpStatus.FORBIDDEN);
    byte[] bytes=(byte[])r.get("file_data");
    return ResponseEntity.ok().header(HttpHeaders.CONTENT_DISPOSITION,"inline").header("X-Content-Type-Options","nosniff").contentType(MediaType.parseMediaType((String)r.get("content_type"))).body(bytes);
  }
  @GetMapping("/api/admin/event-requests/{id}/files")
  public List<Map<String,Object>> requestFiles(@PathVariable long id){return db.queryForList("SELECT id,file_name AS fileName,content_type AS contentType FROM bluetrail_uploads WHERE event_request_id=? ORDER BY id",id);}
  @GetMapping("/api/event-requests/{id}/files")
  public List<Map<String,Object>> customerFiles(@PathVariable long id,Authentication a){
    if(db.queryForObject("SELECT COUNT(*) FROM event_requests r JOIN users u ON u.id=r.user_id WHERE r.id=? AND u.email=?",Integer.class,id,a.getName())==0)throw new ResponseStatusException(HttpStatus.FORBIDDEN);
    return db.queryForList("SELECT id,file_name AS fileName,content_type AS contentType FROM bluetrail_uploads WHERE event_request_id=? ORDER BY id",id);
  }
}
