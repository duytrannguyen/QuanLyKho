package com.qkshop.tonkho.sync;

import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.LocalDateTime;

import static org.junit.jupiter.api.Assertions.*;

class SalesSyncRowProcessorHelpersTest {

    @Test
    void parseMoney() {
        assertEquals(new BigDecimal("15990000"), SalesSyncRowProcessor.parseMoney("15.990.000 đ"));
        assertEquals(new BigDecimal("15990000"), SalesSyncRowProcessor.parseMoney("15,990,000"));
        assertEquals(new BigDecimal("15990000"), SalesSyncRowProcessor.parseMoney("15.990.000,00 đ"));
        assertEquals(new BigDecimal("15990000"), SalesSyncRowProcessor.parseMoney("15990000.00"));
        assertNull(SalesSyncRowProcessor.parseMoney(""));
        assertNull(SalesSyncRowProcessor.parseMoney("liên hệ"));
    }

    @Test
    void parseDate() {
        assertEquals(LocalDateTime.of(2026, 10, 5, 0, 0), SalesSyncRowProcessor.parseDate("5/10/2026"));
        assertEquals(LocalDateTime.of(2026, 10, 5, 0, 0), SalesSyncRowProcessor.parseDate("05-10-2026"));
        assertEquals(LocalDateTime.of(2026, 10, 5, 0, 0), SalesSyncRowProcessor.parseDate("05.10.2026"));
        assertEquals(LocalDateTime.of(2026, 10, 5, 14, 30), SalesSyncRowProcessor.parseDate("05/10/2026 14:30"));
        assertEquals(LocalDateTime.of(2026, 10, 5, 14, 30, 10), SalesSyncRowProcessor.parseDate("2026-10-05 14:30:10"));
        // Excel serial date 46163 -> 2026-05-21
        assertEquals(LocalDateTime.of(2026, 5, 21, 0, 0), SalesSyncRowProcessor.parseDate("46163"));
        assertNull(SalesSyncRowProcessor.parseDate("abc"));
    }
}
