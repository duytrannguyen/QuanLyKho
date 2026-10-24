package com.qkshop.tonkho;

import org.junit.jupiter.api.Test;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.TestPropertySource;

@SpringBootTest
@TestPropertySource(properties = {
        "spring.task.scheduling.enabled=false",
        "gsheet.enabled=false",
        "gsheet.cron-enabled=false",
        "gsheet.scheduler.enabled=false"
})
class TonKhoApplicationTests {

    @Test
    void printHash() {
        System.out.println("HASH_START:" + new BCryptPasswordEncoder().encode("admin123") + ":HASH_END");
    }

}
