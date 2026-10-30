package com.qkshop.tonkho.user;

import com.qkshop.tonkho.exception.ResourceNotFoundException;
import com.qkshop.tonkho.user.dto.CreateUserRequest;
import com.qkshop.tonkho.user.dto.PermissionDto;
import com.qkshop.tonkho.user.dto.UpdateUserRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashSet;
import java.util.List;
import java.util.Set;

@Slf4j
@Service
@RequiredArgsConstructor
public class UserService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    @Transactional(readOnly = true)
    public List<User> getAllUsers() {
        List<User> users = userRepository.findAll();
        // Đối với user role ADMIN, đảm bảo permissions luôn đầy đủ khi trả về
        for (User u : users) {
            if (u.getRole() == UserRole.ADMIN) {
                u.setPermissions(AppPermission.allCodes());
            }
        }
        return users;
    }

    @Transactional(readOnly = true)
    public User getUserById(Long id) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy người dùng có ID: " + id));
        if (user.getRole() == UserRole.ADMIN) {
            user.setPermissions(AppPermission.allCodes());
        }
        return user;
    }

    @Transactional(readOnly = true)
    public User getUserByUsername(String username) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy người dùng: " + username));
        if (user.getRole() == UserRole.ADMIN) {
            user.setPermissions(AppPermission.allCodes());
        }
        return user;
    }

    @Transactional(rollbackFor = Exception.class)
    public User createUser(CreateUserRequest request) {
        String trimmedUsername = request.getUsername().trim();
        if (userRepository.findByUsername(trimmedUsername).isPresent()) {
            throw new IllegalArgumentException("Tên đăng nhập '" + trimmedUsername + "' đã tồn tại trong hệ thống.");
        }

        Set<String> assignedPermissions;
        if (request.getRole() == UserRole.ADMIN) {
            assignedPermissions = AppPermission.allCodes();
        } else if (request.getPermissions() != null && !request.getPermissions().isEmpty()) {
            assignedPermissions = new HashSet<>(request.getPermissions());
        } else {
            assignedPermissions = AppPermission.getDefaultPermissionsForRole(request.getRole());
        }

        User user = User.builder()
                .username(trimmedUsername)
                .passwordHash(passwordEncoder.encode(request.getPassword()))
                .fullName(request.getFullName().trim())
                .email(request.getEmail() != null ? request.getEmail().trim() : null)
                .role(request.getRole())
                .avatarUrl(request.getAvatarUrl())
                .isActive(request.getIsActive() != null ? request.getIsActive() : true)
                .permissions(assignedPermissions)
                .build();

        log.info("Tạo tài khoản người dùng mới: {} với vai trò: {}, số lượng quyền: {}", 
                user.getUsername(), user.getRole(), user.getPermissions().size());

        return userRepository.save(user);
    }

    @Transactional(rollbackFor = Exception.class)
    public User updateUser(Long id, UpdateUserRequest request) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy người dùng có ID: " + id));

        boolean isAdminRoot = "admin".equalsIgnoreCase(user.getUsername());
        if (isAdminRoot) {
            if (request.getRole() != UserRole.ADMIN) {
                throw new IllegalArgumentException("Không thể hạ quyền tài khoản quản trị viên hệ thống chính (admin).");
            }
            if (request.getIsActive() != null && !request.getIsActive()) {
                throw new IllegalArgumentException("Không thể vô hiệu hóa tài khoản quản trị viên hệ thống chính (admin).");
            }
        }

        if (request.getFullName() != null) {
            user.setFullName(request.getFullName().trim());
        }
        if (request.getEmail() != null) {
            user.setEmail(request.getEmail().trim());
        }
        if (request.getRole() != null) {
            user.setRole(request.getRole());
        }
        if (request.getAvatarUrl() != null) {
            user.setAvatarUrl(request.getAvatarUrl());
        }
        if (request.getIsActive() != null && !isAdminRoot) {
            user.setIsActive(request.getIsActive());
        }

        // Cập nhật permissions tùy chỉnh
        if (user.getRole() == UserRole.ADMIN) {
            user.setPermissions(AppPermission.allCodes());
        } else if (request.getPermissions() != null) {
            user.setPermissions(new HashSet<>(request.getPermissions()));
        }

        log.info("Cập nhật thông tin và phân quyền cho người dùng: {} (ID: {})", user.getUsername(), id);
        return userRepository.save(user);
    }

    @Transactional(rollbackFor = Exception.class)
    public void changePassword(Long id, String newPassword) {
        if (newPassword == null || newPassword.trim().length() < 6) {
            throw new IllegalArgumentException("Mật khẩu mới phải có tối thiểu 6 ký tự.");
        }
        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy người dùng có ID: " + id));

        user.setPasswordHash(passwordEncoder.encode(newPassword.trim()));
        userRepository.save(user);
        log.info("Đã thay đổi mật khẩu thành công cho người dùng: {}", user.getUsername());
    }

    @Transactional(rollbackFor = Exception.class)
    public User toggleStatus(Long id) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy người dùng có ID: " + id));

        if ("admin".equalsIgnoreCase(user.getUsername())) {
            throw new IllegalArgumentException("Không thể khóa tài khoản quản trị viên hệ thống chính (admin).");
        }

        boolean newStatus = !Boolean.TRUE.equals(user.getIsActive());
        user.setIsActive(newStatus);
        log.info("Chuyển trạng thái người dùng {}: {}", user.getUsername(), newStatus ? "Kích hoạt" : "Đã khóa");
        return userRepository.save(user);
    }

    @Transactional(rollbackFor = Exception.class)
    public void deleteUser(Long id, String currentUsername) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy người dùng có ID: " + id));

        if ("admin".equalsIgnoreCase(user.getUsername())) {
            throw new IllegalArgumentException("Không thể xóa tài khoản quản trị viên hệ thống chính (admin).");
        }
        if (user.getUsername().equalsIgnoreCase(currentUsername)) {
            throw new IllegalArgumentException("Bạn không thể tự xóa tài khoản của chính mình.");
        }

        userRepository.delete(user);
        log.info("Đã xóa tài khoản người dùng: {} (ID: {}) bởi {}", user.getUsername(), id, currentUsername);
    }

    @Transactional(rollbackFor = Exception.class)
    public User updateProfile(String username, com.qkshop.tonkho.user.dto.UpdateProfileRequest request) {
        User user = getUserByUsername(username);

        if (request.getFullName() != null) {
            user.setFullName(request.getFullName().trim());
        }
        if (request.getEmail() != null) {
            user.setEmail(request.getEmail().trim());
        }
        if (request.getAvatarUrl() != null) {
            user.setAvatarUrl(request.getAvatarUrl());
        }

        log.info("Người dùng '{}' đã cập nhật thông tin cá nhân thành công.", username);
        return userRepository.save(user);
    }

    @Transactional(rollbackFor = Exception.class)
    public void changeMyPassword(String username, com.qkshop.tonkho.user.dto.ChangeMyPasswordRequest request) {
        User user = getUserByUsername(username);

        if (!passwordEncoder.matches(request.getCurrentPassword(), user.getPasswordHash())) {
            throw new IllegalArgumentException("Mật khẩu hiện tại không chính xác. Vui lòng kiểm tra lại.");
        }

        if (request.getNewPassword() == null || request.getNewPassword().trim().length() < 6) {
            throw new IllegalArgumentException("Mật khẩu mới phải có tối thiểu 6 ký tự.");
        }

        if (passwordEncoder.matches(request.getNewPassword().trim(), user.getPasswordHash())) {
            throw new IllegalArgumentException("Mật khẩu mới không được trùng với mật khẩu hiện tại.");
        }

        user.setPasswordHash(passwordEncoder.encode(request.getNewPassword().trim()));
        userRepository.save(user);
        log.info("Người dùng '{}' đã tự đổi mật khẩu thành công.", username);
    }

    public List<PermissionDto> getAllPermissions() {
        return AppPermission.getAllPermissionDtos();
    }
}


