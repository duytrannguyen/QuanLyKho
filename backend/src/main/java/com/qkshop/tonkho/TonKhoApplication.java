package com.qkshop.tonkho;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class TonKhoApplication {

    public static void main(String[] args) {
        SpringApplication.run(TonKhoApplication.class, args);
    }
}
