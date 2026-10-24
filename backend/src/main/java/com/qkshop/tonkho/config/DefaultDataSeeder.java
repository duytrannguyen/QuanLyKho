package com.qkshop.tonkho.config;

import com.qkshop.tonkho.user.AppPermission;
import com.qkshop.tonkho.user.User;
import com.qkshop.tonkho.user.UserRepository;
import com.qkshop.tonkho.user.UserRole;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

@Slf4j
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
                    .permissions(AppPermission.allCodes())
                    .isActive(true)
                    .build();
            userRepository.save(admin);
            log.info("======== ĐÃ KHỞI TẠO TÀI KHOẢN QUẢN TRỊ VIÊN MẶC ĐỊNH (Username: {}) ========", adminUsername);
            log.warn("LƯU Ý BẢO MẬT: Hãy đổi mật khẩu quản trị viên ngay trên giao diện cài đặt sau khi đăng nhập để đảm bảo an toàn.");
        } else {
            userRepository.findByUsername(adminUsername).ifPresent(admin -> {
                if (admin.getPermissions() == null || admin.getPermissions().isEmpty()) {
                    admin.setPermissions(AppPermission.allCodes());
                    userRepository.save(admin);
                }
            });
        }
    }
}
