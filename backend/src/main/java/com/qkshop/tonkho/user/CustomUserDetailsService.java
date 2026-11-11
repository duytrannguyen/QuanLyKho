package com.qkshop.tonkho.user;

import lombok.RequiredArgsConstructor;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.*;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Service
@RequiredArgsConstructor
public class CustomUserDetailsService implements UserDetailsService {

    private static final long CACHE_TTL_MS = 60_000L; // Cache thông tin xác thực trong 60 giây

    private final UserRepository userRepository;
    private final Map<String, CachedUserEntry> userCache = new ConcurrentHashMap<>();

    private record CachedUserEntry(
            String username,
            String passwordHash,
            boolean enabled,
            List<SimpleGrantedAuthority> authorities,
            long expiresAt
    ) {
        UserDetails toUserDetails() {
            return new org.springframework.security.core.userdetails.User(
                    username,
                    passwordHash != null ? passwordHash : "",
                    enabled,
                    true, true, true,
                    authorities
            );
        }
    }

    @Override
    public UserDetails loadUserByUsername(String username) throws UsernameNotFoundException {
        String cacheKey = username.trim().toLowerCase();
        long now = System.currentTimeMillis();

        CachedUserEntry cached = userCache.get(cacheKey);
        if (cached != null && cached.expiresAt() > now) {
            return cached.toUserDetails();
        }

        // Ưu tiên tìm theo cột username (có unique index) trước khi fallback sang email
        User user = userRepository.findByUsername(username)
                .or(() -> userRepository.findFirstByEmailOrderByIdDesc(username))
                .orElseThrow(() -> new UsernameNotFoundException("Không tìm thấy người dùng: " + username));

        List<SimpleGrantedAuthority> authorities = new ArrayList<>();
        authorities.add(new SimpleGrantedAuthority("ROLE_" + user.getRole().name()));

        if (user.getRole() == UserRole.ADMIN) {
            for (String perm : AppPermission.allCodes()) {
                authorities.add(new SimpleGrantedAuthority(perm));
            }
        } else if (user.getPermissions() != null) {
            for (String perm : user.getPermissions()) {
                authorities.add(new SimpleGrantedAuthority(perm));
            }
        }

        CachedUserEntry entry = new CachedUserEntry(
                user.getUsername(),
                user.getPasswordHash(),
                Boolean.TRUE.equals(user.getIsActive()),
                Collections.unmodifiableList(authorities),
                now + CACHE_TTL_MS
        );

        userCache.put(cacheKey, entry);
        if (user.getUsername() != null) {
            userCache.put(user.getUsername().toLowerCase(), entry);
        }

        return entry.toUserDetails();
    }

    public void evictCache(String username) {
        if (username != null) {
            userCache.remove(username.trim().toLowerCase());
        }
    }

    public void clearCache() {
        userCache.clear();
    }
}
