package com.bluetrail.setup;

import com.bluetrail.entity.User;
import com.bluetrail.repository.UserRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;
import org.springframework.security.crypto.password.PasswordEncoder;

@Component
@Profile("admin-bootstrap")
public class AdminBootstrap implements CommandLineRunner {

    private final UserRepository users;
    private final PasswordEncoder encoder;

    public AdminBootstrap(
            UserRepository users,
            PasswordEncoder encoder) {
        this.users = users;
        this.encoder = encoder;
    }

    @Override
    public void run(String... args) {
        String email = "bluetrail-admin@example.com";
        String password = System.getenv("BT_ADMIN_PASSWORD");

        if (password == null || password.length() < 12) {
            throw new IllegalStateException(
                "Admin password must contain at least 12 characters"
            );
        }

        if (users.existsByEmail(email)) {
            System.out.println("ADMIN_ALREADY_EXISTS");
            return;
        }

        User admin = new User();
        admin.setName("BlueTrail Admin");
        admin.setEmail(email);
        admin.setPassword(encoder.encode(password));
        admin.setRole("ADMIN");
        admin.setPhone("");

        users.save(admin);

        System.out.println("ADMIN_BOOTSTRAP_SUCCESS");
    }
}
