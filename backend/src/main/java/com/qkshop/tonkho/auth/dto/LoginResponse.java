package com.qkshop.tonkho.auth.dto;

import lombok.*;

@Getter @Setter
@NoArgsConstructor @AllArgsConstructor
@Builder
public class LoginResponse {
    private String token;
    private String refreshToken;
    private String username;
    private String fullName;
    private String role;
    private String avatarUrl;
}
