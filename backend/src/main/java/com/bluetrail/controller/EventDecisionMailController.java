package com.bluetrail.controller;
import com.bluetrail.entity.EventRequest;
import com.bluetrail.service.BookingMailService;
import jakarta.persistence.*;
import jakarta.annotation.PostConstruct;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.core.Authentication;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpStatus;
import java.util.*;
@RestController
public class EventDecisionMailController {
 private final JdbcTemplate db;private final BookingMailService mail;
 @PersistenceContext private EntityManager em;
 public EventDecisionMailController(JdbcTemplate db,BookingMailService mail){this.db=db;this.mail=mail;}
 @org.springframework.beans.factory.annotation.Value(
     "${bluetrail.schema.bootstrap:true}")
 private boolean schemaBootstrap = true;

 @PostConstruct public void schema(){
  if (!schemaBootstrap) return;
  db.execute("CREATE TABLE IF NOT EXISTS event_decision_mail (mail_key VARCHAR(100) PRIMARY KEY,last_attempt DATETIME(6),sent_at DATETIME(6),status VARCHAR(20) NOT NULL)");}
 @PostMapping("/api/admin/event-requests/{id}/decision-email")
 @Transactional public Map<String,Object> send(@PathVariable long id,@RequestBody(required=false) Map<String,Object> input,Authentication auth){
  if(auth==null||auth.getAuthorities().stream().noneMatch(a->"ROLE_ADMIN".equals(a.getAuthority())))throw new ResponseStatusException(HttpStatus.FORBIDDEN);
  EventRequest req=em.find(EventRequest.class,id,LockModeType.PESSIMISTIC_WRITE);
  if(req==null)throw new ResponseStatusException(HttpStatus.NOT_FOUND);
  String result=String.valueOf(req.getStatus()).toUpperCase(Locale.ROOT),note="",key="request:"+id;
  if(input!=null&&input.get("changeId")!=null){
   long changeId;try{changeId=Long.parseLong(String.valueOf(input.get("changeId")));}catch(Exception ex){throw new ResponseStatusException(HttpStatus.BAD_REQUEST);}
   var rows=db.queryForList("SELECT status,admin_note FROM event_request_changes WHERE id=? AND event_request_id=?",changeId,id);
   if(rows.isEmpty())throw new ResponseStatusException(HttpStatus.NOT_FOUND);
   result=String.valueOf(rows.get(0).get("status")).toUpperCase(Locale.ROOT);note=Objects.toString(rows.get(0).get("admin_note"),"");key="change:"+changeId;
   if(!Set.of("APPROVED","REJECTED").contains(result))throw new ResponseStatusException(HttpStatus.CONFLICT,"Save the decision first");
  }else if(!Set.of("CONFIRM","CONFIRMED","CANCEL","APPROVED","REJECTED").contains(result))throw new ResponseStatusException(HttpStatus.CONFLICT,"Save the decision first");
  if(!mail.configured())throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE,"Email sender unavailable");
  key+=":"+result;
  Integer recent=db.queryForObject("SELECT COUNT(*) FROM event_decision_mail WHERE mail_key=? AND last_attempt>DATE_SUB(UTC_TIMESTAMP(6),INTERVAL 1 MINUTE)",Integer.class,key);
  if(recent!=null&&recent>0)throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS,"Wait one minute");
  db.update("INSERT INTO event_decision_mail(mail_key,last_attempt,status) VALUES(?,UTC_TIMESTAMP(6),'SENDING') ON DUPLICATE KEY UPDATE last_attempt=UTC_TIMESTAMP(6),status='SENDING'",key);
  boolean rejected=Set.of("CANCEL","REJECTED").contains(result);
  String decision=rejected?"ไม่อนุมัติ / Rejected":"อนุมัติแล้ว / Approved";
  String text="BlueTrail — ผลพิจารณาคำขอ / Request decision\n\nเลขคำขอ / Request #"+id+"\nงาน / Event: "+req.getTitle()+"\nผล / Decision: "+decision+(note.isBlank()?"":"\nเหตุผล / Admin reply: "+note)+"\n\nดูรายละเอียดใน BlueTrail > คำขอ Event ของฉัน / My Event Requests";
  try{mail.sendNotice(req.getUser().getEmail(),"BlueTrail: Request #"+id+" — "+decision,text);db.update("UPDATE event_decision_mail SET status='SENT',sent_at=UTC_TIMESTAMP(6) WHERE mail_key=?",key);return Map.of("status","SENT");}
  catch(Exception ex){db.update("UPDATE event_decision_mail SET status='FAILED' WHERE mail_key=?",key);return Map.of("status","FAILED");}
 }
}
