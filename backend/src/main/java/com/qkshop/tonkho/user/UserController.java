package com.qkshop.tonkho.user;

import com.qkshop.tonkho.core.dto.ApiResponse;
import com.qkshop.tonkho.user.User;
import com.qkshop.tonkho.user.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
public class UserController {

    private final UserService userService;

    @GetMapping
    public ResponseEntity<ApiResponse<List<User>>> getUsers() {
        return ResponseEntity.ok(ApiResponse.ok(userService.getAllUsers()));
    }

    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<User>> createUser(@RequestBody User user) {
        return ResponseEntity.ok(ApiResponse.okWithMessage("Tạo tài khoản thành công", userService.createUser(user)));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<User>> updateUser(@PathVariable Long id, @RequestBody User updates) {
        return ResponseEntity.ok(ApiResponse.okWithMessage("Cập nhật thành công", userService.updateUser(id, updates)));
    }

    @PutMapping("/{id}/change-password")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<Void>> changePassword(@PathVariable Long id, @RequestBody Map<String, String> payload) {
        userService.changePassword(id, payload.get("newPassword"));
        return ResponseEntity.ok(ApiResponse.okWithMessage("Đổi mật khẩu thành công", null));
    }
    
    @GetMapping("/me")
    public ResponseEntity<ApiResponse<User>> getCurrentUser(Authentication authentication) {
        User user = userService.getUserByUsername(authentication.getName());
        return ResponseEntity.ok(ApiResponse.ok(user));
    }
}
