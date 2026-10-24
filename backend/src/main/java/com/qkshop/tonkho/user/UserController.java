package com.qkshop.tonkho.user;

import com.qkshop.tonkho.core.dto.ApiResponse;
import com.qkshop.tonkho.user.dto.ChangePasswordRequest;
import com.qkshop.tonkho.user.dto.CreateUserRequest;
import com.qkshop.tonkho.user.dto.PermissionDto;
import com.qkshop.tonkho.user.dto.UpdateUserRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
public class UserController {

    private final UserService userService;

    @GetMapping
    @PreAuthorize("hasRole('ADMIN') or hasAuthority('SYSTEM_MANAGE')")
    public ResponseEntity<ApiResponse<List<User>>> getUsers() {
        return ResponseEntity.ok(ApiResponse.ok(userService.getAllUsers()));
    }

    @GetMapping("/permissions")
    @PreAuthorize("hasRole('ADMIN') or hasAuthority('SYSTEM_MANAGE')")
    public ResponseEntity<ApiResponse<List<PermissionDto>>> getPermissions() {
        return ResponseEntity.ok(ApiResponse.ok(userService.getAllPermissions()));
    }

    @PostMapping
    @PreAuthorize("hasRole('ADMIN') or hasAuthority('SYSTEM_MANAGE')")
    public ResponseEntity<ApiResponse<User>> createUser(@Valid @RequestBody CreateUserRequest request) {
        User created = userService.createUser(request);
        return ResponseEntity.ok(ApiResponse.okWithMessage("Tạo tài khoản người dùng thành công", created));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN') or hasAuthority('SYSTEM_MANAGE')")
    public ResponseEntity<ApiResponse<User>> updateUser(@PathVariable Long id, @Valid @RequestBody UpdateUserRequest request) {
        User updated = userService.updateUser(id, request);
        return ResponseEntity.ok(ApiResponse.okWithMessage("Cập nhật thông tin và phân quyền thành công", updated));
    }

    @PutMapping("/{id}/change-password")
    @PreAuthorize("hasRole('ADMIN') or hasAuthority('SYSTEM_MANAGE')")
    public ResponseEntity<ApiResponse<Void>> changePassword(@PathVariable Long id, @Valid @RequestBody ChangePasswordRequest request) {
        userService.changePassword(id, request.getNewPassword());
        return ResponseEntity.ok(ApiResponse.okWithMessage("Đổi mật khẩu người dùng thành công", null));
    }

    @PatchMapping("/{id}/toggle-status")
    @PreAuthorize("hasRole('ADMIN') or hasAuthority('SYSTEM_MANAGE')")
    public ResponseEntity<ApiResponse<User>> toggleStatus(@PathVariable Long id) {
        User user = userService.toggleStatus(id);
        String msg = Boolean.TRUE.equals(user.getIsActive()) ? "Đã kích hoạt tài khoản" : "Đã khóa tài khoản";
        return ResponseEntity.ok(ApiResponse.okWithMessage(msg, user));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<Void>> deleteUser(@PathVariable Long id, Authentication authentication) {
        userService.deleteUser(id, authentication.getName());
        return ResponseEntity.ok(ApiResponse.okWithMessage("Xóa tài khoản người dùng thành công", null));
    }

    @GetMapping("/me")
    public ResponseEntity<ApiResponse<User>> getCurrentUser(Authentication authentication) {
        User user = userService.getUserByUsername(authentication.getName());
        return ResponseEntity.ok(ApiResponse.ok(user));
    }
}

