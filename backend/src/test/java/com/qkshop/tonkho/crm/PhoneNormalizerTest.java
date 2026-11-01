package com.qkshop.tonkho.crm;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;

class PhoneNormalizerTest {

    @Test
    void chuanHoaCacDinhDangHopLe() {
        assertEquals("0901234567", PhoneNormalizer.normalize("0901 234 567"));
        assertEquals("0901234567", PhoneNormalizer.normalize("+84901234567"));
        assertEquals("0901234567", PhoneNormalizer.normalize("84901234567"));
        assertEquals("0901234567", PhoneNormalizer.normalize("0084901234567"));
        assertEquals("0901234567", PhoneNormalizer.normalize("901234567"));
        assertEquals("0901234567", PhoneNormalizer.normalize("0901.234.567"));
        assertEquals("0901234567", PhoneNormalizer.normalize("090-123-4567"));
    }

    @Test
    void tuChoiGiaTriKhongHopLe() {
        assertNull(PhoneNormalizer.normalize(null));
        assertNull(PhoneNormalizer.normalize(""));
        assertNull(PhoneNormalizer.normalize("   "));
        assertNull(PhoneNormalizer.normalize("abc"));
        assertNull(PhoneNormalizer.normalize("12345"));
        assertNull(PhoneNormalizer.normalize("19001234567890"));
        assertNull(PhoneNormalizer.normalize("1901234567"));
    }
}
