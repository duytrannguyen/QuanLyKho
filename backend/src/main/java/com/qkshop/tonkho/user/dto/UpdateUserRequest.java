package com.qkshop.tonkho.user.dto;

import com.qkshop.tonkho.user.UserRole;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Set;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UpdateUserRequest {

    @NotBlank(message = "Họ và tên không được để trống")
    @Size(max = 100, message = "Họ và tên không vượt quá 100 ký tự")
    private String fullName;

    @Email(message = "Địa chỉ email không đúng định dạng")
    private String email;

    @NotNull(message = "Vai trò không được để trống")
    private UserRole role;

    private String avatarUrl;

    private Boolean isActive;

    private Set<String> permissions;
}
