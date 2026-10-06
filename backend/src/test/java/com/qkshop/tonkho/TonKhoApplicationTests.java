package com.qkshop.tonkho;

import org.junit.jupiter.api.Test;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

import org.springframework.boot.test.context.SpringBootTest;

@SpringBootTest
class TonKhoApplicationTests {

    @Test
    void printHash() {
        System.out.println("HASH_START:" + new BCryptPasswordEncoder().encode("admin123") + ":HASH_END");
    }

}
