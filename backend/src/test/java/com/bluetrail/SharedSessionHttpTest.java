package com.bluetrail;

import com.bluetrail.config.*;
import com.bluetrail.entity.User;
import com.bluetrail.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.springframework.context.annotation.*;
import org.springframework.jdbc.datasource.DriverManagerDataSource;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.web.csrf.CsrfToken;
import org.springframework.test.web.servlet.*;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.mock.web.MockServletContext;
import org.springframework.web.context.support.AnnotationConfigWebApplicationContext;
import org.springframework.web.servlet.config.annotation.EnableWebMvc;
import org.springframework.web.bind.annotation.*;
import jakarta.servlet.Filter;
import jakarta.servlet.http.*;
import javax.sql.DataSource;
import java.util.*;
import static org.mockito.Mockito.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

class SharedSessionHttpTest {
 @Configuration @EnableWebMvc @EnableWebSecurity
 @Import({SecurityConfig.class, SharedSessionConfig.class, Endpoints.class})
 static class Config {
  @Bean DataSource dataSource(){return new DriverManagerDataSource("jdbc:h2:mem:http_sessions;MODE=MySQL;DB_CLOSE_DELAY=-1","sa","");}
  @Bean org.springframework.transaction.PlatformTransactionManager transactionManager(DataSource ds){return new org.springframework.jdbc.datasource.DataSourceTransactionManager(ds);}
  @Bean UserRepository userRepository(){var repo=mock(UserRepository.class);var user=new User();user.setEmail("customer@example.com");user.setPassword(new BCryptPasswordEncoder().encode("test-password"));user.setRole("CUSTOMER");when(repo.findByEmail("customer@example.com")).thenReturn(Optional.of(user));return repo;}
 }
 @RestController static class Endpoints {
  @GetMapping("/api/auth/csrf") String csrf(HttpServletRequest r){return ((CsrfToken)r.getAttribute(CsrfToken.class.getName())).getToken();}
  @PostMapping("/api/bookings") String booking(Authentication a){return a.getName();}
 }
 private AnnotationConfigWebApplicationContext context(){var c=new AnnotationConfigWebApplicationContext();c.setServletContext(new MockServletContext());c.register(Config.class);c.refresh();return c;}
 private MockMvc mvc(AnnotationConfigWebApplicationContext c){return MockMvcBuilders.webAppContextSetup(c).addFilters(c.getBean("springSessionRepositoryFilter",Filter.class),c.getBean("springSecurityFilterChain",Filter.class)).build();}
 @Test void loginOnOneInstanceCanSubmitAuthenticatedRequestOnAnotherAfterRestart() throws Exception {
  Cookie loginCookie;
  try(var first=context()){
   var a=mvc(first);
   var token=a.perform(get("/api/auth/csrf").secure(true)).andExpect(status().isOk()).andReturn().getResponse();
   var anonymousCookie=token.getCookie("BTSESSION");assertNotNull(anonymousCookie);
   var login=a.perform(post("/api/auth/login").secure(true).cookie(anonymousCookie).param("_csrf",token.getContentAsString()).param("email","customer@example.com").param("password","test-password")).andExpect(status().isOk()).andReturn().getResponse();
   loginCookie=login.getCookie("BTSESSION");assertNotNull(loginCookie);
  }
  try(var second=context()){
   var b=mvc(second);
   var token=b.perform(get("/api/auth/csrf").secure(true).cookie(loginCookie)).andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
   b.perform(post("/api/bookings").secure(true).cookie(loginCookie)).andExpect(status().isForbidden());
   b.perform(post("/api/bookings").secure(true).cookie(loginCookie).param("_csrf",token)).andExpect(status().isOk()).andExpect(content().string("customer@example.com"));
   b.perform(post("/api/auth/logout").secure(true).cookie(loginCookie).param("_csrf",token)).andExpect(status().isOk());
   b.perform(get("/api/auth/me").secure(true).cookie(loginCookie)).andExpect(status().isUnauthorized());
  }
 }
}
