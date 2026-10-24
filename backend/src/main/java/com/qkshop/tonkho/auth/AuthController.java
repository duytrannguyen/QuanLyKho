package com.qkshop.tonkho.auth;

import com.qkshop.tonkho.auth.dto.LoginRequest;
import com.qkshop.tonkho.auth.dto.LoginResponse;
import com.qkshop.tonkho.auth.dto.RefreshTokenRequest;
import com.qkshop.tonkho.auth.dto.RefreshTokenResponse;
import com.qkshop.tonkho.core.dto.ApiResponse;
import com.qkshop.tonkho.exception.ResourceNotFoundException;
import com.qkshop.tonkho.user.AppPermission;
import com.qkshop.tonkho.user.User;
import com.qkshop.tonkho.user.UserRepository;
import com.qkshop.tonkho.user.UserRole;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.DisabledException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.Collections;
import java.util.Set;

@Slf4j
@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthenticationManager authenticationManager;
    private final JwtTokenProvider jwtTokenProvider;
    private final UserRepository userRepository;

    @PostMapping("/login")
    public ResponseEntity<ApiResponse<LoginResponse>> login(@Valid @RequestBody LoginRequest request) {
        String username = request.getUsername().trim();

        // 1. Kiểm tra tài khoản tồn tại và trạng thái kích hoạt trước khi xác thực
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new BadCredentialsException("Tên đăng nhập hoặc mật khẩu không chính xác."));

        if (Boolean.FALSE.equals(user.getIsActive())) {
            log.warn("Cố gắng đăng nhập vào tài khoản đã bị khóa: {}", username);
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(ApiResponse.error("ACCOUNT_LOCKED", "Tài khoản này đã bị khóa. Vui lòng liên hệ với quản trị viên hệ thống."));
        }

        // 2. Xác thực credentials qua AuthenticationManager
        Authentication authentication = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(username, request.getPassword())
        );

        SecurityContextHolder.getContext().setAuthentication(authentication);

        // 3. Sinh JWT Access Token và Refresh Token thực thụ
        String token = jwtTokenProvider.generateToken(user.getUsername(), user.getRole().name());
        String refreshToken = jwtTokenProvider.generateRefreshToken(user.getUsername());

        Set<String> permissions = (user.getRole() == UserRole.ADMIN) 
                ? AppPermission.allCodes() 
                : (user.getPermissions() != null ? user.getPermissions() : Collections.emptySet());

        LoginResponse response = LoginResponse.builder()
                .token(token)
                .refreshToken(refreshToken)
                .username(user.getUsername())
                .fullName(user.getFullName())
                .role(user.getRole().getDisplayName())
                .avatarUrl(user.getAvatarUrl())
                .permissions(permissions)
                .expiresInMs(jwtTokenProvider.getExpirationMs())
                .build();

        log.info("Người dùng '{}' đăng nhập thành công. Vai trò: {}", username, user.getRole());
        return ResponseEntity.ok(ApiResponse.okWithMessage("Đăng nhập thành công", response));
    }

    @PostMapping("/refresh")
    public ResponseEntity<ApiResponse<RefreshTokenResponse>> refreshToken(@Valid @RequestBody RefreshTokenRequest request) {
        String refreshToken = request.getRefreshToken();

        if (!jwtTokenProvider.validateRefreshToken(refreshToken)) {
            log.warn("Yêu cầu refresh token không hợp lệ hoặc đã hết hạn.");
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(ApiResponse.error("INVALID_REFRESH_TOKEN", "Phiên đăng nhập đã hết hạn hoặc mã làm mới không hợp lệ. Vui lòng đăng nhập lại."));
        }

        String username = jwtTokenProvider.getUsernameFromToken(refreshToken);
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy thông tin tài khoản: " + username));

        if (Boolean.FALSE.equals(user.getIsActive())) {
            log.warn("Tài khoản '{}' bị khóa trong khi đang cố làm mới token.", username);
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(ApiResponse.error("ACCOUNT_LOCKED", "Tài khoản của bạn đã bị khóa. Vui lòng liên hệ với quản trị viên."));
        }

        // Cấp mới Access Token và Refresh Token mới
        String newToken = jwtTokenProvider.generateToken(user.getUsername(), user.getRole().name());
        String newRefreshToken = jwtTokenProvider.generateRefreshToken(user.getUsername());

        RefreshTokenResponse response = RefreshTokenResponse.builder()
                .token(newToken)
                .refreshToken(newRefreshToken)
                .expiresInMs(jwtTokenProvider.getExpirationMs())
                .build();

        log.info("Làm mới Access Token thành công cho người dùng: {}", username);
        return ResponseEntity.ok(ApiResponse.okWithMessage("Làm mới phiên làm việc thành công", response));
    }

    @GetMapping("/me")
    public ResponseEntity<ApiResponse<LoginResponse>> getCurrentUser() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        String username = auth.getName();

        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy người dùng: " + username));

        if (Boolean.FALSE.equals(user.getIsActive())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(ApiResponse.error("ACCOUNT_LOCKED", "Tài khoản của bạn đã bị khóa."));
        }

        Set<String> permissions = (user.getRole() == UserRole.ADMIN) 
                ? AppPermission.allCodes() 
                : (user.getPermissions() != null ? user.getPermissions() : Collections.emptySet());

        LoginResponse response = LoginResponse.builder()
                .username(user.getUsername())
                .fullName(user.getFullName())
                .role(user.getRole().getDisplayName())
                .avatarUrl(user.getAvatarUrl())
                .permissions(permissions)
                .expiresInMs(jwtTokenProvider.getExpirationMs())
                .build();

        return ResponseEntity.ok(ApiResponse.ok(response));
    }
}
