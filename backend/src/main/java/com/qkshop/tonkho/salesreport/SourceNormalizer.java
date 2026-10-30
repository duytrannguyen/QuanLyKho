package com.qkshop.tonkho.salesreport;

import java.text.Normalizer;
import java.time.LocalDate;
import java.util.Locale;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Tiện ích chuẩn hoá nguồn tiếp cận, nhận dạng series máy và tính toán bảo hành
 * tái hiện 1:1 theo các công thức quy chuẩn trong Google Sheets / Excel của QKShop.
 */
public final class SourceNormalizer {

    private SourceNormalizer() {}

    private static final Pattern PATTERN_TIKTOK = Pattern.compile("tiktok", Pattern.CASE_INSENSITIVE);
    private static final Pattern PATTERN_FACEBOOK = Pattern.compile("facebook|\\bfb\\b", Pattern.CASE_INSENSITIVE);
    private static final Pattern PATTERN_ZALO = Pattern.compile("zalo", Pattern.CASE_INSENSITIVE);
    private static final Pattern PATTERN_GOOGLE = Pattern.compile("google|maps", Pattern.CASE_INSENSITIVE);
    private static final Pattern PATTERN_REFERRAL = Pattern.compile("giới thiệu|gioi thieu|người quen|nguoi quen|nhân viên|nhan vien|referral", Pattern.CASE_INSENSITIVE);
    private static final Pattern PATTERN_UNKNOWN = Pattern.compile("chưa|chua|không rõ|khong ro|không xác định|khong xac dinh|^unknown$", Pattern.CASE_INSENSITIVE);

    /**
     * Chuẩn hoá nguồn chốt đơn:
     * - Ưu tiên nguồn chốt cuối cùng (lastSource), nếu không rõ hoặc trống thì lấy nguồn đầu tiên (firstSource).
     * - Áp dụng các quy tắc map nguồn chuẩn: TikTok, Facebook, Zalo, Google, Người quen giới thiệu, Chưa rõ, Khác.
     */
    public static String normalizeSource(String firstSource, String lastSource) {
        String raw = (lastSource != null && !lastSource.isBlank()) ? lastSource.trim() : "";
        if (raw.isEmpty() || PATTERN_UNKNOWN.matcher(raw).find()) {
            if (firstSource != null && !firstSource.isBlank() && !PATTERN_UNKNOWN.matcher(firstSource).find()) {
                raw = firstSource.trim();
            }
        }

        if (raw.isEmpty() || PATTERN_UNKNOWN.matcher(raw).find()) {
            return "Chưa rõ";
        }

        String lower = raw.toLowerCase(Locale.ROOT);
        if (PATTERN_TIKTOK.matcher(lower).find()) return "TikTok";
        if (PATTERN_FACEBOOK.matcher(lower).find()) return "Facebook";
        if (PATTERN_ZALO.matcher(lower).find()) return "Zalo";
        if (PATTERN_GOOGLE.matcher(lower).find()) return "Google";
        if (PATTERN_REFERRAL.matcher(lower).find()) return "Người quen giới thiệu";

        return "Khác";
    }

    /**
     * Phân loại đơn có inbox tư vấn trước hay đơn mua thẳng:
     * Đơn có nguồn chốt chứa Facebook, TikTok, Zalo được coi là "Đơn có inbox".
     * Các kênh khác (Google, Giới thiệu, Khách vãng lai...) là "Đơn mua thẳng".
     */
    public static String determineInboxType(String normalizedSource) {
        if (normalizedSource == null) return "Đơn mua thẳng";
        String s = normalizedSource.toLowerCase(Locale.ROOT);
        if (s.contains("facebook") || s.contains("tiktok") || s.contains("zalo")) {
            return "Đơn có inbox";
        }
        return "Đơn mua thẳng";
    }

