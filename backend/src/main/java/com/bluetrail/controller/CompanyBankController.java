package com.bluetrail.controller;
import com.bluetrail.service.CompanyBanks;
import java.util.List;
import org.springframework.web.bind.annotation.*;
@RestController
public class CompanyBankController {
 @GetMapping("/api/site/banks") public List<CompanyBanks.Account> banks(){return CompanyBanks.ALL;}
}
