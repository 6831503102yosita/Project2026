package com.bluetrail.controller;

import com.bluetrail.entity.User;
import com.bluetrail.repository.UserRepository;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.csrf.CsrfToken;
import org.springframework.web.bind.annotation.*;

import java.util.Locale;
import java.util.Map;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    public AuthController(
            UserRepository userRepository,
            PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
    }

    public record RegisterRequest(
        String name,
        String email,
        String password,
        String phone
    ) {}

    @GetMapping("/csrf")
    public Map<String, String> csrf(HttpServletRequest request) {
        CsrfToken token = (CsrfToken) request.getAttribute(
            CsrfToken.class.getName()
        );

        return Map.of(
            "token", token.getToken(),
            "headerName", token.getHeaderName()
        );
    }

    @PostMapping("/register")
    public ResponseEntity<?> register(
            @RequestBody RegisterRequest request) {

        if (request == null) {
            return ResponseEntity.badRequest()
                .body(Map.of("error", "Invalid request"));
        }

        String name = request.name() == null
            ? "" : request.name().trim();

        String email = request.email() == null
            ? "" : request.email().trim()
                .toLowerCase(Locale.ROOT);

        String password = request.password();
        String phone = request.phone() == null
            ? "" : request.phone().trim();

        if (name.isBlank() || name.length() > 100) {
            return ResponseEntity.badRequest()
                .body(Map.of("error", "Invalid name"));
        }

        if (email.length() > 150 ||
            !email.matches("^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$")) {
            return ResponseEntity.badRequest()
                .body(Map.of("error", "Invalid email"));
        }

        if (password == null ||
            password.length() < 8 ||
            password.length() > 128) {
            return ResponseEntity.badRequest()
                .body(Map.of(
                    "error",
                    "Password must contain 8-128 characters"
                ));
        }

        if (phone.length() > 30) {
            return ResponseEntity.badRequest()
                .body(Map.of("error", "Invalid phone number"));
        }

        if (userRepository.existsByEmail(email)) {
            return ResponseEntity.status(HttpStatus.CONFLICT)
                .body(Map.of("error", "Email already registered"));
        }

        User user = new User();
        user.setName(name);
        user.setEmail(email);
        user.setPassword(passwordEncoder.encode(password));
        user.setPhone(phone);

        // Public registration can create CUSTOMER only
        user.setRole("CUSTOMER");

        User saved = userRepository.save(user);

        return ResponseEntity.status(HttpStatus.CREATED)
            .body(Map.of(
                "message", "Registration successful",
                "id", saved.getId(),
                "email", saved.getEmail(),
                "role", saved.getRole()
            ));
    }

    @GetMapping("/me")
    public ResponseEntity<?> me(Authentication authentication) {

        return userRepository
            .findByEmail(authentication.getName())
            .<ResponseEntity<?>>map(user -> ResponseEntity.ok(
                Map.of(
                    "id", user.getId(),
                    "name", user.getName(),
                    "email", user.getEmail(),
                    "role", user.getRole()
                )
            ))
            .orElseGet(() ->
                ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("error", "User not found"))
            );
    }
}