    /**
     * Tự động nhận diện Series sản phẩm từ tên sản phẩm và dòng máy
     * khớp hoàn toàn với công thức mảng IFS(REGEXMATCH(...)) tại cột Q của DATABASE_BÁN HÀNG.
     */
    public static String extractSeries(String productName, String modelName) {
        String text = ((productName != null ? productName : "") + " " + (modelName != null ? modelName : "")).toLowerCase(Locale.ROOT);
        if (text.isBlank()) return "";

        if (text.contains("latitude")) return "Latitude";
        if (text.contains("inspiron")) return "Inspiron";
        if (text.contains("vostro")) return "Vostro";
        if (text.contains("xps")) return "XPS";
        if (text.contains("precision")) return "Precision";
        if (text.contains("thinkpad") || text.contains("think pad")) return "ThinkPad";
        if (text.contains("thinkbook") || text.contains("think book")) return "ThinkBook";
        if (text.contains("ideapad") || text.contains("idea pad")) return "IdeaPad";
        if (text.contains("legion")) return "Legion";
        if (text.contains("yoga")) return "Yoga";
        if (text.contains("loq")) return "LOQ";
        if (text.contains("elitebook") || text.contains("elite book")) return "EliteBook";
        if (text.contains("probook") || text.contains("pro book")) return "ProBook";
        if (text.contains("zbook") || text.contains("z book")) return "ZBook";
        if (text.contains("pavilion")) return "Pavilion";
        if (text.contains("victus")) return "Victus";
        if (text.contains("omen")) return "Omen";
        if (text.contains("zenbook") || text.contains("zen book")) return "ZenBook";
        if (text.contains("vivobook") || text.contains("vivo book")) return "VivoBook";
        if (text.contains("expertbook") || text.contains("expert book")) return "ExpertBook";
        if (text.contains("tuf")) return "TUF";
        if (text.contains("rog")) return "ROG";
        if (text.contains("aspire")) return "Aspire";
        if (text.contains("swift")) return "Swift";
        if (text.contains("nitro")) return "Nitro";
        if (text.contains("predator")) return "Predator";
        if (text.contains("macbook air")) return "MacBook Air";
        if (text.contains("macbook pro")) return "MacBook Pro";
        if (text.contains("macbook")) return "MacBook";
        if (text.contains("surface")) return "Surface";
        if (text.contains("bravo")) return "Bravo";
        if (text.contains("katana")) return "Katana";
        if (text.contains("thin")) return "Thin";

        return "Khác";
    }

    public static LocalDate extractSpecificDate(String text) {
        if (text == null || text.isBlank()) return null;
        Matcher dateMatcher = Pattern.compile("(\\d{1,2})[/-](\\d{1,2})[/-](\\d{4})").matcher(text);
        if (dateMatcher.find()) {
            try {
                int d = Integer.parseInt(dateMatcher.group(1));
                int m = Integer.parseInt(dateMatcher.group(2));
                int y = Integer.parseInt(dateMatcher.group(3));
                return LocalDate.of(y, m, d);
            } catch (Exception ignored) {}
        }
        return null;
    }

    /**
     * Tính ngày hết hạn bảo hành từ ngày bán và chuỗi mức bảo hành
     * tương ứng công thức =EDATE(ngày bán, số tháng) tại cột V.
     */
    public static LocalDate calculateWarrantyExpiry(LocalDate saleDate, String warrantyPeriod) {
        if (saleDate == null || warrantyPeriod == null || warrantyPeriod.isBlank()) {
            return null;
        }
        String p = warrantyPeriod.trim().toLowerCase(Locale.ROOT);
        if (p.contains("không bh") || p.contains("không bảo hành") || p.equals("0") || p.equals("0t")) {
            return null;
        }

        // Tìm định dạng dd/MM/yyyy hoặc dd-MM-yyyy
        Matcher dateMatcher = Pattern.compile("(\\d{1,2})[/-](\\d{1,2})[/-](\\d{4})").matcher(warrantyPeriod);
        if (dateMatcher.find()) {
            try {
                int d = Integer.parseInt(dateMatcher.group(1));
                int m = Integer.parseInt(dateMatcher.group(2));
                int y = Integer.parseInt(dateMatcher.group(3));
                return LocalDate.of(y, m, d);
            } catch (Exception ignored) {}
        }

        // Tìm số tháng (ví dụ: "3 tháng", "6T", "12 tháng")
        Matcher numMatcher = Pattern.compile("(\\d+)").matcher(p);
        if (numMatcher.find()) {
            try {
                int val = Integer.parseInt(numMatcher.group(1));
                if (val <= 0) return null;
                if (p.contains("ngày") || p.contains("day")) {
                    return saleDate.plusDays(val);
                } else if (p.contains("năm") || p.contains("year")) {
                    return saleDate.plusYears(val);
                } else {
                    return saleDate.plusMonths(val);
                }
            } catch (Exception ignored) {}
        }
        return null;
    }
}
