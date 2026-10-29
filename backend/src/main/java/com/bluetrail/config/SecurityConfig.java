package com.bluetrail.config;

import com.bluetrail.repository.UserRepository;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.HttpStatusEntryPoint;
import org.springframework.security.web.csrf.HttpSessionCsrfTokenRepository;

@Configuration
public class SecurityConfig {

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public UserDetailsService userDetailsService(
            UserRepository userRepository) {

        return email -> {
            com.bluetrail.entity.User user =
                userRepository.findByEmail(email)
                    .orElseThrow(() ->
                        new UsernameNotFoundException(
                            "Invalid email or password"
                        )
                    );

            return org.springframework.security.core.userdetails.User
                .withUsername(user.getEmail())
                .password(user.getPassword())
                .roles(user.getRole())
                .build();
        };
    }

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http)
            throws Exception {

        http
            .csrf(csrf -> csrf
                .csrfTokenRepository(
                    new HttpSessionCsrfTokenRepository()
                )
            )
            .authorizeHttpRequests(auth -> auth

                // Public website
                .requestMatchers(
                    "/",
                    "/index.html",
                    "/css/**",
                    "/js/**",
                    "/assets/**",
                    "/images/**",
                    "/fonts/**",
                    "/favicon.ico",
                    "/error"
                ).permitAll()

                // Public authentication endpoints
                .requestMatchers(
                    "/api/auth/csrf",
                    "/api/auth/register",
                    "/api/auth/login"
                ).permitAll()

                // Logged-in user information
                .requestMatchers(
                    "/api/auth/me",
                    "/api/auth/logout"
                ).authenticated()

                // Public event information
                .requestMatchers(
                    HttpMethod.GET,
                    "/api/events",
                    "/api/events/**"
                ).permitAll()

                // Admin only
                .requestMatchers(
                    "/api/admin/**"
                ).hasRole("ADMIN")

                .requestMatchers(
                    "/api/events/**"
                ).hasRole("ADMIN")

                // Customer event requests
                .requestMatchers(
                    "/api/event-requests", "/api/event-requests/**"
                ).hasRole("CUSTOMER")

                // Customer booking API
                .requestMatchers(
                    HttpMethod.POST, "/api/bookings"
                ).hasRole("CUSTOMER")

                .requestMatchers(
                    HttpMethod.GET, "/api/bookings/my"
                ).hasRole("CUSTOMER")

                // Authenticated Payment APIs
                .requestMatchers(
                    "/api/payments", "/api/payments/**"
                ).authenticated()

                // Customer quotations
                .requestMatchers(
                    "/api/quotations", "/api/quotations/**"
                ).hasRole("CUSTOMER")

                // Public contact details; writes require admin role
                .requestMatchers(HttpMethod.GET, "/api/site/contact").permitAll()
                // Organizer work is private to the signed-in organizer
                .requestMatchers("/api/organizer/**").hasRole("ORGANIZER")

                .requestMatchers("/api/profile", "/api/profile/**").authenticated()

                // Other endpoints stay closed until implemented
                .anyRequest().denyAll()
            )
            .formLogin(form -> form
                .loginProcessingUrl("/api/auth/login")
                .usernameParameter("email")
                .passwordParameter("password")
                .successHandler((request, response, auth) -> {
                    response.setStatus(200);
                    response.setContentType("application/json");
                    response.getWriter().write(
                        "{\"message\":\"Login successful\"}"
                    );
                })
                .failureHandler((request, response, ex) -> {
                    response.setStatus(401);
                    response.setContentType("application/json");
                    response.getWriter().write(
                        "{\"error\":\"Invalid email or password\"}"
                    );
                })
                .permitAll()
            )
            .logout(logout -> logout
                .logoutUrl("/api/auth/logout")
                .logoutSuccessHandler((request, response, auth) -> {
                    response.setStatus(200);
                    response.setContentType("application/json");
                    response.getWriter().write(
                        "{\"message\":\"Logout successful\"}"
                    );
                })
                .permitAll()
            )
            .httpBasic(AbstractHttpConfigurer::disable)
            .exceptionHandling(ex -> ex
                .authenticationEntryPoint(
                    new HttpStatusEntryPoint(HttpStatus.UNAUTHORIZED)
                )
            );

        return http.build();
    }
}
