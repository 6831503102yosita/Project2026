package com.bluetrail.service;

import java.util.*;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;
import tools.jackson.databind.json.JsonMapper;

/** Fixed demonstration company accounts. Client supplied account details are never trusted. */
public final class CompanyBanks {
 private CompanyBanks() {}
 public record Account(String id,String bankName,String bankNameEn,String bankAccount,String accountName) {}
 private static final String HOLDER="บริษัท บลูเทรลรวย จำกัด";
 public static final List<Account> ALL=List.of(
  new Account("KBANK","กสิกรไทย","Kasikornbank","342-8-49829-0",HOLDER),
  new Account("SCB","ไทยพาณิชย์","Siam Commercial Bank","581-736492-8",HOLDER),
  new Account("BBL","กรุงเทพ","Bangkok Bank","729-4-05183-6",HOLDER));
 public static Account require(String id) {
  return ALL.stream().filter(a->a.id().equals(id)).findFirst().orElseThrow(()->new ResponseStatusException(HttpStatus.BAD_REQUEST,"Select a company bank"));
 }
 public static String templateDocument(String json) {
  try {
   JsonMapper mapper=JsonMapper.builder().build();
   Map<String,Object> data=new LinkedHashMap<>(mapper.readValue(canonicalDocument(json),Map.class));
   Map<String,Object> input=mapper.readValue(json,Map.class);
   String number=String.valueOf(input.getOrDefault("bankAccount", "")).trim();
   if(!number.matches("[0-9][0-9 -]{4,30}[0-9]"))throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Invalid account number");
   data.put("bankAccount",number);
   return mapper.writeValueAsString(data);
  }catch(ResponseStatusException e){throw e;}catch(Exception e){throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Invalid quotation template");}
 }
 public static String canonicalDocument(String json) {
  try {
   JsonMapper mapper=JsonMapper.builder().build();
   Map<String,Object> data=new LinkedHashMap<>(mapper.readValue(json,Map.class));
   Account a=require(String.valueOf(data.getOrDefault("bankId","")));
   data.put("bankId",a.id());data.put("bankName",a.bankName());
   data.put("bankAccount",a.bankAccount());data.put("accountName",a.accountName());data.put("swift","");
   return mapper.writeValueAsString(data);
  }catch(ResponseStatusException e){throw e;}catch(Exception e){throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Invalid quotation document");}
 }
}
