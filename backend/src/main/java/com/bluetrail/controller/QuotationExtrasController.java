package com.bluetrail.controller;

import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.core.Authentication;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import java.util.*;

@RestController
public class QuotationExtrasController {
 private final JdbcTemplate jdbc;
 public QuotationExtrasController(JdbcTemplate jdbc){this.jdbc=jdbc;}
 @GetMapping("/api/admin/quotation-template")
 public String template(){return jdbc.query("SELECT template_json FROM quotation_templates WHERE id=1",rs->rs.next()?rs.getString(1):"{}");}
 @PutMapping("/api/admin/quotation-template")
 @Transactional
 public Map<String,Object> templateSave(@RequestBody String body,Authentication auth){
  if(body==null||body.length()>150000)throw new ResponseStatusException(HttpStatus.BAD_REQUEST);
  jdbc.update("INSERT INTO quotation_templates(id,template_json,updated_by) VALUES(1,?,?) ON DUPLICATE KEY UPDATE template_json=VALUES(template_json),updated_by=VALUES(updated_by)",body,auth.getName());
  return Map.of("saved",true);
 }
 @GetMapping("/api/admin/quotations/{id}/revisions")
 public List<Map<String,Object>> revisions(@PathVariable long id){return jdbc.queryForList("SELECT revision, snapshot_json AS snapshotJson, created_at AS createdAt, created_by AS createdBy FROM quotation_revisions WHERE quotation_id=? ORDER BY revision",id);}
 @PostMapping("/api/admin/quotations/{id}/revisions")
 @Transactional
 public Map<String,Object> revision(@PathVariable long id,@RequestBody String body,Authentication auth){
  if(body==null||body.length()>250000)throw new ResponseStatusException(HttpStatus.BAD_REQUEST);
  Integer exists=jdbc.queryForObject("SELECT COUNT(*) FROM quotations WHERE id=?",Integer.class,id);
  if(exists==null||exists==0)throw new ResponseStatusException(HttpStatus.NOT_FOUND);
  jdbc.update("INSERT INTO quotation_revisions(quotation_id,revision,snapshot_json,created_by) SELECT ?,COALESCE(MAX(revision),-1)+1,?,? FROM quotation_revisions WHERE quotation_id=?",id,body,auth.getName(),id);
  Integer latest=jdbc.queryForObject("SELECT MAX(revision) FROM quotation_revisions WHERE quotation_id=?",Integer.class,id);
  return Map.of("quotationId",id,"revision",latest);
 }
}
