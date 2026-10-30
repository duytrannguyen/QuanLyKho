package com.qkshop.tonkho.config;

import com.qkshop.tonkho.auth.JwtAuthenticationFilter;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.annotation.web.configurers.HeadersConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfigurationSource;

@Configuration
@EnableWebSecurity
@EnableMethodSecurity
@RequiredArgsConstructor
public class SecurityConfig {

    private final JwtAuthenticationFilter jwtAuthenticationFilter;
    private final CorsConfigurationSource corsConfigurationSource;

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
            .cors(cors -> cors.configurationSource(corsConfigurationSource))
            .csrf(AbstractHttpConfigurer::disable)
            .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            
            // Cấu hình Security Headers chống tấn công Web phổ biến (Clickjacking, MIME sniffing, XSS)
            .headers(headers -> headers
                .frameOptions(HeadersConfigurer.FrameOptionsConfig::deny)
                .contentTypeOptions(Customizer.withDefaults())
            )

            // Phân quyền URL chặt chẽ
            .authorizeHttpRequests(auth -> auth
                // Cho phép preflight OPTIONS request
                .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()
                
                // Endpoints xác thực công khai
                .requestMatchers("/api/auth/login", "/api/auth/refresh").permitAll()
                
                // Swagger Documentation (cho việc kiểm thử và tích hợp API)
                .requestMatchers("/swagger-ui/**", "/api-docs/**", "/v3/api-docs/**").permitAll()
                
                // Toàn bộ các API nghiệp vụ kho, máy móc, bán hàng, cài đặt bắt buộc phải xác thực JWT
                .requestMatchers("/api/**").authenticated()
                
                // Bất kỳ request nào khác
                .anyRequest().permitAll()
            )

            // Xử lý ngoại lệ bảo mật chuẩn JSON tiếng Việt
            .exceptionHandling(exc -> exc
                .authenticationEntryPoint((request, response, authException) -> {
                    response.setContentType("application/json;charset=UTF-8");
                    response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
                    response.getWriter().write("{\"success\":false,\"errorCode\":\"UNAUTHORIZED\",\"message\":\"Chưa đăng nhập hoặc phiên hết hạn\",\"userMessage\":\"Chưa đăng nhập hoặc phiên làm việc đã hết hạn. Vui lòng đăng nhập lại.\"}");
                })
                .accessDeniedHandler((request, response, accessDeniedException) -> {
                    response.setContentType("application/json;charset=UTF-8");
                    response.setStatus(HttpServletResponse.SC_FORBIDDEN);
                    response.getWriter().write("{\"success\":false,\"errorCode\":\"FORBIDDEN\",\"message\":\"Từ chối quyền truy cập\",\"userMessage\":\"Bạn không có quyền truy cập hoặc thực hiện thao tác này.\"}");
                })
            )
            .addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    @Bean
    public AuthenticationManager authenticationManager(AuthenticationConfiguration config) throws Exception {
        return config.getAuthenticationManager();
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        // Độ phức tạp 12 đạt chuẩn an toàn cao cho sản xuất, chống tấn công từ điển và brute-force
        return new BCryptPasswordEncoder(12);
    }
}
