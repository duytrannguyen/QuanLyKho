package com.qkshop.tonkho.auth;

import io.jsonwebtoken.*;
import io.jsonwebtoken.security.Keys;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Date;
import java.util.UUID;

@Slf4j
@Component
public class JwtTokenProvider {

    public static final String CLAIM_ROLE = "role";
    public static final String CLAIM_TYPE = "type";
    public static final String TYPE_ACCESS = "ACCESS";
    public static final String TYPE_REFRESH = "REFRESH";

    private final SecretKey key;
    private final long expirationMs;
    private final long refreshExpirationMs;

    public JwtTokenProvider(
            @Value("${app.jwt.secret}") String secret,
            @Value("${app.jwt.expiration-ms:43200000}") long expirationMs,
            @Value("${app.jwt.refresh-expiration-ms:604800000}") long refreshExpirationMs) {

        byte[] secretBytes = secret.getBytes(StandardCharsets.UTF_8);
        if (secretBytes.length < 32) {
            log.error("CẢNH BÁO BẢO MẬT: JWT Secret Key quá ngắn ({} bytes). Yêu cầu tối thiểu 32 bytes (256-bit).", secretBytes.length);
            throw new IllegalStateException("JWT Secret Key không đạt tiêu chuẩn an toàn bảo mật (tối thiểu 32 bytes).");
        }

        this.key = Keys.hmacShaKeyFor(secretBytes);
        this.expirationMs = expirationMs;
        this.refreshExpirationMs = refreshExpirationMs;
        log.info("Khởi tạo JwtTokenProvider thành công. Thời hạn AccessToken: {}ms, RefreshToken: {}ms", expirationMs, refreshExpirationMs);
    }

    public long getExpirationMs() {
        return expirationMs;
    }

    /**
     * Tạo Access Token với claim loại token TYPE_ACCESS và JWT ID ngẫu nhiên
     */
    public String generateToken(String username, String role) {
        Date now = new Date();
        Date expiryDate = new Date(now.getTime() + expirationMs);

        return Jwts.builder()
                .id(UUID.randomUUID().toString())
                .subject(username)
                .claim(CLAIM_ROLE, role)
                .claim(CLAIM_TYPE, TYPE_ACCESS)
                .issuedAt(now)
                .expiration(expiryDate)
                .signWith(key)
                .compact();
    }

    /**
     * Tạo Refresh Token với claim loại token TYPE_REFRESH
     */
    public String generateRefreshToken(String username) {
        Date now = new Date();
        Date expiryDate = new Date(now.getTime() + refreshExpirationMs);

        return Jwts.builder()
                .id(UUID.randomUUID().toString())
                .subject(username)
                .claim(CLAIM_TYPE, TYPE_REFRESH)
                .issuedAt(now)
                .expiration(expiryDate)
                .signWith(key)
                .compact();
    }

    public String getUsernameFromToken(String token) {
        Claims claims = getClaims(token);
        return claims != null ? claims.getSubject() : null;
    }

    public String getTokenType(String token) {
        Claims claims = getClaims(token);
        return claims != null ? claims.get(CLAIM_TYPE, String.class) : null;
    }

    /**
     * Xác thực Access Token dùng cho các API thông thường
     */
    public boolean validateAccessToken(String token) {
        Claims claims = getClaims(token);
        if (claims == null) return false;
        String type = claims.get(CLAIM_TYPE, String.class);
        if (TYPE_REFRESH.equals(type)) {
            log.warn("Từ chối truy cập: Người dùng cố tình sử dụng Refresh Token để gọi API thông thường.");
            return false;
        }
        return true;
    }

    /**
     * Xác thực Refresh Token dùng cho endpoint /api/auth/refresh
     */
    public boolean validateRefreshToken(String token) {
        Claims claims = getClaims(token);
        if (claims == null) return false;
        String type = claims.get(CLAIM_TYPE, String.class);
        return TYPE_REFRESH.equals(type);
    }

    /**
     * Phương thức tương thích ngược
     */
    public boolean validateToken(String token) {
        return validateAccessToken(token);
    }

    private Claims getClaims(String token) {
        try {
            return Jwts.parser()
                    .verifyWith(key)
                    .build()
                    .parseSignedClaims(token)
                    .getPayload();
        } catch (ExpiredJwtException e) {
            log.debug("JWT Token đã hết hạn: {}", e.getMessage());
        } catch (SecurityException | MalformedJwtException e) {
            log.warn("Chữ ký hoặc cấu trúc JWT Token không hợp lệ: {}", e.getMessage());
        } catch (UnsupportedJwtException e) {
            log.warn("JWT Token không được hỗ trợ: {}", e.getMessage());
        } catch (IllegalArgumentException e) {
            log.warn("Chuỗi JWT Token rỗng hoặc không đúng chuẩn: {}", e.getMessage());
        } catch (Exception e) {
            log.error("Lỗi giải mã JWT Token: {}", e.getMessage());
        }
        return null;
    }
}
