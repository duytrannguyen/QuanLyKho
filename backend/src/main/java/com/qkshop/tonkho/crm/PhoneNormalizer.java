package com.qkshop.tonkho.crm;

/**
 * Chuẩn hóa số điện thoại Việt Nam về dạng 10 số bắt đầu bằng 0.
 * Trả về null nếu không hợp lệ để tránh gộp nhầm khách.
 */
public final class PhoneNormalizer {

    private PhoneNormalizer() {
    }

    public static String normalize(String raw) {
        if (raw == null) return null;
        String digits = raw.replaceAll("\\D", "");
        if (digits.isEmpty()) return null;

        if (digits.startsWith("0084")) {
            digits = "0" + digits.substring(4);
        } else if (digits.startsWith("84") && digits.length() == 11) {
            digits = "0" + digits.substring(2);
        } else if (digits.length() == 9) {
            // Excel/Sheet thường làm mất số 0 đầu
            digits = "0" + digits;
        }

        if (digits.length() == 10 && digits.charAt(0) == '0') {
            return digits;
        }
        return null;
    }
}
