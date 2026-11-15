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
    private final CustomUserDetailsService userDetailsService;

    @Transactional
    public List<User> getAllUsers() {
        List<User> users = userRepository.findAll();
        for (User u : users) {
            boolean isRoot = "admin".equalsIgnoreCase(u.getUsername());
            if (isRoot) {
                if (u.getRole() != UserRole.SUPERADMIN) {
                    u.setRole(UserRole.SUPERADMIN);
                    userRepository.save(u);
                }
                u.setRole(UserRole.SUPERADMIN);
                u.setPermissions(AppPermission.allCodes());
            } else if (u.getRole() == UserRole.ADMIN) {
                u.setPermissions(AppPermission.standardAdminCodes());
            } else if (u.getPermissions() != null) {
                Set<String> safePerms = new HashSet<>(u.getPermissions());
                safePerms.remove("SUPERADMIN");
                u.setPermissions(safePerms);
            }
        }
        return users;
    }

    @Transactional
    public User getUserById(Long id) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy người dùng có ID: " + id));
        boolean isRoot = "admin".equalsIgnoreCase(user.getUsername());
        if (isRoot) {
            if (user.getRole() != UserRole.SUPERADMIN) {
                user.setRole(UserRole.SUPERADMIN);
                userRepository.save(user);
            }
            user.setRole(UserRole.SUPERADMIN);
            user.setPermissions(AppPermission.allCodes());
        } else if (user.getRole() == UserRole.ADMIN) {
            user.setPermissions(AppPermission.standardAdminCodes());
        } else if (user.getPermissions() != null) {
            Set<String> safePerms = new HashSet<>(user.getPermissions());
            safePerms.remove("SUPERADMIN");
            user.setPermissions(safePerms);
        }
        return user;
    }

    @Transactional
    public User getUserByUsername(String username) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy người dùng: " + username));
        boolean isRoot = "admin".equalsIgnoreCase(user.getUsername());
        if (isRoot) {
            if (user.getRole() != UserRole.SUPERADMIN) {
                user.setRole(UserRole.SUPERADMIN);
                userRepository.save(user);
            }
            user.setRole(UserRole.SUPERADMIN);
            user.setPermissions(AppPermission.allCodes());
        } else if (user.getRole() == UserRole.ADMIN) {
            user.setPermissions(AppPermission.standardAdminCodes());
        } else if (user.getPermissions() != null) {
            Set<String> safePerms = new HashSet<>(user.getPermissions());
            safePerms.remove("SUPERADMIN");
            user.setPermissions(safePerms);
        }
        return user;
    }

    public boolean isSuperAdmin(String username) {
        if (username == null) return false;
        String trimmed = username.trim();
        if ("admin".equalsIgnoreCase(trimmed)) return true;
        return userRepository.findByUsername(trimmed)
                .map(u -> u.getRole() == UserRole.SUPERADMIN || "admin".equalsIgnoreCase(u.getUsername()))
                .orElse(false);
    }

    @Transactional(rollbackFor = Exception.class)
    public User createUser(CreateUserRequest request, String callerUsername) {
        String trimmedUsername = request.getUsername().trim();
        if (userRepository.findByUsername(trimmedUsername).isPresent()) {
            throw new IllegalArgumentException("Tên đăng nhập '" + trimmedUsername + "' đã tồn tại trong hệ thống.");
        }

        if (request.getRole() == UserRole.SUPERADMIN) {
            throw new IllegalArgumentException("Vai trò SUPERADMIN chỉ dành riêng cho tài khoản gốc và không thể gán cho bất kỳ ai khác.");
        }

        boolean isCallerSuper = isSuperAdmin(callerUsername);
        if (!isCallerSuper && request.getRole() == UserRole.ADMIN) {
            throw new IllegalArgumentException("Chỉ tài khoản Quản trị tối cao (Superadmin) mới có quyền tạo tài khoản có vai trò Quản trị viên (ADMIN).");
        }

        Set<String> assignedPermissions;
        if (request.getRole() == UserRole.ADMIN) {
            assignedPermissions = new HashSet<>(AppPermission.standardAdminCodes());
        } else if (request.getPermissions() != null) {
            assignedPermissions = new HashSet<>(request.getPermissions());
        } else {
            assignedPermissions = new HashSet<>(AppPermission.getDefaultPermissionsForRole(request.getRole()));
        }

        // Quyền SUPERADMIN chỉ dành riêng cho tài khoản admin gốc, tuyệt đối không cấp cho tài khoản mới
        assignedPermissions.remove("SUPERADMIN");

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

        log.info("Tạo tài khoản người dùng mới: {} bởi {} với vai trò: {}, số lượng quyền: {}", 
                user.getUsername(), callerUsername, user.getRole(), user.getPermissions().size());

        User saved = userRepository.save(user);
        userDetailsService.clearCache();
        return saved;
    }

    @Transactional(rollbackFor = Exception.class)
    public User createUser(CreateUserRequest request) {
        return createUser(request, null);
    }

    @Transactional(rollbackFor = Exception.class)
    public User updateUser(Long id, UpdateUserRequest request, String callerUsername) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy người dùng có ID: " + id));

        boolean isTargetRoot = "admin".equalsIgnoreCase(user.getUsername()) || user.getRole() == UserRole.SUPERADMIN;
        boolean isCallerSuper = isSuperAdmin(callerUsername);

        // Nếu đối tượng chỉnh sửa là tài khoản gốc: BẮT BUỘC người gọi phải là Superadmin
        if (isTargetRoot && !isCallerSuper) {
            throw new IllegalArgumentException("Chỉ tài khoản Quản trị tối cao (Superadmin) mới có quyền chỉnh sửa tài khoản gốc.");
        }

        if (isTargetRoot) {
            if (request.getIsActive() != null && !request.getIsActive()) {
                throw new IllegalArgumentException("Không thể vô hiệu hóa tài khoản Quản trị tối cao (Superadmin).");
            }
            user.setRole(UserRole.SUPERADMIN);
        } else {
            if (request.getRole() == UserRole.SUPERADMIN) {
                throw new IllegalArgumentException("Không thể gán vai trò SUPERADMIN cho tài khoản khác ngoài tài khoản quản trị viên gốc.");
            }
            // ADMIN thường không được nâng tài khoản khác lên ADMIN
            if (!isCallerSuper && request.getRole() == UserRole.ADMIN && user.getRole() != UserRole.ADMIN) {
                throw new IllegalArgumentException("Chỉ tài khoản Quản trị tối cao (Superadmin) mới có quyền nâng cấp vai trò người dùng lên ADMIN.");
            }
            if (request.getRole() != null) {
                user.setRole(request.getRole());
            }
        }

        if (request.getFullName() != null) {
            user.setFullName(request.getFullName().trim());
        }
        if (request.getEmail() != null) {
            user.setEmail(request.getEmail().trim());
        }
        if (request.getAvatarUrl() != null) {
            user.setAvatarUrl(request.getAvatarUrl());
        }
        if (request.getIsActive() != null && !isTargetRoot) {
            // ADMIN thường không được thay đổi trạng thái kích hoạt/khóa của tài khoản khác
            if (!isCallerSuper && !request.getIsActive().equals(user.getIsActive())) {
                throw new IllegalArgumentException("Chỉ tài khoản Quản trị tối cao (Superadmin) mới có quyền thay đổi trạng thái kích hoạt / khóa tài khoản.");
            }
            user.setIsActive(request.getIsActive());
        }

        // Cập nhật permissions tùy chỉnh
        if (isTargetRoot) {
            user.setPermissions(AppPermission.allCodes());
        } else if (user.getRole() == UserRole.ADMIN) {
            user.setPermissions(AppPermission.standardAdminCodes());
        } else if (request.getPermissions() != null) {
            Set<String> cleanPerms = new HashSet<>(request.getPermissions());
            cleanPerms.remove("SUPERADMIN");
            user.setPermissions(cleanPerms);
        }

        log.info("Cập nhật thông tin và phân quyền cho người dùng: {} (ID: {}) bởi {}", user.getUsername(), id, callerUsername);
        User saved = userRepository.save(user);
        userDetailsService.clearCache();
        return saved;
    }

    @Transactional(rollbackFor = Exception.class)
    public User updateUser(Long id, UpdateUserRequest request) {
        return updateUser(id, request, null);
    }

    @Transactional(rollbackFor = Exception.class)
    public void changePassword(Long id, String newPassword, String callerUsername) {
        if (newPassword == null || newPassword.trim().length() < 6) {
            throw new IllegalArgumentException("Mật khẩu mới phải có tối thiểu 6 ký tự.");
        }
        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy người dùng có ID: " + id));

        boolean isTargetRoot = "admin".equalsIgnoreCase(user.getUsername()) || user.getRole() == UserRole.SUPERADMIN;
        boolean isCallerSuper = isSuperAdmin(callerUsername);

        if (isTargetRoot && !isCallerSuper) {
            throw new IllegalArgumentException("Chỉ tài khoản Quản trị tối cao (Superadmin) mới có quyền đổi mật khẩu của tài khoản gốc.");
        }

        user.setPasswordHash(passwordEncoder.encode(newPassword.trim()));
        userRepository.save(user);
        userDetailsService.clearCache();
        log.info("Đã thay đổi mật khẩu thành công cho người dùng: {} bởi {}", user.getUsername(), callerUsername);
    }

    @Transactional(rollbackFor = Exception.class)
    public void changePassword(Long id, String newPassword) {
        changePassword(id, newPassword, null);
    }

    @Transactional(rollbackFor = Exception.class)
    public User toggleStatus(Long id, String callerUsername) {
        boolean isCallerSuper = isSuperAdmin(callerUsername);
        if (!isCallerSuper) {
            throw new IllegalArgumentException("Quyền khóa hoặc mở khóa tài khoản chỉ dành riêng cho tài khoản Quản trị tối cao (Superadmin).");
        }

        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy người dùng có ID: " + id));

        if ("admin".equalsIgnoreCase(user.getUsername()) || user.getRole() == UserRole.SUPERADMIN) {
            throw new IllegalArgumentException("Không thể khóa tài khoản Quản trị tối cao (Superadmin).");
        }

        boolean newStatus = !Boolean.TRUE.equals(user.getIsActive());
        user.setIsActive(newStatus);
        log.info("Chuyển trạng thái người dùng {}: {} bởi {}", user.getUsername(), newStatus ? "Kích hoạt" : "Đã khóa", callerUsername);
        User saved = userRepository.save(user);
        userDetailsService.clearCache();
        return saved;
    }

    @Transactional(rollbackFor = Exception.class)
    public User toggleStatus(Long id) {
        return toggleStatus(id, null);
    }

    @Transactional(rollbackFor = Exception.class)
    public void deleteUser(Long id, String currentUsername) {
        boolean isCallerSuper = isSuperAdmin(currentUsername);
        if (!isCallerSuper) {
            throw new IllegalArgumentException("Quyền xóa tài khoản chỉ dành riêng cho tài khoản Quản trị tối cao (Superadmin).");
        }

        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy người dùng có ID: " + id));

        if ("admin".equalsIgnoreCase(user.getUsername()) || user.getRole() == UserRole.SUPERADMIN) {
            throw new IllegalArgumentException("Không thể xóa tài khoản Quản trị tối cao (Superadmin).");
        }
        if (user.getUsername().equalsIgnoreCase(currentUsername)) {
            throw new IllegalArgumentException("Bạn không thể tự xóa tài khoản của chính mình.");
        }

        userRepository.delete(user);
        userDetailsService.clearCache();
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
        User saved = userRepository.save(user);
        userDetailsService.clearCache();
        return saved;
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
        userDetailsService.clearCache();
        log.info("Người dùng '{}' đã tự đổi mật khẩu thành công.", username);
    }

    public List<PermissionDto> getAllPermissions() {
        return AppPermission.getAllPermissionDtos();
    }
}


