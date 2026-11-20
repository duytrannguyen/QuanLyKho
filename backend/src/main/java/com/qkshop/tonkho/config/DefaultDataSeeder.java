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

    @Value("${app.admin.auto-create:true}")
    private boolean autoCreateAdmin;

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
        // Tự động kiểm tra và đảm bảo tài khoản Quản trị viên tối cao (admin) luôn luôn tồn tại
        if (!userRepository.existsByUsername(adminUsername)) {
            User admin = User.builder()
                    .username(adminUsername)
                    .passwordHash(passwordEncoder.encode(adminPassword))
                    .fullName(adminFullName)
                    .email(adminEmail)
                    .role(UserRole.SUPERADMIN)
                    .permissions(AppPermission.allCodes())
                    .isActive(true)
                    .build();
            userRepository.save(admin);
            log.info("======== ĐÃ TỰ ĐỘNG KHỞI TẠO TÀI KHOẢN ADMIN MẶC ĐỊNH (Username: {}, Vai trò: SUPERADMIN) ========", adminUsername);
        } else {
            // Nếu đã có tài khoản admin, đảm bảo tài khoản này luôn được kích hoạt và có quyền SUPERADMIN
            userRepository.findByUsername(adminUsername).ifPresent(admin -> {
                boolean modified = false;
                if (!Boolean.TRUE.equals(admin.getIsActive())) {
                    admin.setIsActive(true);
                    modified = true;
                }
                if (admin.getRole() != UserRole.SUPERADMIN) {
                    admin.setRole(UserRole.SUPERADMIN);
                    admin.setPermissions(AppPermission.allCodes());
                    modified = true;
                }
                if (modified) {
                    userRepository.save(admin);
                    log.info("======== ĐÃ CẬP NHẬT TRẠNG THÁI VÀ QUYỀN SUPERADMIN CHO TÀI KHOẢN ADMIN ========");
                }
            });
        }
    }
}
