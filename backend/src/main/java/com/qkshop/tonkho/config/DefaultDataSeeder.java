package com.qkshop.tonkho.config;

import com.qkshop.tonkho.user.User;
import com.qkshop.tonkho.user.UserRepository;
import com.qkshop.tonkho.user.UserRole;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class DefaultDataSeeder implements CommandLineRunner {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    @Value("${app.admin.username:admin}")
    private String adminUsername;

    @Value("${app.admin.password:admin123}")
    private String adminPassword;

    @Value("${app.admin.fullname:Admin QKShop}")
    private String adminFullName;

    @Value("${app.admin.email:admin@qkshop.vn}")
    private String adminEmail;

    @Override
    public void run(String... args) throws Exception {
        if (!userRepository.existsByUsername(adminUsername)) {
            User admin = User.builder()
                    .username(adminUsername)
                    .passwordHash(passwordEncoder.encode(adminPassword))
                    .fullName(adminFullName)
                    .email(adminEmail)
                    .role(UserRole.ADMIN)
                    .isActive(true)
                    .build();
            userRepository.save(admin);
            System.out.println("======== DEFAULT ADMIN ACCOUNT CREATED ========");
            System.out.println("Username: " + adminUsername);
            System.out.println("Password: " + adminPassword);
            System.out.println("===============================================");
        }
    }
}
